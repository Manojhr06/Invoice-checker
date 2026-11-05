import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Numeric, DateTime, Date, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    vendor_id = Column(String(36), ForeignKey("vendors.id", ondelete="RESTRICT"), nullable=False, index=True)
    po_number = Column(String(100), nullable=False, index=True)
    issue_date = Column(Date, nullable=False)
    expected_delivery_date = Column(Date, nullable=True)
    total_amount = Column(Numeric(14, 2), nullable=False)
    utilized_amount = Column(Numeric(14, 2), default=0.00)
    status = Column(String(30), default="ACTIVE")  # ACTIVE, FULFILLED, CANCELLED
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    organization = relationship("Organization", back_populates="purchase_orders")
    vendor = relationship("Vendor", back_populates="purchase_orders")
    items = relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="purchase_order")

    __table_args__ = (
        UniqueConstraint("organization_id", "po_number", name="uq_org_po_number"),
    )

class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    purchase_order_id = Column(String(36), ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    item_description = Column(Text, nullable=False)
    quantity = Column(Numeric(10, 2), nullable=False)
    unit_price = Column(Numeric(14, 2), nullable=False)
    tax_amount = Column(Numeric(14, 2), default=0.00)
    total_price = Column(Numeric(14, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    purchase_order = relationship("PurchaseOrder", back_populates="items")
