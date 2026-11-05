import uuid
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Any, Union, Optional, Set
from jose import jwt, JWTError
from backend.app.core.config import settings

# In-memory revocation cache for active sessions and single-use tokens
_REVOKED_TOKEN_JTIS: Set[str] = set()
_CONSUMED_RESET_TOKENS: Set[str] = set()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        # Standard 72-byte truncation prevents bcrypt denial-of-service / buffer overflow
        pwd_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")

def create_access_token(
    subject: Union[str, Any],
    organization_id: str,
    role: str,
    expires_delta: Optional[timedelta] = None
) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    jti = str(uuid.uuid4())
    to_encode = {
        "jti": jti,
        "exp": expire,
        "sub": str(subject),
        "org_id": str(organization_id),
        "role": str(role),
        "type": "access"
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def create_refresh_token(
    subject: Union[str, Any],
    organization_id: str,
    role: str
) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    jti = str(uuid.uuid4())
    to_encode = {
        "jti": jti,
        "exp": expire,
        "sub": str(subject),
        "org_id": str(organization_id),
        "role": str(role),
        "type": "refresh"
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def create_password_reset_token(user_id: str, email: str) -> str:
    """Creates a strictly time-limited (15-minute max) single-use password reset token."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES)
    jti = str(uuid.uuid4())
    to_encode = {
        "jti": jti,
        "exp": expire,
        "sub": str(user_id),
        "email": str(email).lower(),
        "type": "password_reset"
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_token(token: str) -> Optional[dict]:
    try:
        decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        jti = decoded.get("jti")
        # Check if revoked
        if jti and jti in _REVOKED_TOKEN_JTIS:
            return None
        return decoded
    except JWTError:
        return None

def revoke_token(token: str) -> bool:
    """Revokes token upon logout so it can no longer be used."""
    try:
        decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM], options={"verify_exp": False})
        jti = decoded.get("jti")
        if jti:
            _REVOKED_TOKEN_JTIS.add(jti)
            return True
    except Exception:
        pass
    return False

def verify_and_consume_reset_token(token: str) -> Optional[dict]:
    """Validates single-use password reset token and consumes it to prevent replay."""
    payload = decode_token(token)
    if not payload:
        return None
    if payload.get("type") != "password_reset":
        return None
    
    jti = payload.get("jti")
    if not jti or jti in _CONSUMED_RESET_TOKENS:
        return None  # Token already consumed or invalid
        
    _CONSUMED_RESET_TOKENS.add(jti)
    return payload
