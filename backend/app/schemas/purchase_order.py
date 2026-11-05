from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, ConfigDict

class PurchaseOrderItemBase(BaseModel):
    item_description: str
    quantity: Decimal
    unit_price: Decimal
    tax_amount: Decimal = Decimal("0.00")
    total_price: Decimal

class PurchaseOrderItemCreate(PurchaseOrderItemBase):
    pass

class PurchaseOrderItemResponse(PurchaseOrderItemBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    purchase_order_id: str
    created_at: datetime

class PurchaseOrderBase(BaseModel):
    vendor_id: str
    po_number: str
    issue_date: date
    expected_delivery_date: Optional[date] = None
    total_amount: Decimal
    notes: Optional[str] = None

class PurchaseOrderCreate(PurchaseOrderBase):
    items: List[PurchaseOrderItemCreate] = []

class PurchaseOrderResponse(PurchaseOrderBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    organization_id: str
    utilized_amount: Decimal
    status: str
    created_at: datetime
    items: List[PurchaseOrderItemResponse] = []
    vendor_name: Optional[str] = None
