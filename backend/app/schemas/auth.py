from typing import Optional
from pydantic import BaseModel, EmailStr

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterCompanyRequest(BaseModel):
    company_name: str
    company_slug: Optional[str] = None
    currency: str = "USD"
    country: str = "US"
    admin_first_name: str
    admin_last_name: str
    admin_email: EmailStr
    admin_password: str
    admin_department: Optional[str] = "Executive"

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    reset_token: str
    new_password: str
