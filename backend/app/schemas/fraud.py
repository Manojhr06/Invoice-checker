from typing import Optional, Dict, Any
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict

class FraudPredictionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    invoice_id: str
    supervised_fraud_probability: Decimal
    isolation_forest_anomaly_score: Decimal
    composite_risk_score: Decimal
    feature_importance_shap: Optional[Dict[str, Any]] = None
    natural_language_explanation: Optional[str] = None
    recommended_action: str
    created_at: datetime

class FraudAlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    organization_id: str
    invoice_id: str
    severity: str
    alert_title: str
    alert_description: str
    investigation_status: str
    assigned_to_user_id: Optional[str] = None
    assigned_user_name: Optional[str] = None
    invoice_number: Optional[str] = None
    vendor_name: Optional[str] = None
    total_amount: Optional[Decimal] = None
    resolution_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

class AlertUpdateStatusRequest(BaseModel):
    investigation_status: str  # NEW, UNDER_INVESTIGATION, CONFIRMED_FRAUD, LEGITIMATE, ESCALATED, RESOLVED
    assigned_to_user_id: Optional[str] = None
    resolution_notes: Optional[str] = None

class ModelFeedbackCreate(BaseModel):
    invoice_id: str
    ground_truth_label: str  # CONFIRMED_FRAUD, LEGITIMATE, FALSE_POSITIVE, POLICY_EXCEPTION
    feedback_notes: Optional[str] = None

class ModelVersionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    model_name: str
    algorithm: str
    version_tag: str
    training_sample_count: int
    evaluation_metrics: Optional[Dict[str, Any]] = None
    is_active: bool
    created_at: datetime
