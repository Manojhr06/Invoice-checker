from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from backend.app.core.database import get_db
from backend.app.core.deps import get_current_user, require_finance_employee
from backend.app.models.user import User
from backend.app.models.vendor import Vendor
from backend.app.models.purchase_order import PurchaseOrder, PurchaseOrderItem
from backend.app.schemas.purchase_order import PurchaseOrderResponse, PurchaseOrderCreate
from backend.app.services.audit_service import record_audit_log

router = APIRouter()

@router.get("", response_model=List[PurchaseOrderResponse])
async def list_purchase_orders(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(PurchaseOrder)
        .options(selectinload(PurchaseOrder.vendor), selectinload(PurchaseOrder.items))
        .where(PurchaseOrder.organization_id == current_user.organization_id)
        .order_by(PurchaseOrder.created_at.desc())
    )
    if status:
        query = query.where(PurchaseOrder.status == status.upper())

    pos = (await db.execute(query)).scalars().all()
    res = []
    for po in pos:
        item = PurchaseOrderResponse.model_validate(po)
        item.vendor_name = po.vendor.name if po.vendor else None
        res.append(item)
    return res

@router.post("", response_model=PurchaseOrderResponse)
async def create_purchase_order(
    payload: PurchaseOrderCreate,
    request: Request,
    current_user: User = Depends(require_finance_employee),
    db: AsyncSession = Depends(get_db)
):
    # Verify vendor exists in organization
    vendor_stmt = select(Vendor).where(
        Vendor.id == payload.vendor_id,
        Vendor.organization_id == current_user.organization_id
    )
    vendor = (await db.execute(vendor_stmt)).scalars().first()
    if not vendor:
        raise HTTPException(status_code=400, detail="Referenced vendor not found in organization")

    # Check unique PO number
    po_check = await db.execute(
        select(PurchaseOrder).where(
            PurchaseOrder.organization_id == current_user.organization_id,
            PurchaseOrder.po_number == payload.po_number.strip()
        )
    )
    if po_check.scalars().first():
        raise HTTPException(status_code=400, detail="Purchase order number already exists in organization")

    po = PurchaseOrder(
        organization_id=current_user.organization_id,
        vendor_id=vendor.id,
        po_number=payload.po_number.strip(),
        issue_date=payload.issue_date,
        expected_delivery_date=payload.expected_delivery_date,
        total_amount=payload.total_amount,
        utilized_amount=Decimal("0.00"),
        status="ACTIVE",
        notes=payload.notes
    )
    db.add(po)
    await db.flush()

    for it in payload.items:
        po_item = PurchaseOrderItem(
            purchase_order_id=po.id,
            item_description=it.item_description.strip(),
            quantity=it.quantity,
            unit_price=it.unit_price,
            tax_amount=it.tax_amount,
            total_price=it.total_price
        )
        db.add(po_item)

    await record_audit_log(
        db=db,
        organization_id=current_user.organization_id,
        action="CREATE_PURCHASE_ORDER",
        resource_type="PURCHASE_ORDER",
        user=current_user,
        resource_id=po.id,
        new_values={"po_number": po.po_number, "total_amount": float(po.total_amount)},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    await db.commit()

    stmt = select(PurchaseOrder).options(selectinload(PurchaseOrder.vendor), selectinload(PurchaseOrder.items)).where(PurchaseOrder.id == po.id)
    created_po = (await db.execute(stmt)).scalars().first()
    res = PurchaseOrderResponse.model_validate(created_po)
    res.vendor_name = vendor.name
    return res

@router.get("/{po_id}", response_model=PurchaseOrderResponse)
async def get_purchase_order(
    po_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(PurchaseOrder)
        .options(selectinload(PurchaseOrder.vendor), selectinload(PurchaseOrder.items))
        .where(PurchaseOrder.id == po_id, PurchaseOrder.organization_id == current_user.organization_id)
    )
    po = (await db.execute(stmt)).scalars().first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    res = PurchaseOrderResponse.model_validate(po)
    res.vendor_name = po.vendor.name if po.vendor else None
    return res
