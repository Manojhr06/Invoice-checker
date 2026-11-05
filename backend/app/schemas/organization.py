from typing import Optional
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict

class OrganizationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    slug: str
    currency: str
    country: str
    is_active: bool
    risk_tolerance_threshold: Decimal
    created_at: datetime
    updated_at: datetime

class OrganizationUpdateRequest(BaseModel):
    name: Optional[str] = None
    currency: Optional[str] = None
    country: Optional[str] = None
    risk_tolerance_threshold: Optional[Decimal] = None

class CompanyPolicyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    organization_id: str
    policy_title: str
    category: str
    policy_content: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

class CompanyPolicyCreateRequest(BaseModel):
    policy_title: str
    category: str
    policy_content: str
    is_active: bool = True
