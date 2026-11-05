from typing import Dict, Any, List

class GovernedExplanationEngine:
    """
    Enterprise Explainable AI (XAI) Synthesizer.
    Converts deterministic verification findings, SHAP attributions, and ML anomaly scores
    into human-auditable forensic explanations without hallucination.
    """

    @staticmethod
    def generate_explanation(
        invoice_number: str,
        vendor_name: str,
        amount: float,
        verification: Dict[str, Any],
        ml_prediction: Dict[str, Any]
    ) -> str:
        risk_level = ml_prediction.get("risk_level", "LOW")
        composite_score = ml_prediction.get("composite_risk_score", 0.0)
        fraud_prob = ml_prediction.get("supervised_fraud_probability", 0.0)
        anomaly_score = ml_prediction.get("isolation_forest_anomaly_score", 0.0)
        shap_factors = ml_prediction.get("feature_importance_shap", {})

        paragraphs = []

        # 1. Executive Risk Summary
        if risk_level in ["CRITICAL", "HIGH"]:
            paragraphs.append(
                f"**CRITICAL FRAUD ALERT**: Invoice #{invoice_number} from '{vendor_name}' for ${amount:,.2f} "
                f"has been classified as **{risk_level} RISK** (Composite Score: {composite_score}/100). "
                f"Automated supervised modeling predicts a {fraud_prob * 100:.1f}% probability of fraudulent transaction "
                f"with an anomaly magnitude of {anomaly_score * 100:.1f}%."
            )
        elif risk_level == "MEDIUM":
            paragraphs.append(
                f"**MEDIUM RISK WARNING**: Invoice #{invoice_number} from '{vendor_name}' for ${amount:,.2f} "
                f"has been flagged with a Composite Risk Score of {composite_score}/100. Supervised fraud probability is "
                f"{fraud_prob * 100:.1f}%, while anomaly detection flagged unusual deviations requiring standard Finance Manager review."
            )
        else:
            paragraphs.append(
                f"**LOW RISK VERIFICATION**: Invoice #{invoice_number} from '{vendor_name}' for ${amount:,.2f} "
                f"cleared automated fraud and compliance checks with a Composite Risk Score of {composite_score}/100. "
                f"All core verification checks passed without significant deviation."
            )

        # 2. Key Deterministic Rule Violations & Check Failures
        failed_checks = []
        if verification.get("duplicate_detected"):
            failed_checks.append(f"• **Duplicate Invoice Flag**: {verification.get('duplicate_match_reason')}")
        if verification.get("bank_recently_changed"):
            failed_checks.append("• **Disbursement Alteration**: Vendor bank account details were modified or newly registered within the past 30 days.")
        if not verification.get("bank_details_matched"):
            failed_checks.append("• **Unauthorized Bank Target**: Invoiced bank account does not match the approved vendor bank registry.")
        if not verification.get("gstin_verified"):
            failed_checks.append("• **Tax Identification Mismatch**: Invoiced GSTIN / Tax ID does not reconcile with the government master registry.")
        if verification.get("po_amount_exceeded"):
            failed_checks.append("• **Contract Budget Overrun**: Invoice total exceeds the authorized remaining balance on the linked Purchase Order.")
        if not verification.get("po_matched") and not verification.get("po_found"):
            failed_checks.append("• **Missing Purchase Order**: Invoice exceeds threshold limits without an associated Purchase Order contract.")

        if failed_checks:
            paragraphs.append("**Deterministic Rule Violations Identified:**\n" + "\n".join(failed_checks))

        # 3. Machine Learning & SHAP Contributing Factors
        top_shap = sorted(shap_factors.items(), key=lambda x: x[1], reverse=True)[:3]
        if top_shap and top_shap[0][1] > 0.10:
            shap_desc = []
            for feat, weight in top_shap:
                clean_name = feat.replace("_", " ").title()
                shap_desc.append(f"• {clean_name} (Contribution weight: +{weight * 100:.1f}%)")
            paragraphs.append("**Top Model Risk Drivers (SHAP Attribution):**\n" + "\n".join(shap_desc))

        # 4. Mandatory Human Action Recommended
        rec_action = ml_prediction.get("recommended_action")
        if risk_level == "CRITICAL":
            paragraphs.append(
                "**Recommended Action**: **PLACE IMMEDIATE PAYMENT HOLD**. "
                "Do not approve or release funds. Perform mandatory verbal out-of-band confirmation with the vendor's authorized CFO "
                "and assign this case to the forensic investigation team."
            )
        elif risk_level == "HIGH":
            paragraphs.append(
                "**Recommended Action**: **MANDATORY DUAL-AUTHORIZATION REVIEW**. "
                "Require Department Head review and written confirmation of line item discrepancies before scheduling payment."
            )
        elif risk_level == "MEDIUM":
            paragraphs.append(
                "**Recommended Action**: Standard Finance Manager inspection recommended. Inspect attached PO items and tax calculations."
            )
        else:
            paragraphs.append(
                "**Recommended Action**: Eligible for standard straight-through automated approval workflow."
            )

        return "\n\n".join(paragraphs)
