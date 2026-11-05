import re
from datetime import date, timedelta
from decimal import Decimal
from typing import Dict, Any, Optional
from difflib import SequenceMatcher
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from backend.app.models.invoice import Invoice

class DuplicateDetectionService:
    """
    Intelligent Multi-Signal Duplicate Invoice Detection Engine.
    Detects exact file hashes, fuzzy invoice number collisions, and suspicious repeat disbursements.
    """

    @staticmethod
    async def check_duplicates(
        db: AsyncSession,
        organization_id: str,
        current_invoice_id: Optional[str],
        invoice_number: str,
        vendor_id: Optional[str],
        invoice_date: date,
        total_amount: Decimal,
        document_hash: str
    ) -> Dict[str, Any]:
        result = {
            "duplicate_detected": False,
            "matched_invoice_id": None,
            "matched_invoice_number": None,
            "match_reason": None,
            "similarity_score": 0.0,
            "risk_penalty": 0
        }

        # Query all existing invoices for this tenant
        query = select(Invoice).where(
            Invoice.organization_id == organization_id
        )
        if current_invoice_id:
            query = query.where(Invoice.id != current_invoice_id)

        all_invoices = (await db.execute(query)).scalars().all()
        clean_inv_num = re.sub(r'[^a-zA-Z0-9]', '', invoice_number.upper())

        for prev in all_invoices:
            # 1. Exact File Hash Match (Identical physical document uploaded)
            if prev.document_hash and prev.document_hash == document_hash:
                result["duplicate_detected"] = True
                result["matched_invoice_id"] = prev.id
                result["matched_invoice_number"] = prev.invoice_number
                result["match_reason"] = f"EXACT_DOCUMENT_HASH_MATCH: Binary SHA-256 digest identical to existing invoice #{prev.invoice_number}."
                result["similarity_score"] = 1.0
                result["risk_penalty"] = 90
                return result

            # 2. Exact Invoice Number Collision for Same Vendor
            if vendor_id and prev.vendor_id == vendor_id:
                prev_clean = re.sub(r'[^a-zA-Z0-9]', '', prev.invoice_number.upper())
                if clean_inv_num == prev_clean:
                    result["duplicate_detected"] = True
                    result["matched_invoice_id"] = prev.id
                    result["matched_invoice_number"] = prev.invoice_number
                    result["match_reason"] = f"EXACT_INVOICE_NUMBER_COLLISION: Duplicate invoice number #{prev.invoice_number} already recorded for vendor."
                    result["similarity_score"] = 1.0
                    result["risk_penalty"] = 85
                    return result

                # 3. Fuzzy / Near-Duplicate Invoice Number (e.g. INV-901 vs INV-901-A)
                seq_ratio = SequenceMatcher(None, clean_inv_num, prev_clean).ratio()
                if seq_ratio > 0.85 and abs(prev.total_amount - total_amount) < Decimal("0.05"):
                    # Check date separation: legitimate recurring monthly invoices usually 25-35 days apart
                    day_diff = abs((invoice_date - prev.invoice_date).days) if prev.invoice_date and invoice_date else 999
                    if day_diff < 15:
                        result["duplicate_detected"] = True
                        result["matched_invoice_id"] = prev.id
                        result["matched_invoice_number"] = prev.invoice_number
                        result["match_reason"] = f"SUSPICIOUS_SIMILAR_INVOICE: Similar invoice #{prev.invoice_number} (fuzzy similarity: {seq_ratio:.2f}) submitted only {day_diff} days apart."
                        result["similarity_score"] = seq_ratio
                        result["risk_penalty"] = 70
                        return result

                # 4. Same Vendor & Identical Amount Proximity
                if abs(prev.total_amount - total_amount) < Decimal("0.01"):
                    day_diff = abs((invoice_date - prev.invoice_date).days) if prev.invoice_date and invoice_date else 999
                    if day_diff <= 3:
                        result["duplicate_detected"] = True
                        result["matched_invoice_id"] = prev.id
                        result["matched_invoice_number"] = prev.invoice_number
                        result["match_reason"] = f"DUPLICATE_AMOUNT_PROXIMITY: Identical disbursement of {total_amount} issued to same vendor within {day_diff} days."
                        result["similarity_score"] = 0.90
                        result["risk_penalty"] = 65
                        return result

        return result
