from typing import List, Dict, Any, Optional
from decimal import Decimal
from pydantic import BaseModel

class DashboardSummaryResponse(BaseModel):
    total_invoices_processed: int
    legitimate_invoices: int
    suspicious_invoices: int
    confirmed_fraud_invoices: int
    pending_approvals: int
    duplicate_invoices_detected: int
    total_invoice_value: Decimal
    exposure_under_investigation: Decimal
    currency: str = "USD"

class MonthlyTrendItem(BaseModel):
    month: str
    total_volume: int
    total_amount: Decimal
    flagged_fraud_count: int
    flagged_fraud_amount: Decimal

class RiskDistributionItem(BaseModel):
    risk_level: str
    count: int
    total_amount: Decimal

class DepartmentExposureItem(BaseModel):
    department: str
    invoice_count: int
    total_amount: Decimal
    high_risk_amount: Decimal
