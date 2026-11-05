from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from backend.app.core.database import get_db
from backend.app.core.deps import get_current_user, require_finance_manager
from backend.app.models.user import User
from backend.app.models.invoice import Invoice
from backend.app.models.fraud import FraudAlert
from backend.app.schemas.fraud import FraudAlertResponse, AlertUpdateStatusRequest
from backend.app.services.audit_service import record_audit_log

router = APIRouter()

@router.get("/alerts", response_model=List[FraudAlertResponse])
async def list_fraud_alerts(
    severity: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(FraudAlert)
        .options(
            selectinload(FraudAlert.invoice).selectinload(Invoice.vendor),
            selectinload(FraudAlert.assigned_to_user)
        )
        .where(FraudAlert.organization_id == current_user.organization_id)
        .order_by(FraudAlert.created_at.desc())
    )
    if severity:
        query = query.where(FraudAlert.severity == severity.upper())
    if status:
        query = query.where(FraudAlert.investigation_status == status.upper())

    alerts = (await db.execute(query)).scalars().all()
    res = []
    for a in alerts:
        item = FraudAlertResponse.model_validate(a)
        if a.invoice:
            item.invoice_number = a.invoice.invoice_number
            item.total_amount = a.invoice.total_amount
            item.vendor_name = a.invoice.vendor.name if a.invoice.vendor else "Unknown Vendor"
        if a.assigned_to_user:
            item.assigned_user_name = a.assigned_to_user.full_name
        res.append(item)
    return res

@router.get("/alerts/{alert_id}", response_model=FraudAlertResponse)
async def get_fraud_alert_detail(
    alert_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(FraudAlert)
        .options(
            selectinload(FraudAlert.invoice).selectinload(Invoice.vendor),
            selectinload(FraudAlert.assigned_to_user)
        )
        .where(FraudAlert.id == alert_id, FraudAlert.organization_id == current_user.organization_id)
    )
    alert = (await db.execute(stmt)).scalars().first()
    if not alert:
        raise HTTPException(status_code=404, detail="Fraud alert not found")

    item = FraudAlertResponse.model_validate(alert)
    if alert.invoice:
        item.invoice_number = alert.invoice.invoice_number
        item.total_amount = alert.invoice.total_amount
        item.vendor_name = alert.invoice.vendor.name if alert.invoice.vendor else None
    if alert.assigned_to_user:
        item.assigned_user_name = alert.assigned_to_user.full_name
    return item

@router.put("/investigations/{alert_id}", response_model=FraudAlertResponse)
async def update_investigation_case(
    alert_id: str,
    payload: AlertUpdateStatusRequest,
    request: Request,
    current_user: User = Depends(require_finance_manager),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(FraudAlert)
        .options(selectinload(FraudAlert.invoice))
        .where(FraudAlert.id == alert_id, FraudAlert.organization_id == current_user.organization_id)
    )
    alert = (await db.execute(stmt)).scalars().first()
    if not alert:
        raise HTTPException(status_code=404, detail="Investigation case not found")

    prev_status = alert.investigation_status
    alert.investigation_status = payload.investigation_status.upper()
    
    if payload.assigned_to_user_id:
        alert.assigned_to_user_id = payload.assigned_to_user_id
    if payload.resolution_notes:
        alert.resolution_notes = payload.resolution_notes

    if payload.investigation_status.upper() in ["CONFIRMED_FRAUD", "LEGITIMATE", "RESOLVED"]:
        alert.resolved_at = datetime.now(timezone.utc)
        if alert.invoice:
            if payload.investigation_status.upper() == "CONFIRMED_FRAUD":
                alert.invoice.status = "REJECTED"
            elif payload.investigation_status.upper() == "LEGITIMATE":
                alert.invoice.status = "PENDING_VERIFICATION"

    await record_audit_log(
        db=db,
        organization_id=current_user.organization_id,
        action="UPDATE_FRAUD_INVESTIGATION",
        resource_type="FRAUD_ALERT",
        user=current_user,
        resource_id=alert.id,
        previous_values={"status": prev_status},
        new_values={"status": alert.investigation_status, "resolution": alert.resolution_notes},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    await db.commit()
    await db.refresh(alert)

    # Return refreshed record
    return await get_fraud_alert_detail(alert.id, current_user, db)
