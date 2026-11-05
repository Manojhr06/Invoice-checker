import uuid
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.core.config import settings
from backend.app.core.database import engine, Base, AsyncSessionLocal
from backend.app.api.api_router import api_router
from backend.app.services.seed_service import seed_initial_data
from backend.app.middleware.security import SecurityHeadersMiddleware, RateLimiterMiddleware
import backend.app.models  # ensure models are registered with Base

# Configure structured server-side logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s"
)
logger = logging.getLogger("finguard.core")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Run seed data check
    async with AsyncSessionLocal() as session:
        await seed_initial_data(session)
        
    yield

# In production, Swagger and OpenAPI specifications can be restricted
docs_url = None if settings.ENVIRONMENT.lower() == "production" and not settings.DEBUG else "/api/docs"
redoc_url = None if settings.ENVIRONMENT.lower() == "production" and not settings.DEBUG else "/api/redoc"
openapi_url = None if settings.ENVIRONMENT.lower() == "production" and not settings.DEBUG else "/api/openapi.json"

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Enterprise-Grade AI-Powered Financial Fraud Detection & Risk Prevention Platform",
    lifespan=lifespan,
    docs_url=docs_url,
    redoc_url=redoc_url,
    openapi_url=openapi_url
)

# 1. Attach Security Headers Middleware
app.add_middleware(SecurityHeadersMiddleware)

# 2. Attach In-Memory Rate Limiter Middleware
app.add_middleware(RateLimiterMiddleware)

# 3. Attach Restrictive CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Correlation-ID"],
)

# Centralized Safe Exception Handler — Zero Information Leakage
@app.exception_handler(Exception)
async def safe_exception_handler(request: Request, exc: Exception):
    correlation_id = getattr(request.state, "correlation_id", str(uuid.uuid4()))
    # Log detailed exception with correlation ID internally on server
    logger.error(f"[CorrelationID: {correlation_id}] Unhandled error at {request.method} {request.url.path}: {str(exc)}", exc_info=True)
    
    # Return generic message with correlation ID; never leak stack traces, database schema, or internal paths
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        headers={"X-Correlation-ID": correlation_id},
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An internal server error occurred. Please contact support with the correlation ID.",
                "correlation_id": correlation_id
            }
        }
    )

# Mount API Router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Minimal Health Check Endpoint
@app.get("/api/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION
    }
