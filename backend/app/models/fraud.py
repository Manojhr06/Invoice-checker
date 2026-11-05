import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, Numeric, DateTime, Text, Integer, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    model_name = Column(String(100), nullable=False)
    algorithm = Column(String(50), nullable=False)
    version_tag = Column(String(50), nullable=False, unique=True)
    artifact_path = Column(String(500), nullable=False)
    training_sample_count = Column(Integer, nullable=False, default=0)
    evaluation_metrics = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    predictions = relationship("FraudPrediction", back_populates="model_version")

class FraudPrediction(Base):
    __tablename__ = "fraud_predictions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    invoice_id = Column(String(36), ForeignKey("invoices.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    model_version_id = Column(String(36), ForeignKey("model_versions.id"), nullable=True)
    supervised_fraud_probability = Column(Numeric(5, 4), nullable=False, default=0.0000)
    isolation_forest_anomaly_score = Column(Numeric(5, 4), nullable=False, default=0.0000)
    composite_risk_score = Column(Numeric(5, 2), nullable=False, default=0.00)
    feature_importance_shap = Column(JSON, nullable=True)
    natural_language_explanation = Column(Text, nullable=True)
    recommended_action = Column(String(50), default="REVIEW")
    created_at = Column(DateTime(timezone=True), default=utc_now)

    invoice = relationship("Invoice", back_populates="fraud_prediction")
    model_version = relationship("ModelVersion", back_populates="predictions")
    feedback = relationship("ModelFeedback", back_populates="fraud_prediction")

class FraudAlert(Base):
    __tablename__ = "fraud_alerts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    invoice_id = Column(String(36), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    severity = Column(String(20), nullable=False, index=True)  # LOW, MEDIUM, HIGH, CRITICAL
    alert_title = Column(String(255), nullable=False)
    alert_description = Column(Text, nullable=False)
    investigation_status = Column(String(30), default="NEW", index=True)
    # NEW, UNDER_INVESTIGATION, CONFIRMED_FRAUD, LEGITIMATE, ESCALATED, RESOLVED
    assigned_to_user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    resolution_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, index=True)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    organization = relationship("Organization", back_populates="alerts")
    invoice = relationship("Invoice", back_populates="alerts")
    assigned_to_user = relationship("User", back_populates="assigned_alerts", foreign_keys=[assigned_to_user_id])

class ModelFeedback(Base):
    __tablename__ = "model_feedback"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    invoice_id = Column(String(36), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    fraud_prediction_id = Column(String(36), ForeignKey("fraud_predictions.id"), nullable=True)
    reviewer_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    ground_truth_label = Column(String(30), nullable=False)  # CONFIRMED_FRAUD, LEGITIMATE, FALSE_POSITIVE, POLICY_EXCEPTION
    feedback_notes = Column(Text, nullable=True)
    is_verified_for_training = Column(Boolean, default=False, index=True)
    verified_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    invoice = relationship("Invoice", back_populates="feedback")
    fraud_prediction = relationship("FraudPrediction", back_populates="feedback")
