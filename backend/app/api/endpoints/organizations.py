from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from backend.app.core.database import get_db
from backend.app.core.deps import get_current_user, require_admin
from backend.app.models.organization import Organization
from backend.app.models.user import User
from backend.app.schemas.organization import OrganizationResponse, OrganizationUpdateRequest
from backend.app.services.audit_service import record_audit_log

router = APIRouter()

@router.get("/current", response_model=OrganizationResponse)
async def get_current_organization(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Organization).where(Organization.id == current_user.organization_id)
    org = (await db.execute(stmt)).scalars().first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org

@router.put("/current", response_model=OrganizationResponse)
async def update_current_organization(
    payload: OrganizationUpdateRequest,
    request: Request,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Organization).where(Organization.id == current_user.organization_id)
    org = (await db.execute(stmt)).scalars().first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    prev = {
        "name": org.name,
        "currency": org.currency,
        "country": org.country,
        "risk_tolerance_threshold": float(org.risk_tolerance_threshold) if org.risk_tolerance_threshold else None
    }

    if payload.name is not None:
        org.name = payload.name
    if payload.currency is not None:
        org.currency = payload.currency.upper()
    if payload.country is not None:
        org.country = payload.country
    if payload.risk_tolerance_threshold is not None:
        org.risk_tolerance_threshold = payload.risk_tolerance_threshold

    new_vals = {
        "name": org.name,
        "currency": org.currency,
        "country": org.country,
        "risk_tolerance_threshold": float(org.risk_tolerance_threshold) if org.risk_tolerance_threshold else None
    }

    await record_audit_log(
        db=db,
        organization_id=org.id,
        action="UPDATE_ORGANIZATION_SETTINGS",
        resource_type="ORGANIZATION",
        user=current_user,
        resource_id=org.id,
        previous_values=prev,
        new_values=new_vals,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    await db.commit()
    await db.refresh(org)
    return org
