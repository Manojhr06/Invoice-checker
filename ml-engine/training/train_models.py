import os
import pickle
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import IsolationForest
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, precision_recall_curve, auc
)
import xgboost as xgb
import shap

FEATURE_COLUMNS = [
    "amount",
    "amount_to_vendor_mean_ratio",
    "amount_z_score",
    "vendor_invoice_frequency_30d",
    "vendor_age_days",
    "bank_account_changed_recent",
    "gstin_mismatch_flag",
    "po_match_discrepancy_ratio",
    "duplicate_similarity_score",
    "invoice_weekend_submission",
    "invoice_round_amount_flag",
    "days_to_due_date",
    "historical_fraud_count_vendor"
]

def train_and_evaluate_pipeline(
    dataset_path: str = "ml-engine/datasets/synthetic_invoices.csv",
    artifact_output: str = "ml-engine/artifacts/finguard_ensemble_v1.pkl"
):
    os.makedirs(os.path.dirname(dataset_path), exist_ok=True)
    os.makedirs(os.path.dirname(artifact_output), exist_ok=True)

    if not os.path.exists(dataset_path):
        from generate_synthetic_dataset import generate_synthetic_invoice_dataset
        df = generate_synthetic_invoice_dataset(output_csv=dataset_path)
    else:
        df = pd.read_csv(dataset_path)

    X = df[FEATURE_COLUMNS]
    y = df["is_fraud"]

    # 1. Stratified Train-Test Split (80/20) - Zero Data Leakage
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    # Calculate class imbalance reweighting
    scale_pos = (len(y_train) - sum(y_train)) / max(1, sum(y_train))

    # 2. Train Model A: Supervised XGBoost Classifier
    xgb_model = xgb.XGBClassifier(
        max_depth=4,
        learning_rate=0.05,
        n_estimators=120,
        scale_pos_weight=scale_pos,
        eval_metric="logloss",
        random_state=42,
        use_label_encoder=False
    )
    xgb_model.fit(X_train, y_train)

    # 3. Train Model B: Unsupervised Isolation Forest (Trained on benign normal spend)
    X_normal = X_train[y_train == 0]
    iso_forest = IsolationForest(
        n_estimators=100,
        contamination=0.05,
        random_state=42
    )
    iso_forest.fit(X_normal)

    # 4. Fit SHAP TreeExplainer on XGBoost
    explainer = shap.TreeExplainer(xgb_model)

    # 5. Evaluate on Isolated Test Partition
    y_pred_proba = xgb_model.predict_proba(X_test)[:, 1]
    y_pred = (y_pred_proba >= 0.50).astype(int)

    precision_vals, recall_vals, _ = precision_recall_curve(y_test, y_pred_proba)
    pr_auc = auc(recall_vals, precision_vals)

    metrics = {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "precision": float(precision_score(y_test, y_pred, zero_division=0)),
        "recall": float(recall_score(y_test, y_pred, zero_division=0)),
        "f1_score": float(f1_score(y_test, y_pred, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_test, y_pred_proba)),
        "pr_auc": float(pr_auc),
        "test_sample_count": len(X_test),
        "train_sample_count": len(X_train)
    }

    # 6. Serialize Complete Production Ensemble Artifact
    artifact = {
        "model_version": "finguard-xgb-v1.0",
        "xgb_model": xgb_model,
        "iso_forest": iso_forest,
        "feature_columns": FEATURE_COLUMNS,
        "metrics": metrics,
        "trained_at": pd.Timestamp.utcnow().isoformat()
    }

    with open(artifact_output, "wb") as f:
        pickle.dump(artifact, f)

    print(f"Model training complete. Serialized to {artifact_output}")
    print(f"Evaluation Metrics: {metrics}")
    return metrics

if __name__ == "__main__":
    train_and_evaluate_pipeline()
