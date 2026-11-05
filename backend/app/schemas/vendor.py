from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, EmailStr, ConfigDict

class VendorBankAccountBase(BaseModel):
    bank_name: str
    account_number: str
    ifsc_swift_code: str
    account_holder_name: str
    is_primary: bool = True

class VendorBankAccountCreate(VendorBankAccountBase):
    pass

class VendorBankAccountResponse(VendorBankAccountBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    vendor_id: str
    is_verified: bool
    requires_manager_approval: bool
    verified_at: Optional[datetime] = None
    created_at: datetime

class VendorBase(BaseModel):
    vendor_code: str
    name: str
    gstin: Optional[str] = None
    tax_id: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class VendorCreate(VendorBase):
    initial_bank_account: Optional[VendorBankAccountCreate] = None

class VendorUpdate(BaseModel):
    name: Optional[str] = None
    gstin: Optional[str] = None
    tax_id: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    is_verified: Optional[bool] = None

class VendorResponse(VendorBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    organization_id: str
    risk_score: Decimal
    risk_level: str
    is_verified: bool
    verified_at: Optional[datetime] = None
    created_at: datetime
    bank_accounts: List[VendorBankAccountResponse] = []
