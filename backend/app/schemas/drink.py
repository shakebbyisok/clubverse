from pydantic import BaseModel, field_validator, model_validator
from typing import Optional
from datetime import datetime
from decimal import Decimal
from uuid import UUID


class DrinkBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: Decimal
    category: Optional[str] = None
    image_url: Optional[str] = None
    brand_name: Optional[str] = None
    brand_colors: Optional[list] = None
    brand_fonts: Optional[list] = None
    is_available: bool = True


class DrinkCreate(DrinkBase):
    club_id: str


class DrinkUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[Decimal] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    is_available: Optional[bool] = None


class DrinkResponse(DrinkBase):
    id: str
    club_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    @model_validator(mode='before')
    @classmethod
    def convert_uuids(cls, data):
        """Convert UUID objects to strings for id and club_id fields"""
        if isinstance(data, dict):
            if 'id' in data and isinstance(data['id'], UUID):
                data['id'] = str(data['id'])
            if 'club_id' in data and isinstance(data['club_id'], UUID):
                data['club_id'] = str(data['club_id'])
        elif hasattr(data, 'id') or hasattr(data, 'club_id'):
            # Handle SQLAlchemy model instances - convert to dict with string UUIDs
            result = {}
            for key in ['id', 'club_id']:
                if hasattr(data, key):
                    value = getattr(data, key)
                    result[key] = str(value) if isinstance(value, UUID) else value
                else:
                    # Get from __dict__ if available
                    if hasattr(data, '__dict__') and key in data.__dict__:
                        value = data.__dict__[key]
                        result[key] = str(value) if isinstance(value, UUID) else value
            # Merge with original data if it's a dict-like object
            if isinstance(data, dict):
                data.update(result)
                return data
            # Otherwise, create a new dict with all attributes
            if hasattr(data, '__dict__'):
                converted = {k: str(v) if isinstance(v, UUID) and k in ['id', 'club_id'] else v 
                           for k, v in data.__dict__.items()}
                return converted
        return data

    class Config:
        from_attributes = True
        json_encoders = {
            Decimal: lambda v: float(v)
        }


class Drink(DrinkResponse):
    pass

