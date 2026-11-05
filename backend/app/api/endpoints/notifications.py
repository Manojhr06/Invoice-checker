from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from backend.app.core.database import get_db
from backend.app.core.deps import get_current_user
from backend.app.models.user import User, Notification

router = APIRouter()

@router.get("")
async def get_user_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Notification)
        .where(
            Notification.organization_id == current_user.organization_id,
            Notification.user_id == current_user.id
        )
        .order_by(Notification.created_at.desc())
        .limit(20)
    )
    notes = (await db.execute(stmt)).scalars().all()
    unread_count = sum(1 for n in notes if not n.is_read)
    return {
        "notifications": [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "type": n.type,
                "link": n.link,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat()
            } for n in notes
        ],
        "unread_count": unread_count
    }

@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Notification).where(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    )
    note = (await db.execute(stmt)).scalars().first()
    if not note:
        raise HTTPException(status_code=404, detail="Notification not found")

    note.is_read = True
    await db.commit()
    return {"success": True, "message": "Notification marked as read."}
