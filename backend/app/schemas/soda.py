"""
Soda schemas for API validation and serialization.
"""
from pydantic import BaseModel, model_validator
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from uuid import UUID


class SodaBase(BaseModel):
    """Base soda schema with common fields."""
    name: str
    brand_name: Optional[str] = None
    description: Optional[str] = None
    price: Decimal = Decimal("0")  # Price if sold standalone
    price_addon: Decimal = Decimal("0")  # Extra cost when mixed (e.g., Red Bull +$2)
    image_url: Optional[str] = None
    display_order: Optional[int] = 0
    is_available: bool = True


class SodaCreate(SodaBase):
    """Schema for creating a new soda."""
    club_id: str


class SodaUpdate(BaseModel):
    """Schema for updating a soda."""
    name: Optional[str] = None
    brand_name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[Decimal] = None
    price_addon: Optional[Decimal] = None
    image_url: Optional[str] = None
    display_order: Optional[int] = None
    is_available: Optional[bool] = None


class SodaResponse(SodaBase):
    """Schema for soda response with all fields."""
    id: str
    club_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

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


# Batch operations
class BatchSodaCreate(BaseModel):
    """Single soda for batch creation."""
    name: str
    brand_name: Optional[str] = None
    price: float = 0
    price_addon: float = 0
    image_url: Optional[str] = None


class BatchSodaRequest(BaseModel):
    """Request for batch soda creation."""
    sodas: List[BatchSodaCreate]

