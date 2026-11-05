from typing import Optional, List, Any
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, ConfigDict

class InvoiceItemBase(BaseModel):
    item_description: str
    quantity: Decimal
    unit_price: Decimal
    tax_rate: Decimal = Decimal("0.00")
    tax_amount: Decimal = Decimal("0.00")
    total_price: Decimal

class InvoiceItemCreate(InvoiceItemBase):
    pass

class InvoiceItemResponse(InvoiceItemBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    invoice_id: str
    created_at: datetime

class InvoiceOCRCorrection(BaseModel):
    invoice_number: Optional[str] = None
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    vendor_id: Optional[str] = None
    purchase_order_id: Optional[str] = None
    subtotal_amount: Optional[Decimal] = None
    tax_amount: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    payment_terms: Optional[str] = None
    items: Optional[List[InvoiceItemCreate]] = None

class InvoiceCreate(BaseModel):
    vendor_id: Optional[str] = None
    purchase_order_id: Optional[str] = None
    invoice_number: str
    invoice_date: date
    due_date: Optional[date] = None
    subtotal_amount: Decimal
    tax_amount: Decimal = Decimal("0.00")
    total_amount: Decimal
    currency: str = "USD"
    payment_terms: Optional[str] = None
    items: List[InvoiceItemCreate] = []

class InvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    organization_id: str
    vendor_id: Optional[str] = None
    purchase_order_id: Optional[str] = None
    invoice_number: str
    invoice_date: date
    due_date: Optional[date] = None
    subtotal_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    currency: str
    payment_terms: Optional[str] = None
    document_hash: str
    status: str
    risk_score: Decimal
    risk_level: str
    uploaded_by_user_id: Optional[str] = None
    is_synthetic: bool
    created_at: datetime
    updated_at: datetime
    vendor_name: Optional[str] = None
    po_number: Optional[str] = None
    items: List[InvoiceItemResponse] = []
    verification: Optional[Any] = None
    fraud_prediction: Optional[Any] = None
