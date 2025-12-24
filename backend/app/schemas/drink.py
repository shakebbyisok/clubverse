from pydantic import BaseModel, field_validator, model_validator
from typing import Optional
from datetime import datetime
from decimal import Decimal
from uuid import UUID


class DrinkBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: Decimal
    category: Optional[str] = None  # Legacy: text category name
    category_id: Optional[str] = None  # FK to categories table
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
    category: Optional[str] = None  # Legacy: text category name
    category_id: Optional[str] = None  # FK to categories table
    image_url: Optional[str] = None
    is_available: Optional[bool] = None


class DrinkResponse(DrinkBase):
    id: str
    club_id: str
    category_name: Optional[str] = None  # Resolved category name from category_id
    category_icon: Optional[str] = None  # Resolved category icon
    created_at: datetime
    updated_at: Optional[datetime] = None

    @model_validator(mode='before')
    @classmethod
    def convert_uuids(cls, data):
        """Convert UUID objects to strings for id, club_id, and category_id fields"""
        uuid_fields = ['id', 'club_id', 'category_id', 'subcategory_id']
        
        if isinstance(data, dict):
            for field in uuid_fields:
                if field in data and isinstance(data[field], UUID):
                    data[field] = str(data[field])
        elif hasattr(data, 'id') or hasattr(data, 'club_id'):
            # Handle SQLAlchemy model instances - convert to dict with string UUIDs
            result = {}
            for key in uuid_fields:
                if hasattr(data, key):
                    value = getattr(data, key)
                    result[key] = str(value) if isinstance(value, UUID) else value
                elif hasattr(data, '__dict__') and key in data.__dict__:
                    value = data.__dict__[key]
                    result[key] = str(value) if isinstance(value, UUID) else value
            
            # Resolve category name and icon from category_obj relationship
            # Fall back to legacy category field if category_obj is not available
            if hasattr(data, 'category_obj') and data.category_obj:
                result['category_name'] = data.category_obj.name
                result['category_icon'] = data.category_obj.icon
            elif hasattr(data, 'category') and data.category:
                # Fall back to legacy category field if no category_obj
                result['category_name'] = data.category
            
            # Merge with original data if it's a dict-like object
            if isinstance(data, dict):
                data.update(result)
                return data
            # Otherwise, create a new dict with all attributes
            if hasattr(data, '__dict__'):
                converted = {}
                for k, v in data.__dict__.items():
                    if k in uuid_fields:
                        converted[k] = str(v) if isinstance(v, UUID) else v
                    else:
                        converted[k] = v
                # Add resolved category info
                # Fall back to legacy category field if category_obj is not available
                if hasattr(data, 'category_obj') and data.category_obj:
                    converted['category_name'] = data.category_obj.name
                    converted['category_icon'] = data.category_obj.icon
                elif hasattr(data, 'category') and data.category:
                    # Fall back to legacy category field if no category_obj
                    converted['category_name'] = data.category
                return converted
        return data

    class Config:
        from_attributes = True
        json_encoders = {
            Decimal: lambda v: float(v)
        }


class Drink(DrinkResponse):
    pass

