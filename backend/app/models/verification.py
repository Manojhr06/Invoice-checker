import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, Numeric, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

class InvoiceVerification(Base):
    __tablename__ = "invoice_verifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    invoice_id = Column(String(36), ForeignKey("invoices.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    
    # Vendor checks
    vendor_matched = Column(Boolean, default=True)
    vendor_details_match_score = Column(Numeric(5, 2), default=100.00)
    bank_details_matched = Column(Boolean, default=True)
    bank_recently_changed = Column(Boolean, default=False)
    gstin_verified = Column(Boolean, default=True)
    
    # PO checks
    po_matched = Column(Boolean, default=True)
    po_amount_exceeded = Column(Boolean, default=False)
    po_discrepancy_details = Column(JSON, nullable=True)
    
    # Duplicate checks
    duplicate_detected = Column(Boolean, default=False)
    duplicate_matched_invoice_id = Column(String(36), ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True)
    duplicate_match_reason = Column(Text, nullable=True)
    
    # Tax & Calculation checks
    tax_calculation_valid = Column(Boolean, default=True)
    calculated_tax_discrepancy = Column(Numeric(14, 2), default=0.00)
    
    # Flags & Completed timestamp
    verification_flags = Column(JSON, nullable=True)
    completed_at = Column(DateTime(timezone=True), default=utc_now)

    invoice = relationship("Invoice", back_populates="verification", foreign_keys=[invoice_id])
    duplicate_matched_invoice = relationship("Invoice", foreign_keys=[duplicate_matched_invoice_id])
