import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from backend.app.core.database import get_db
from backend.app.core.security import get_password_hash
from backend.app.core.deps import get_current_user, require_admin
from backend.app.models.user import User, Role
from backend.app.schemas.user import UserResponse, UserCreateRequest, UserUpdateRequest
from backend.app.services.audit_service import record_audit_log

router = APIRouter()

@router.get("", response_model=List[UserResponse])
async def list_users(
    role: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(User)
        .options(selectinload(User.role))
        .where(User.organization_id == current_user.organization_id)
        .order_by(User.created_at.desc())
    )
    if role:
        query = query.join(User.role).where(Role.name == role.upper())

    result = await db.execute(query)
    return result.scalars().all()

@router.post("", response_model=UserResponse)
async def create_user(
    payload: UserCreateRequest,
    request: Request,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    # Check duplicate email within organization
    dup_stmt = select(User).where(
        User.organization_id == current_user.organization_id,
        User.email == payload.email.lower().strip()
    )
    if (await db.execute(dup_stmt)).scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists in your organization"
        )

    # Find Role
    role_stmt = select(Role).where(Role.name == payload.role_name.upper())
    role_obj = (await db.execute(role_stmt)).scalars().first()
    if not role_obj:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role '{payload.role_name}'. Must be one of ADMIN, FINANCE_MANAGER, FINANCE_EMPLOYEE, AUDITOR"
        )

    new_user = User(
        organization_id=current_user.organization_id,
        role_id=role_obj.id,
        email=payload.email.lower().strip(),
        hashed_password=get_password_hash(payload.password),
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        department=payload.department.strip() if payload.department else None,
        is_active=True
    )
    db.add(new_user)
    await db.flush()

    await record_audit_log(
        db=db,
        organization_id=current_user.organization_id,
        action="CREATE_USER",
        resource_type="USER",
        user=current_user,
        resource_id=new_user.id,
        new_values={
            "email": new_user.email,
            "role": role_obj.name,
            "department": new_user.department
        },
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    await db.commit()

    # Reload with role relationship
    stmt = select(User).options(selectinload(User.role)).where(User.id == new_user.id)
    return (await db.execute(stmt)).scalars().first()

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    payload: UserUpdateRequest,
    request: Request,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    # Strict IDOR protection: verified against current_user.organization_id
    stmt = (
        select(User)
        .options(selectinload(User.role))
        .where(User.id == user_id, User.organization_id == current_user.organization_id)
    )
    user = (await db.execute(stmt)).scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found in organization")

    prev = {
        "first_name": user.first_name,
        "last_name": user.last_name,
        "department": user.department,
        "role": user.role.name if user.role else None,
        "is_active": user.is_active
    }

    if payload.first_name is not None:
        user.first_name = payload.first_name.strip()
    if payload.last_name is not None:
        user.last_name = payload.last_name.strip()
    if payload.department is not None:
        user.department = payload.department.strip()
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.password:
        user.hashed_password = get_password_hash(payload.password)
    if payload.role_name:
        role_stmt = select(Role).where(Role.name == payload.role_name.upper())
        new_role = (await db.execute(role_stmt)).scalars().first()
        if not new_role:
            raise HTTPException(status_code=400, detail="Invalid role specified")
        user.role_id = new_role.id

    await record_audit_log(
        db=db,
        organization_id=current_user.organization_id,
        action="UPDATE_USER",
        resource_type="USER",
        user=current_user,
        resource_id=user.id,
        previous_values=prev,
        new_values={
            "first_name": user.first_name,
            "last_name": user.last_name,
            "department": user.department,
            "is_active": user.is_active
        },
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    await db.commit()
    await db.refresh(user)
    return user

@router.delete("/{user_id}")
async def deactivate_user(
    user_id: str,
    request: Request,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own administrative account")

    stmt = select(User).where(User.id == user_id, User.organization_id == current_user.organization_id)
    user = (await db.execute(stmt)).scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = False
    await record_audit_log(
        db=db,
        organization_id=current_user.organization_id,
        action="DEACTIVATE_USER",
        resource_type="USER",
        user=current_user,
        resource_id=user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    await db.commit()
    return {"success": True, "message": "User account deactivated"}

@router.delete("/me/anonymize-data")
async def anonymize_personal_data(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    GDPR Right-to-be-Forgotten & Privacy Anonymization Flow:
    Redacts personal identifying attributes (names, email) from active user records while preserving financial transaction integrity.
    """
    anon_id = uuid.uuid4().hex[:8]
    current_user.first_name = "Redacted"
    current_user.last_name = f"User-{anon_id}"
    current_user.email = f"anonymized-{anon_id}@finguard-redacted.internal"
    current_user.department = "Redacted"
    current_user.is_active = False

    await record_audit_log(
        db=db,
        organization_id=current_user.organization_id,
        action="ANONYMIZE_USER_PII",
        resource_type="USER",
        user=current_user,
        resource_id=current_user.id,
        new_values={"status": "ANONYMIZED_AND_DEACTIVATED"},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    await db.commit()
    return {"success": True, "message": "Personal identifiable information has been redacted and the account deactivated."}
