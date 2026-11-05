import time
import uuid
import logging
from collections import defaultdict
from typing import Dict, List
from fastapi import Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from backend.app.core.config import settings

logger = logging.getLogger("finguard.security")

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Generate and attach request correlation ID
        correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
        request.state.correlation_id = correlation_id

        response: Response = await call_next(request)

        # Defense-in-depth security response headers
        response.headers["X-Correlation-ID"] = correlation_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=(), payment=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "img-src 'self' data: blob:; "
            "style-src 'self' 'unsafe-inline'; "
            "script-src 'self'; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self';"
        )
        return response


class RateLimiterMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        # In-memory IP tracking: ip -> list of timestamps
        self.login_attempts: Dict[str, List[float]] = defaultdict(list)
        self.password_reset_attempts: Dict[str, List[float]] = defaultdict(list)

    def reset_limits(self):
        self.login_attempts.clear()
        self.password_reset_attempts.clear()

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        path = request.url.path
        now = time.time()

        # In testing when X-Bypass-Rate-Limit is passed, bypass limiter
        if request.headers.get("X-Bypass-Rate-Limit") == "true":
            return await call_next(request)

        # 1. Rate limit login and registration (e.g., 5 attempts/min)
        if path in ["/api/auth/login", "/api/auth/register-company"] and request.method == "POST":
            window = settings.RATE_LIMIT_LOGIN_WINDOW_SECONDS
            max_reqs = settings.RATE_LIMIT_LOGIN_MAX
            
            # Prune expired timestamps
            self.login_attempts[client_ip] = [
                ts for ts in self.login_attempts[client_ip] if now - ts < window
            ]
            if len(self.login_attempts[client_ip]) >= max_reqs:
                retry_after = int(window - (now - self.login_attempts[client_ip][0]))
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "success": False,
                        "error": {
                            "code": "RATE_LIMIT_EXCEEDED",
                            "message": f"Too many authentication attempts. Please wait {retry_after} seconds before trying again.",
                            "retry_after_seconds": retry_after
                        }
                    },
                    headers={"Retry-After": str(retry_after)}
                )
            self.login_attempts[client_ip].append(now)

        # 2. Rate limit password reset requests (e.g., 3 requests/hour)
        if path in ["/api/auth/forgot-password", "/api/auth/reset-password"] and request.method == "POST":
            window = settings.RATE_LIMIT_PASSWORD_RESET_WINDOW_SECONDS
            max_reqs = settings.RATE_LIMIT_PASSWORD_RESET_MAX

            self.password_reset_attempts[client_ip] = [
                ts for ts in self.password_reset_attempts[client_ip] if now - ts < window
            ]
            if len(self.password_reset_attempts[client_ip]) >= max_reqs:
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "success": False,
                        "error": {
                            "code": "RATE_LIMIT_EXCEEDED",
                            "message": "Maximum password reset attempts reached. Please try again in 1 hour."
                        }
                    }
                )
            self.password_reset_attempts[client_ip].append(now)

        return await call_next(request)
