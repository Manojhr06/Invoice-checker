import random
from datetime import datetime, timedelta, date
from decimal import Decimal
import pandas as pd
import numpy as np

def generate_synthetic_invoice_dataset(n_samples: int = 1200, output_csv: str = "ml-engine/datasets/synthetic_invoices.csv"):
    """
    Generates realistic, benchmark enterprise financial transactions.
    Explicitly flags synthetic records (is_synthetic = True).
    Includes 6 real-world fraud archetypes alongside verified legitimate operations.
    """
    random.seed(42)
    np.random.seed(42)

    vendor_profiles = [
        {"name": f"Vendor-{i:02d}", "code": f"VND-{i:03d}", "base_mean": random.uniform(3000, 25000), "freq": random.randint(1, 12)}
        for i in range(1, 26)
    ]

    records = []
    base_date = datetime(2026, 1, 1)

    for i in range(n_samples):
        v = random.choice(vendor_profiles)
        is_fraud = random.random() < 0.08  # ~8% fraud contamination rate
        fraud_type = "NONE"

        # Baseline legitimate transaction properties
        amount = max(200.0, float(np.random.normal(v["base_mean"], v["base_mean"] * 0.18)))
        vendor_frequency_30d = max(1, int(np.random.poisson(v["freq"])))
        vendor_age_days = random.randint(60, 1200)
        bank_changed_recent = 0
        gstin_match = 1
        po_mismatch_ratio = max(0.0, float(np.random.normal(0.005, 0.008)))
        duplicate_score = float(np.random.beta(1, 20))
        is_weekend = 1 if (base_date + timedelta(days=i % 300)).weekday() >= 5 else 0
        is_round_amount = 1 if amount % 1000 == 0 else 0
        historical_fraud_count = 0

        if is_fraud:
            archetype = random.choice([1, 2, 3, 4, 5, 6])
            if archetype == 1:
                # Duplicate billing
                fraud_type = "DUPLICATE_BILLING"
                duplicate_score = float(random.uniform(0.85, 1.0))
                po_mismatch_ratio = float(random.uniform(0.0, 0.05))
            elif archetype == 2:
                # Recent bank account modification + inflated amount
                fraud_type = "BANK_CHANGE_INFLATION"
                bank_changed_recent = 1
                amount = amount * float(random.uniform(2.5, 5.0))
            elif archetype == 3:
                # Ghost vendor with tax mismatch
                fraud_type = "UNREGISTERED_GHOST_VENDOR"
                gstin_match = 0
                vendor_age_days = random.randint(1, 15)
            elif archetype == 4:
                # PO line item inflation
                fraud_type = "PO_PRICE_INFLATION"
                po_mismatch_ratio = float(random.uniform(0.35, 0.90))
            elif archetype == 5:
                # Frequency velocity spike
                fraud_type = "TRANSACTION_VELOCITY_SPIKE"
                vendor_frequency_30d = int(v["freq"] * random.uniform(4.0, 8.0))
                amount = amount * 1.5
            elif archetype == 6:
                # Weekend off-hours round-amount milestone
                fraud_type = "WEEKEND_ROUND_MILESTONE"
                is_weekend = 1
                is_round_amount = 1
                amount = float(random.choice([25000, 50000, 75000, 100000]))

        # Engineered features
        amount_to_vendor_mean = amount / v["base_mean"]
        amount_z_score = (amount - v["base_mean"]) / (v["base_mean"] * 0.20)

        records.append({
            "invoice_id": f"SYN-INV-{i+1000}",
            "vendor_code": v["code"],
            "vendor_name": v["name"],
            "amount": round(amount, 2),
            "amount_to_vendor_mean_ratio": round(amount_to_vendor_mean, 4),
            "amount_z_score": round(amount_z_score, 4),
            "vendor_invoice_frequency_30d": vendor_frequency_30d,
            "vendor_age_days": vendor_age_days,
            "bank_account_changed_recent": bank_changed_recent,
            "gstin_mismatch_flag": 0 if gstin_match else 1,
            "po_match_discrepancy_ratio": round(po_mismatch_ratio, 4),
            "duplicate_similarity_score": round(duplicate_score, 4),
            "invoice_weekend_submission": is_weekend,
            "invoice_round_amount_flag": is_round_amount,
            "days_to_due_date": random.choice([15, 30, 45, 60]),
            "historical_fraud_count_vendor": historical_fraud_count,
            "is_synthetic": True,
            "fraud_type": fraud_type,
            "is_fraud": 1 if is_fraud else 0
        })

    df = pd.DataFrame(records)
    df.to_csv(output_csv, index=False)
    print(f"Generated synthetic dataset with {len(df)} samples ({df['is_fraud'].sum()} frauds) at {output_csv}")
    return df

if __name__ == "__main__":
    generate_synthetic_invoice_dataset()
