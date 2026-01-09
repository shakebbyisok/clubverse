"""
Liquor schemas for API validation and serialization.
"""
from pydantic import BaseModel, field_validator, model_validator
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from uuid import UUID
from app.models.liquor import LiquorType


class LiquorBase(BaseModel):
    """Base liquor schema with common fields."""
    name: str
    brand_name: Optional[str] = None
    liquor_type: LiquorType = LiquorType.OTHER
    description: Optional[str] = None
    shot_price: Decimal
    image_url: Optional[str] = None
    display_order: Optional[int] = 0
    is_available: bool = True


class LiquorCreate(LiquorBase):
    """Schema for creating a new liquor."""
    club_id: str
    
    # Option to skip auto-creating shot drink
    skip_shot_creation: bool = False


class LiquorUpdate(BaseModel):
    """Schema for updating a liquor."""
    name: Optional[str] = None
    brand_name: Optional[str] = None
    liquor_type: Optional[LiquorType] = None
    description: Optional[str] = None
    shot_price: Optional[Decimal] = None
    image_url: Optional[str] = None
    display_order: Optional[int] = None
    is_available: Optional[bool] = None


class LiquorResponse(LiquorBase):
    """Schema for liquor response with all fields."""
    id: str
    club_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Related shot drink info (if exists)
    shot_drink_id: Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def convert_uuids(cls, data):
        """Convert UUID objects to strings."""
        uuid_fields = ['id', 'club_id']
        
        if isinstance(data, dict):
            for field in uuid_fields:
                if field in data and isinstance(data[field], UUID):
                    data[field] = str(data[field])
        elif hasattr(data, 'id'):
            result = {}
            for key in uuid_fields:
                if hasattr(data, key):
                    value = getattr(data, key)
                    result[key] = str(value) if isinstance(value, UUID) else value
            
            if hasattr(data, '__dict__'):
                converted = {}
                for k, v in data.__dict__.items():
                    if k.startswith('_'):
                        continue
                    if k in uuid_fields:
                        converted[k] = str(v) if isinstance(v, UUID) else v
                    else:
                        converted[k] = v
                return converted
        return data

    class Config:
        from_attributes = True
        json_encoders = {
            Decimal: lambda v: float(v)
        }


class LiquorWithShot(LiquorResponse):
    """Liquor response that includes the auto-created shot drink."""
    shot_drink: Optional[dict] = None


# Batch operations
class BatchLiquorCreate(BaseModel):
    """Single liquor for batch creation."""
    name: str
    brand_name: Optional[str] = None
    liquor_type: LiquorType = LiquorType.OTHER
    shot_price: float
    image_url: Optional[str] = None


class BatchLiquorRequest(BaseModel):
    """Request for batch liquor creation."""
    liquors: List[BatchLiquorCreate]

