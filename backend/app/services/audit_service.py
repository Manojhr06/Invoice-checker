from typing import Optional, Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.user import AuditLog, User

async def record_audit_log(
    db: AsyncSession,
    organization_id: str,
    action: str,
    resource_type: str,
    user: Optional[User] = None,
    user_id: Optional[str] = None,
    user_email: Optional[str] = None,
    resource_id: Optional[str] = None,
    previous_values: Optional[Dict[str, Any]] = None,
    new_values: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> AuditLog:
    if user:
        user_id = user.id
        user_email = user.email

    audit_entry = AuditLog(
        organization_id=organization_id,
        user_id=user_id,
        user_email=user_email,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        ip_address=ip_address,
        user_agent=user_agent,
        previous_values=previous_values,
        new_values=new_values
    )
    db.add(audit_entry)
    return audit_entry
