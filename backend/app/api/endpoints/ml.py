from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from backend.app.core.database import get_db
from backend.app.core.deps import get_current_user, require_finance_manager
from backend.app.models.user import User
from backend.app.models.invoice import Invoice
from backend.app.models.fraud import ModelVersion, ModelFeedback
from backend.app.schemas.fraud import ModelVersionResponse, ModelFeedbackCreate
from backend.app.services.audit_service import record_audit_log

router = APIRouter()

@router.get("/models", response_model=List[ModelVersionResponse])
async def list_model_versions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(ModelVersion).order_by(ModelVersion.created_at.desc())
    models = (await db.execute(stmt)).scalars().all()
    return models

@router.post("/feedback")
async def record_human_ground_truth(
    payload: ModelFeedbackCreate,
    request: Request,
    current_user: User = Depends(require_finance_manager),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Invoice).where(
        Invoice.id == payload.invoice_id,
        Invoice.organization_id == current_user.organization_id
    )
    inv = (await db.execute(stmt)).scalars().first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    feedback = ModelFeedback(
        organization_id=current_user.organization_id,
        invoice_id=inv.id,
        reviewer_user_id=current_user.id,
        ground_truth_label=payload.ground_truth_label.upper(),
        feedback_notes=payload.feedback_notes,
        is_verified_for_training=True,
        verified_by_user_id=current_user.id
    )
    db.add(feedback)

    await record_audit_log(
        db=db,
        organization_id=current_user.organization_id,
        action="RECORD_MODEL_GROUND_TRUTH",
        resource_type="MODEL_FEEDBACK",
        user=current_user,
        resource_id=inv.id,
        new_values={"label": feedback.ground_truth_label, "notes": feedback.feedback_notes},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    await db.commit()
    return {
        "success": True,
        "message": f"Ground truth label '{feedback.ground_truth_label}' recorded for invoice #{inv.invoice_number}. Added to governed model retraining dataset."
    }
