import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, Numeric, DateTime, Date, Integer, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    vendor_id = Column(String(36), ForeignKey("vendors.id", ondelete="RESTRICT"), nullable=True, index=True)
    purchase_order_id = Column(String(36), ForeignKey("purchase_orders.id", ondelete="SET NULL"), nullable=True, index=True)
    invoice_number = Column(String(100), nullable=False, index=True)
    invoice_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=True)
    subtotal_amount = Column(Numeric(14, 2), nullable=False)
    tax_amount = Column(Numeric(14, 2), default=0.00)
    total_amount = Column(Numeric(14, 2), nullable=False, index=True)
    currency = Column(String(3), default="USD")
    payment_terms = Column(String(100), nullable=True)
    document_hash = Column(String(64), nullable=False, index=True)  # SHA-256
    status = Column(String(30), default="PENDING_VERIFICATION", index=True) 
    # DRAFT, PENDING_VERIFICATION, UNDER_INVESTIGATION, APPROVED, REJECTED, CANCELLED
    risk_score = Column(Numeric(5, 2), default=0.00)
    risk_level = Column(String(20), default="LOW")  # LOW, MEDIUM, HIGH, CRITICAL
    uploaded_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    is_synthetic = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, index=True)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    organization = relationship("Organization", back_populates="invoices")
    vendor = relationship("Vendor", back_populates="invoices")
    purchase_order = relationship("PurchaseOrder", back_populates="invoices")
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_user_id])
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    documents = relationship("UploadedDocument", back_populates="invoice", cascade="all, delete-orphan")
    verification = relationship("InvoiceVerification", back_populates="invoice", uselist=False, cascade="all, delete-orphan", foreign_keys="[InvoiceVerification.invoice_id]")
    fraud_prediction = relationship("FraudPrediction", back_populates="invoice", uselist=False, cascade="all, delete-orphan")
    alerts = relationship("FraudAlert", back_populates="invoice", cascade="all, delete-orphan")
    workflow = relationship("ApprovalWorkflow", back_populates="invoice", uselist=False, cascade="all, delete-orphan")
    feedback = relationship("ModelFeedback", back_populates="invoice", cascade="all, delete-orphan")

class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    invoice_id = Column(String(36), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    item_description = Column(String(500), nullable=False)
    quantity = Column(Numeric(10, 2), nullable=False)
    unit_price = Column(Numeric(14, 2), nullable=False)
    tax_rate = Column(Numeric(5, 2), default=0.00)
    tax_amount = Column(Numeric(14, 2), default=0.00)
    total_price = Column(Numeric(14, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    invoice = relationship("Invoice", back_populates="items")

class UploadedDocument(Base):
    __tablename__ = "uploaded_documents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    invoice_id = Column(String(36), ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True, index=True)
    filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    sha256_checksum = Column(String(64), nullable=False, index=True)
    ocr_status = Column(String(30), default="PENDING")  # PENDING, PROCESSING, COMPLETED, FAILED
    raw_ocr_payload = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    invoice = relationship("Invoice", back_populates="documents")
