import sys
import os
import json
from typing import List, Union, Any
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

class Settings(BaseSettings):
    """
    Application Settings with Robust Parsing
    Handles any input format (string, JSON, comma-separated) without crashing
    """
    
    # Core Security
    SECRET_KEY: str
    # CHANGE: Accept str OR List to prevent parsing errors
    ALLOWED_HOSTS: Union[List[str], str] 
    ENVIRONMENT: str = "development"
    
    # CORS - SECURITY: Default to empty list, must be explicitly configured
    # In production, this MUST be set to specific domains (not "*")
    CORS_ORIGINS: Union[List[str], str] = []
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = 60
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_ANONYMIZE_IPS: bool = True
    LOG_MAX_BYTES: int = 5242880
    LOG_BACKUP_COUNT: int = 3
    
    # Proxy
    TRUSTED_PROXIES: Union[List[str], str] = ["127.0.0.1", "::1"]
    
    # Blockchain & App Logic
    LOCAL_NODE_URL: str = "http://localhost:31400"
    PUBLIC_API_URL: str = "https://api.minepi.com"
    MIN_VERSION: str = "1.0.0"
    
    # Pi Network API Configuration
    PI_API_KEY: str = ""

    # API Settings
    API_V1_PREFIX: str = "/api/v1"
    DATABASE_URL: str = ""

    model_config = SettingsConfigDict(
        env_file=".env", 
        case_sensitive=True,
        extra="ignore"
    )

    @field_validator("SECRET_KEY")
    def validate_secret_key(cls, v):
        if not v:
            raise ValueError("SECRET_KEY is required")
        # Production requires stronger keys
        if len(v) < 32:
            print("[WARNING] SECRET_KEY is weak! For production, use at least 32 characters.")
        if len(v) < 10:
            raise ValueError("SECRET_KEY must be at least 10 characters long")
        return v
    
    @field_validator("ENVIRONMENT")
    def validate_environment(cls, v):
        allowed = ["development", "production", "staging"]
        if v not in allowed:
            raise ValueError(f"ENVIRONMENT must be one of: {allowed}")
        return v

    @field_validator("ALLOWED_HOSTS", "CORS_ORIGINS", "TRUSTED_PROXIES", mode="before")
    def parse_list_fields(cls, v: Any) -> List[str]:
        """
        Robust parser: handles JSON strings, comma-separated strings, or native lists
        """
        if isinstance(v, list):
            return v
        
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return []
            # Try parsing as JSON first (e.g. '["localhost", "127.0.0.1"]')
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except json.JSONDecodeError:
                    pass  # Fallback to comma split
            
            # Fallback: Comma separated (e.g. "localhost,127.0.0.1")
            return [item.strip() for item in v.split(",") if item.strip()]
            
        return []

# Global settings instance
try:
    settings = Settings()
    print("[OK] Configuration loaded successfully.")
    
    # Security warnings for production
    if settings.ENVIRONMENT == "production":
        # Check if CORS_ORIGINS is empty or contains wildcard
        cors_origins_list = settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else []
        if not cors_origins_list or (isinstance(cors_origins_list, list) and "*" in cors_origins_list):
            print("[SECURITY WARNING] CORS_ORIGINS is set to '*' or empty in production! This is insecure.")
            print("[SECURITY WARNING] Set CORS_ORIGINS to specific domains in .env file for production.")
        if len(settings.SECRET_KEY) < 32:
            print("[SECURITY WARNING] SECRET_KEY is less than 32 characters in production! Use a stronger key.")
    elif settings.ENVIRONMENT == "development":
        print("[INFO] Running in development mode. Some security features are relaxed.")
except Exception as e:
    print(f"[ERROR] CRITICAL ERROR: Failed to load configuration: {e}")
    sys.exit(1)