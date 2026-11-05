from typing import Generator, Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from backend.app.core.database import get_db
from backend.app.core.security import decode_token
from backend.app.models.user import User, Role
from backend.app.models.organization import Organization

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or session expired",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_token(token)
    if not payload:
        raise credentials_exception
    
    user_id: Optional[str] = payload.get("sub")
    org_id: Optional[str] = payload.get("org_id")
    token_type: Optional[str] = payload.get("type")
    
    if not user_id or not org_id or token_type != "access":
        raise credentials_exception
    
    stmt = (
        select(User)
        .options(selectinload(User.role), selectinload(User.organization))
        .where(User.id == user_id, User.organization_id == org_id)
    )
    result = await db.execute(stmt)
    user = result.scalars().first()
    
    if not user:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )
        
    if not user.organization or not user.organization.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant organization account is inactive or suspended"
        )
        
    return user

def require_roles(allowed_roles: List[str]):
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = current_user.role.name if current_user.role else ""
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of roles {allowed_roles}, your role is '{user_role}'"
            )
        return current_user
    return role_checker

# Pre-configured role guards
require_admin = require_roles(["ADMIN"])
require_finance_manager = require_roles(["ADMIN", "FINANCE_MANAGER"])
require_finance_employee = require_roles(["ADMIN", "FINANCE_MANAGER", "FINANCE_EMPLOYEE"])
require_auditor = require_roles(["ADMIN", "FINANCE_MANAGER", "AUDITOR"])
require_any_authenticated = require_roles(["ADMIN", "FINANCE_MANAGER", "FINANCE_EMPLOYEE", "AUDITOR"])
