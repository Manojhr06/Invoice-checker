from typing import Optional, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict

class RoleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    description: Optional[str] = None
    permissions: Optional[Any] = None

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    organization_id: str
    email: str
    first_name: str
    last_name: str
    full_name: str
    department: Optional[str] = None
    is_active: bool
    role: RoleResponse
    last_login_at: Optional[datetime] = None
    created_at: datetime

class UserCreateRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    role_name: str  # ADMIN, FINANCE_MANAGER, FINANCE_EMPLOYEE, AUDITOR
    department: Optional[str] = None

class UserUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    department: Optional[str] = None
    role_name: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None
