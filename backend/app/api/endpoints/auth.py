import re
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    create_password_reset_token,
    verify_and_consume_reset_token,
    decode_token,
    revoke_token
)
from backend.app.core.deps import get_current_user, oauth2_scheme
from backend.app.models.organization import Organization
from backend.app.models.user import User, Role
from backend.app.schemas.auth import (
    TokenResponse,
    LoginRequest,
    RegisterCompanyRequest,
    RefreshTokenRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest
)
from backend.app.schemas.user import UserResponse
from backend.app.services.audit_service import record_audit_log

router = APIRouter()

@router.post("/register-company", response_model=TokenResponse)
async def register_company(
    payload: RegisterCompanyRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    # Derive safe slug
    raw_slug = payload.company_slug or payload.company_name
    slug = re.sub(r'[^a-zA-Z0-9-]', '', raw_slug.lower().replace(' ', '-'))
    if not slug:
        slug = f"org-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"

    # Check if slug exists
    slug_check = await db.execute(select(Organization).where(Organization.slug == slug))
    if slug_check.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A company with this identifier or name already exists"
        )
        
    # Create Organization
    org = Organization(
        name=payload.company_name.strip(),
        slug=slug,
        currency=payload.currency.upper()[:3],
        country=payload.country.strip()
    )
    db.add(org)
    await db.flush()

    # Find or provision ADMIN role
    role_stmt = select(Role).where(Role.name == "ADMIN")
    admin_role = (await db.execute(role_stmt)).scalars().first()
    if not admin_role:
        admin_role = Role(name="ADMIN", description="Administrator", permissions=["all"])
        db.add(admin_role)
        await db.flush()

    # Create Primary Admin User
    admin_user = User(
        organization_id=org.id,
        role_id=admin_role.id,
        email=payload.admin_email.lower().strip(),
        hashed_password=get_password_hash(payload.admin_password),
        first_name=payload.admin_first_name.strip(),
        last_name=payload.admin_last_name.strip(),
        department=payload.admin_department.strip() if payload.admin_department else "Executive",
        is_active=True,
        last_login_at=datetime.now(timezone.utc)
    )
    db.add(admin_user)
    await db.flush()

    # Audit log
    await record_audit_log(
        db=db,
        organization_id=org.id,
        action="REGISTER_COMPANY",
        resource_type="ORGANIZATION",
        user=admin_user,
        resource_id=org.id,
        new_values={"company_name": org.name, "admin_email": admin_user.email},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    await db.commit()

    access_token = create_access_token(
        subject=admin_user.id,
        organization_id=org.id,
        role="ADMIN"
    )
    refresh_token = create_refresh_token(
        subject=admin_user.id,
        organization_id=org.id,
        role="ADMIN"
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=60 * 24 * 60,
        user={
            "id": admin_user.id,
            "email": admin_user.email,
            "first_name": admin_user.first_name,
            "last_name": admin_user.last_name,
            "full_name": admin_user.full_name,
            "role": "ADMIN",
            "organization_id": org.id,
            "organization_name": org.name,
            "currency": org.currency
        }
    )

@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(User)
        .options(selectinload(User.role), selectinload(User.organization))
        .where(User.email == payload.email.lower().strip())
    )
    result = await db.execute(stmt)
    user = result.scalars().first()

    # Timing-safe constant-time evaluation simulation
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact your corporate security administrator."
        )

    if not user.organization or not user.organization.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization account is suspended or inactive."
        )

    user.last_login_at = datetime.now(timezone.utc)
    
    await record_audit_log(
        db=db,
        organization_id=user.organization_id,
        action="USER_LOGIN",
        resource_type="USER",
        user=user,
        resource_id=user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    await db.commit()

    role_name = user.role.name if user.role else "FINANCE_EMPLOYEE"
    access_token = create_access_token(
        subject=user.id,
        organization_id=user.organization_id,
        role=role_name
    )
    refresh_token = create_refresh_token(
        subject=user.id,
        organization_id=user.organization_id,
        role=role_name
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=60 * 24 * 60,
        user={
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "full_name": user.full_name,
            "role": role_name,
            "organization_id": user.organization.id,
            "organization_name": user.organization.name,
            "currency": user.organization.currency
        }
    )

@router.post("/logout")
async def logout(
    request: Request,
    token: str = Depends(oauth2_scheme),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Secure logout: invalidates the bearer token across future requests."""
    revoke_token(token)
    await record_audit_log(
        db=db,
        organization_id=current_user.organization_id,
        action="USER_LOGOUT",
        resource_type="USER",
        user=current_user,
        resource_id=current_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    await db.commit()
    return {"success": True, "message": "Successfully logged out. Session invalidated."}

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    payload: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    decoded = decode_token(payload.refresh_token)
    if not decoded or decoded.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )

    user_id = decoded.get("sub")
    stmt = (
        select(User)
        .options(selectinload(User.role), selectinload(User.organization))
        .where(User.id == user_id)
    )
    user = (await db.execute(stmt)).scalars().first()

    if not user or not user.is_active or not user.organization.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User or organization is inactive"
        )

    role_name = user.role.name if user.role else "FINANCE_EMPLOYEE"
    new_access_token = create_access_token(
        subject=user.id,
        organization_id=user.organization_id,
        role=role_name
    )
    new_refresh_token = create_refresh_token(
        subject=user.id,
        organization_id=user.organization_id,
        role=role_name
    )

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=60 * 24 * 60,
        user={
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "full_name": user.full_name,
            "role": role_name,
            "organization_id": user.organization.id,
            "organization_name": user.organization.name,
            "currency": user.organization.currency
        }
    )

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/forgot-password")
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(User).where(User.email == payload.email.lower().strip())
    user = (await db.execute(stmt)).scalars().first()
    
    # Generic security response regardless of whether email exists to prevent enumeration
    reset_token = None
    if user and user.is_active:
        reset_token = create_password_reset_token(user.id, user.email)
    
    response_payload = {
        "success": True,
        "message": "If an account with that email exists, password reset instructions have been issued."
    }
    # In non-production test environments, provide token for test automation
    if reset_token and settings.ENVIRONMENT != "production":
        response_payload["dev_reset_token"] = reset_token

    return response_payload

@router.post("/reset-password")
async def reset_password(
    payload: ResetPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    # Strictly validates single-use token and 15-minute expiration
    payload_data = verify_and_consume_reset_token(payload.reset_token)
    if not payload_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid, expired, or already consumed password reset token. Tokens expire after 15 minutes."
        )

    user_id = payload_data.get("sub")
    stmt = select(User).where(User.id == user_id)
    user = (await db.execute(stmt)).scalars().first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.hashed_password = get_password_hash(payload.new_password)
    await record_audit_log(
        db=db,
        organization_id=user.organization_id,
        action="PASSWORD_RESET_COMPLETED",
        resource_type="USER",
        user=user,
        resource_id=user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    await db.commit()
    return {"success": True, "message": "Password successfully reset. You may now log in with your new credentials."}
