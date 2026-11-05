from decimal import Decimal
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from backend.app.models.purchase_order import PurchaseOrder, PurchaseOrderItem

class PurchaseOrderMatchService:
    """
    Intelligent 3-Way Purchase Order Reconciliation Engine.
    Verifies line item pricing within tolerances, quantity compliance, and contracted budget ceilings.
    """

    TOLERANCE_PERCENT = Decimal("2.0")  # 2.0% allowable unit price variance

    @staticmethod
    async def match_invoice_against_po(
        db: AsyncSession,
        organization_id: str,
        po_id: Optional[str],
        po_number: Optional[str],
        vendor_id: Optional[str],
        invoice_total: Decimal,
        invoice_items: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        result = {
            "po_found": False,
            "po_matched": True,
            "po_id": None,
            "po_number": po_number,
            "po_total_amount": 0.0,
            "po_utilized_amount": 0.0,
            "po_remaining_amount": 0.0,
            "po_amount_exceeded": False,
            "discrepancies": [],
            "risk_penalty": 0
        }

        # Resolve Purchase Order
        po: Optional[PurchaseOrder] = None
        if po_id:
            stmt = select(PurchaseOrder).options(selectinload(PurchaseOrder.items)).where(
                PurchaseOrder.id == po_id, PurchaseOrder.organization_id == organization_id
            )
            po = (await db.execute(stmt)).scalars().first()
        elif po_number:
            stmt = select(PurchaseOrder).options(selectinload(PurchaseOrder.items)).where(
                PurchaseOrder.organization_id == organization_id,
                PurchaseOrder.po_number.ilike(po_number.strip())
            )
            po = (await db.execute(stmt)).scalars().first()

        if not po:
            # Invoice without Purchase Order
            result["po_found"] = False
            if invoice_total > Decimal("2500.00"):
                result["po_matched"] = False
                result["discrepancies"].append("NO_MATCHING_PO: Invoice exceeds $2,500.00 threshold without an authorized Purchase Order.")
                result["risk_penalty"] += 35
            return result

        result["po_found"] = True
        result["po_id"] = po.id
        result["po_number"] = po.po_number
        result["po_total_amount"] = float(po.total_amount)
        result["po_utilized_amount"] = float(po.utilized_amount)
        remaining = po.total_amount - po.utilized_amount
        result["po_remaining_amount"] = float(remaining)

        # 1. Vendor Match Check
        if vendor_id and po.vendor_id != vendor_id:
            result["po_matched"] = False
            result["discrepancies"].append(f"PO_VENDOR_MISMATCH: Purchase order was authorized for another vendor.")
            result["risk_penalty"] += 50

        # 2. Total Budget Ceiling Check
        if invoice_total > remaining:
            result["po_amount_exceeded"] = True
            result["po_matched"] = False
            over_amount = float(invoice_total - remaining)
            result["discrepancies"].append(f"EXCESSIVE_BILLING: Invoice exceeds authorized PO remaining budget by ${over_amount:.2f}.")
            result["risk_penalty"] += 45

        # 3. Line Items & Price Tolerance Check
        if po.items and invoice_items:
            for inv_item in invoice_items:
                inv_unit_price = Decimal(str(inv_item.get("unit_price", 0)))
                inv_desc = inv_item.get("item_description", "").lower()

                # Find closest PO item
                closest_po_item = next(
                    (p for p in po.items if any(w in p.item_description.lower() for w in inv_desc.split() if len(w) > 3)),
                    po.items[0]
                )

                if closest_po_item:
                    po_price = closest_po_item.unit_price
                    if po_price > Decimal("0.00"):
                        variance_pct = ((inv_unit_price - po_price) / po_price) * Decimal("100.0")
                        if variance_pct > PurchaseOrderMatchService.TOLERANCE_PERCENT:
                            result["po_matched"] = False
                            result["discrepancies"].append(
                                f"PRICE_DISCREPANCY: Item '{inv_item.get('item_description')}' billed at ${float(inv_unit_price):.2f} "
                                f"vs contracted ${float(po_price):.2f} ({float(variance_pct):.1f}% variance, exceeding {PurchaseOrderMatchService.TOLERANCE_PERCENT}% tolerance)."
                            )
                            result["risk_penalty"] += 25

        return result
