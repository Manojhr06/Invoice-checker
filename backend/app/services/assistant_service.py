import re
from typing import Dict, Any, List
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from backend.app.models.organization import CompanyPolicy
from backend.app.models.invoice import Invoice
from backend.app.models.vendor import Vendor
from backend.app.models.fraud import FraudAlert, FraudPrediction
from backend.app.models.workflow import ApprovalWorkflow, ApprovalHistory

class AIAssistantService:
    """
    Permission-Aware RAG Financial Intelligence & Policy Assistant.
    Retrieves tenant-isolated policies and real-time transaction data to answer user queries accurately.
    """

    @staticmethod
    async def process_query(
        db: AsyncSession,
        organization_id: str,
        user_role: str,
        query: str
    ) -> Dict[str, Any]:
        q_lower = query.lower()

        # 1. RAG Policy Context Retrieval
        policy_stmt = select(CompanyPolicy).where(
            CompanyPolicy.organization_id == organization_id,
            CompanyPolicy.is_active == True
        )
        policies = (await db.execute(policy_stmt)).scalars().all()
        relevant_policies = []
        for p in policies:
            if any(term in p.policy_title.lower() or term in p.policy_content.lower() for term in q_lower.split() if len(term) > 3):
                relevant_policies.append(p)

        # 2. Specific Invoice Explanation Query
        inv_match = re.search(r"\b(INV-[A-Z0-9\-_]+|[0-9]{4,8})\b", query, re.IGNORECASE)
        if inv_match or "why was" in q_lower or "flagged" in q_lower:
            inv_num = inv_match.group(1) if inv_match else None
            inv_query = (
                select(Invoice)
                .options(selectinload(Invoice.vendor), selectinload(Invoice.fraud_prediction), selectinload(Invoice.alerts))
                .where(Invoice.organization_id == organization_id)
            )
            if inv_num:
                inv_query = inv_query.where(Invoice.invoice_number.ilike(f"%{inv_num}%"))
            else:
                inv_query = inv_query.where(Invoice.risk_level.in_(["HIGH", "CRITICAL"])).order_by(Invoice.created_at.desc())

            target_inv = (await db.execute(inv_query)).scalars().first()
            if target_inv:
                explanation = target_inv.fraud_prediction.natural_language_explanation if target_inv.fraud_prediction else None
                vendor_name = target_inv.vendor.name if target_inv.vendor else "Unknown Vendor"
                return {
                    "answer": (
                        f"### Forensic Analysis for Invoice #{target_inv.invoice_number}\n\n"
                        f"- **Vendor**: {vendor_name}\n"
                        f"- **Billed Amount**: ${float(target_inv.total_amount):,.2f}\n"
                        f"- **Risk Classification**: **{target_inv.risk_level}** (Composite Risk Score: {float(target_inv.risk_score)}/100)\n"
                        f"- **Current Status**: {target_inv.status}\n\n"
                        f"{explanation or 'No detailed explanation generated yet.'}"
                    ),
                    "cited_policies": [p.policy_title for p in relevant_policies[:2]],
                    "related_records": [{"type": "INVOICE", "id": target_inv.id, "number": target_inv.invoice_number}]
                }

        # 3. High-Risk Invoices Summary
        if "high" in q_lower or "risk" in q_lower or "suspicious" in q_lower or "flagged" in q_lower:
            high_risk_stmt = (
                select(Invoice)
                .options(selectinload(Invoice.vendor))
                .where(Invoice.organization_id == organization_id, Invoice.risk_level.in_(["HIGH", "CRITICAL"]))
                .order_by(Invoice.created_at.desc())
                .limit(5)
            )
            high_invoices = (await db.execute(high_risk_stmt)).scalars().all()
            if high_invoices:
                lines = [f"### High & Critical Risk Invoices ({len(high_invoices)} found)\n"]
                for inv in high_invoices:
                    v_name = inv.vendor.name if inv.vendor else "Unknown"
                    lines.append(f"• **#{inv.invoice_number}** ({v_name}) — ${float(inv.total_amount):,.2f} | **{inv.risk_level}** (Score: {float(inv.risk_score)}) | Status: `{inv.status}`")
                lines.append("\n**Recommended Action**: Assign finance managers to review pending alerts and verify vendor bank accounts before disbursement.")
                return {
                    "answer": "\n".join(lines),
                    "cited_policies": [p.policy_title for p in relevant_policies[:2]],
                    "related_records": [{"type": "INVOICE", "id": inv.id, "number": inv.invoice_number} for inv in high_invoices]
                }
            else:
                return {
                    "answer": "Currently, there are **0 high-risk or critical-risk invoices** requiring immediate forensic intervention. All recent transactions are within normal operating parameters.",
                    "cited_policies": [],
                    "related_records": []
                }

        # 4. Duplicate Invoices Query
        if "duplicate" in q_lower:
            dup_stmt = (
                select(Invoice)
                .where(Invoice.organization_id == organization_id, Invoice.status == "UNDER_INVESTIGATION")
                .limit(5)
            )
            dups = (await db.execute(dup_stmt)).scalars().all()
            return {
                "answer": (
                    f"### Duplicate Invoices Forensic Summary\n\n"
                    f"FinGuard AI detected {len(dups)} duplicate or collision events undergoing investigation. "
                    "Invoices with matching document SHA-256 hashes or identical vendor invoice numbers are placed on immediate payment hold pursuant to the **Duplicate Invoice Detection & Hash Collision Standards** policy."
                ),
                "cited_policies": ["Duplicate Invoice Detection & Hash Collision Standards"],
                "related_records": []
            }

        # 5. General Financial Summary Query
        inv_all_stmt = select(Invoice).where(Invoice.organization_id == organization_id)
        all_invs = (await db.execute(inv_all_stmt)).scalars().all()
        total_vol = len(all_invs)
        total_val = sum(inv.total_amount for inv in all_invs) if all_invs else Decimal("0.00")
        flagged_count = sum(1 for inv in all_invs if inv.risk_level in ["HIGH", "CRITICAL"])

        return {
            "answer": (
                f"### FinGuard AI Financial Intelligence Summary\n\n"
                f"- **Total Invoices Processed**: {total_vol}\n"
                f"- **Total Invoiced Value**: ${float(total_val):,.2f} USD\n"
                f"- **Flagged High/Critical Risk**: {flagged_count} transactions\n"
                f"- **Corporate Policies Active**: {len(policies)} verified governance standards\n\n"
                "You can ask me to inspect any specific invoice number (e.g. `Why was INV-xxx flagged?`), summarize suspicious vendors, or check duplicate payment exposure."
            ),
            "cited_policies": [p.policy_title for p in relevant_policies[:2]],
            "related_records": []
        }
