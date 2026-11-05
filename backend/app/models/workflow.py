import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, Numeric, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

class ApprovalWorkflow(Base):
    __tablename__ = "approval_workflows"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    invoice_id = Column(String(36), ForeignKey("invoices.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    current_stage = Column(String(50), default="MANAGER_REVIEW")  # EMPLOYEE_SUBMITTED, MANAGER_REVIEW, AUDIT_REVIEW, FINALIZED
    current_status = Column(String(30), default="PENDING", index=True)  # PENDING, APPROVED, REJECTED, ON_HOLD
    requires_dual_authorization = Column(Boolean, default=False)
    approval_limit = Column(Numeric(14, 2), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    invoice = relationship("Invoice", back_populates="workflow")
    history = relationship("ApprovalHistory", back_populates="workflow", cascade="all, delete-orphan", order_by="ApprovalHistory.action_timestamp.desc()")

class ApprovalHistory(Base):
    __tablename__ = "approval_history"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    approval_workflow_id = Column(String(36), ForeignKey("approval_workflows.id", ondelete="CASCADE"), nullable=False, index=True)
    reviewer_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    action_taken = Column(String(30), nullable=False)  # SUBMITTED, APPROVED, REJECTED, ESCALATED, REQUESTED_CHANGES
    reason = Column(Text, nullable=True)
    action_timestamp = Column(DateTime(timezone=True), default=utc_now)

    workflow = relationship("ApprovalWorkflow", back_populates="history")
    reviewer = relationship("User")
