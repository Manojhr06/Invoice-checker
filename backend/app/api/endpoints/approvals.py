from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from backend.app.core.database import get_db
from backend.app.core.deps import get_current_user, require_finance_manager
from backend.app.models.user import User
from backend.app.models.invoice import Invoice
from backend.app.models.workflow import ApprovalWorkflow, ApprovalHistory
from backend.app.schemas.workflow import ApprovalWorkflowResponse, ApprovalActionRequest
from backend.app.schemas.invoice import InvoiceResponse
from backend.app.services.audit_service import record_audit_log

router = APIRouter()

@router.get("/pending", response_model=List[InvoiceResponse])
async def list_pending_approvals(
    current_user: User = Depends(require_finance_manager),
    db: AsyncSession = Depends(get_db)
):
    """Invoices awaiting Finance Manager review and disbursement sign-off."""
    query = (
        select(Invoice)
        .options(selectinload(Invoice.vendor), selectinload(Invoice.items), selectinload(Invoice.purchase_order))
        .where(
            Invoice.organization_id == current_user.organization_id,
            Invoice.status.in_(["PENDING_VERIFICATION", "UNDER_INVESTIGATION"])
        )
        .order_by(Invoice.risk_score.desc())
    )
    invoices = (await db.execute(query)).scalars().all()
    res = []
    for inv in invoices:
        item = InvoiceResponse.model_validate(inv)
        item.vendor_name = inv.vendor.name if inv.vendor else None
        item.po_number = inv.purchase_order.po_number if inv.purchase_order else None
        res.append(item)
    return res

@router.post("/{invoice_id}/action")
async def execute_approval_action(
    invoice_id: str,
    payload: ApprovalActionRequest,
    request: Request,
    current_user: User = Depends(require_finance_manager),
    db: AsyncSession = Depends(get_db)
):
    action = payload.action.upper()
    if action not in ["APPROVED", "REJECTED", "ESCALATED", "REQUESTED_CHANGES"]:
        raise HTTPException(status_code=400, detail="Invalid approval action")

    stmt = (
        select(Invoice)
        .options(selectinload(Invoice.workflow))
        .where(Invoice.id == invoice_id, Invoice.organization_id == current_user.organization_id)
    )
    inv = (await db.execute(stmt)).scalars().first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # High-Risk Invoices Must Require Written Reason
    if inv.risk_level in ["HIGH", "CRITICAL"] and action == "APPROVED" and not payload.reason:
        raise HTTPException(
            status_code=400,
            detail="Mandatory justification required to approve an invoice flagged as High or Critical risk."
        )

    prev_status = inv.status
    if action == "APPROVED":
        inv.status = "APPROVED"
        if inv.workflow:
            inv.workflow.current_status = "APPROVED"
            inv.workflow.current_stage = "FINALIZED"
    elif action == "REJECTED":
        inv.status = "REJECTED"
        if inv.workflow:
            inv.workflow.current_status = "REJECTED"
            inv.workflow.current_stage = "FINALIZED"
    elif action == "ESCALATED":
        inv.status = "UNDER_INVESTIGATION"
        if inv.workflow:
            inv.workflow.current_status = "ON_HOLD"
            inv.workflow.current_stage = "AUDIT_REVIEW"

    # Add Approval History Entry
    if inv.workflow:
        history_entry = ApprovalHistory(
            approval_workflow_id=inv.workflow.id,
            reviewer_user_id=current_user.id,
            action_taken=action,
            reason=payload.reason or f"Action {action} performed by {current_user.full_name}",
            action_timestamp=datetime.now(timezone.utc)
        )
        db.add(history_entry)

    await record_audit_log(
        db=db,
        organization_id=current_user.organization_id,
        action=f"INVOICE_DECISION_{action}",
        resource_type="INVOICE",
        user=current_user,
        resource_id=inv.id,
        previous_values={"status": prev_status},
        new_values={"status": inv.status, "reason": payload.reason},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    await db.commit()

    return {
        "success": True,
        "invoice_id": inv.id,
        "action_taken": action,
        "new_status": inv.status,
        "message": f"Invoice #{inv.invoice_number} successfully {action.lower()}."
    }

@router.get("/{invoice_id}/history", response_model=ApprovalWorkflowResponse)
async def get_approval_history(
    invoice_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(ApprovalWorkflow)
        .options(selectinload(ApprovalWorkflow.history).selectinload(ApprovalHistory.reviewer))
        .where(ApprovalWorkflow.invoice_id == invoice_id, ApprovalWorkflow.organization_id == current_user.organization_id)
    )
    wf = (await db.execute(stmt)).scalars().first()
    if not wf:
        raise HTTPException(status_code=404, detail="Approval workflow not found")

    res = ApprovalWorkflowResponse.model_validate(wf)
    for h, db_h in zip(res.history, wf.history):
        if db_h.reviewer:
            h.reviewer_name = db_h.reviewer.full_name
    return res
