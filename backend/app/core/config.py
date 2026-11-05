import os
from typing import List, Union
from pydantic import field_validator, ConfigDict
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

    PROJECT_NAME: str = "FinGuard AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = False
    
    # Security & Cryptography
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-finguard-super-secure-key-at-least-32-chars-long-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    PASSWORD_RESET_EXPIRE_MINUTES: int = 15  # Strict 15-minute expiration
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite+aiosqlite:///./finguard.db"
    )
    
    # CORS
    BACKEND_CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000"
    ]
    
    # Rate Limiting
    RATE_LIMIT_LOGIN_MAX: int = 5
    RATE_LIMIT_LOGIN_WINDOW_SECONDS: int = 60
    RATE_LIMIT_PASSWORD_RESET_MAX: int = 3
    RATE_LIMIT_PASSWORD_RESET_WINDOW_SECONDS: int = 3600

    # Uploads & Storage
    STORAGE_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../storage"))
    INVOICES_DIR: str = os.path.join(STORAGE_DIR, "invoices")
    DOCUMENTS_DIR: str = os.path.join(STORAGE_DIR, "documents")
    MAX_UPLOAD_SIZE_BYTES: int = 15 * 1024 * 1024  # 15 MB
    ALLOWED_UPLOAD_MIME_TYPES: List[str] = [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/jpg"
    ]
    
    # ML Models Artifacts
    ML_ARTIFACTS_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../ml-engine/artifacts"))

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    def validate_production_configuration(self):
        """Enforces zero default secrets and minimum security parameters in production."""
        if self.ENVIRONMENT.lower() == "production":
            if not self.SECRET_KEY or "dev-" in self.SECRET_KEY or len(self.SECRET_KEY) < 32:
                raise ValueError(
                    "CRITICAL SECURITY CONFIGURATION ERROR: Production deployment requires a secure, "
                    "cryptographically random SECRET_KEY of at least 32 characters. Do not use default or development keys."
                )
            if "*" in self.BACKEND_CORS_ORIGINS:
                raise ValueError(
                    "CRITICAL SECURITY CONFIGURATION ERROR: Wildcard CORS ('*') is prohibited in production."
                )

settings = Settings()
settings.validate_production_configuration()

# Ensure critical storage directories exist
for folder in [settings.INVOICES_DIR, settings.DOCUMENTS_DIR, settings.ML_ARTIFACTS_DIR]:
    try:
        os.makedirs(folder, exist_ok=True)
    except Exception:
        pass
