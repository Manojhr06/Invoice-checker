from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.core.deps import get_current_user
from backend.app.models.user import User
from backend.app.services.assistant_service import AIAssistantService

router = APIRouter()

class ChatRequest(BaseModel):
    query: str

@router.post("/chat")
async def chat_with_assistant(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    role_name = current_user.role.name if current_user.role else "FINANCE_EMPLOYEE"
    result = await AIAssistantService.process_query(
        db=db,
        organization_id=current_user.organization_id,
        user_role=role_name,
        query=payload.query
    )
    return {
        "success": True,
        **result
    }
