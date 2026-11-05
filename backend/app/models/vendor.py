import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, Numeric, DateTime, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    vendor_code = Column(String(50), nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    gstin = Column(String(50), nullable=True)
    tax_id = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    risk_score = Column(Numeric(5, 2), default=0.00)
    risk_level = Column(String(20), default="LOW")  # LOW, MEDIUM, HIGH, CRITICAL
    is_verified = Column(Boolean, default=False)
    verified_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    organization = relationship("Organization", back_populates="vendors")
    bank_accounts = relationship("VendorBankAccount", back_populates="vendor", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="vendor")
    purchase_orders = relationship("PurchaseOrder", back_populates="vendor")

    __table_args__ = (
        UniqueConstraint("organization_id", "vendor_code", name="uq_org_vendor_code"),
    )

class VendorBankAccount(Base):
    __tablename__ = "vendor_bank_accounts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    vendor_id = Column(String(36), ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    bank_name = Column(String(150), nullable=False)
    account_number = Column(String(50), nullable=False)
    ifsc_swift_code = Column(String(50), nullable=False)
    account_holder_name = Column(String(255), nullable=False)
    is_primary = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    requires_manager_approval = Column(Boolean, default=False)
    verified_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    vendor = relationship("Vendor", back_populates="bank_accounts")
