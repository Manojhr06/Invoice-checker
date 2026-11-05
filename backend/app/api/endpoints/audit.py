from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from backend.app.core.database import get_db
from backend.app.core.deps import get_current_user, require_auditor
from backend.app.models.user import User, AuditLog
from backend.app.schemas.audit import AuditLogResponse

router = APIRouter()

@router.get("", response_model=List[AuditLogResponse])
async def list_audit_logs(
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    current_user: User = Depends(require_auditor),
    db: AsyncSession = Depends(get_db)
):
    """Immutable forensic audit trail query for Compliance & Audit roles."""
    query = (
        select(AuditLog)
        .where(AuditLog.organization_id == current_user.organization_id)
        .order_by(AuditLog.timestamp.desc())
        .limit(100)
    )
    if action:
        query = query.where(AuditLog.action == action.upper())
    if resource_type:
        query = query.where(AuditLog.resource_type == resource_type.upper())

    result = await db.execute(query)
    return result.scalars().all()
