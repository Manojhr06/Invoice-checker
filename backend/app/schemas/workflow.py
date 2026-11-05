from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict

class ApprovalActionRequest(BaseModel):
    action: str  # APPROVED, REJECTED, ESCALATED, REQUESTED_CHANGES
    reason: Optional[str] = None

class ApprovalHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    approval_workflow_id: str
    reviewer_user_id: Optional[str] = None
    reviewer_name: Optional[str] = None
    action_taken: str
    reason: Optional[str] = None
    action_timestamp: datetime

class ApprovalWorkflowResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    invoice_id: str
    organization_id: str
    current_stage: str
    current_status: str
    requires_dual_authorization: bool
    approval_limit: Optional[Decimal] = None
    created_at: datetime
    updated_at: datetime
    history: List[ApprovalHistoryResponse] = []
