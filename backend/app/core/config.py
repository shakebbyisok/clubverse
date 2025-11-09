from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    SUPABASE_DB_URL: Optional[str] = None
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours (24 * 60 minutes)
    
    # Stripe
    STRIPE_SECRET_KEY: str
    STRIPE_PUBLISHABLE_KEY: str
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    
    # OpenRouter
    OPENROUTER_KEY: Optional[str] = None
    
    # Remove.bg
    REMOVEBG_API_KEY: Optional[str] = None
    
    # Google Maps
    GOOGLE_MAPS_KEY: Optional[str] = None
    
    # App
    ENVIRONMENT: str = "development"
    API_V1_PREFIX: str = "/api/v1"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

