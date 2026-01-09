from pydantic import BaseModel, field_validator, model_validator
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from uuid import UUID
from enum import Enum


class DrinkTypeEnum(str, Enum):
    """Type of drink."""
    SHOT = "shot"
    COCKTAIL = "cocktail"
    BEER = "beer"
    WINE = "wine"
    SODA = "soda"
    OTHER = "other"


class DrinkBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: Decimal
    drink_type: Optional[DrinkTypeEnum] = None
    category: Optional[str] = None  # Legacy: text category name
    category_id: Optional[str] = None  # FK to categories table
    image_url: Optional[str] = None
    brand_name: Optional[str] = None
    brand_colors: Optional[list] = None
    brand_fonts: Optional[list] = None
    is_available: bool = True


class DrinkCreate(DrinkBase):
    club_id: str
    liquor_id: Optional[str] = None
    soda_id: Optional[str] = None


class DrinkUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[Decimal] = None
    drink_type: Optional[DrinkTypeEnum] = None
    category: Optional[str] = None  # Legacy: text category name
    category_id: Optional[str] = None  # FK to categories table
    liquor_id: Optional[str] = None
    soda_id: Optional[str] = None
    image_url: Optional[str] = None
    is_available: Optional[bool] = None


class DrinkResponse(DrinkBase):
    id: str
    club_id: str
    liquor_id: Optional[str] = None
    soda_id: Optional[str] = None
    liquor_name: Optional[str] = None  # Resolved from liquor relationship
    soda_name: Optional[str] = None  # Resolved from soda relationship
    category_name: Optional[str] = None  # Resolved category name from category_id
    category_icon: Optional[str] = None  # Resolved category icon
    created_at: datetime
    updated_at: Optional[datetime] = None

    @model_validator(mode='before')
    @classmethod
    def convert_uuids(cls, data):
        """Convert UUID objects to strings for id, club_id, and category_id fields"""
        uuid_fields = ['id', 'club_id', 'category_id', 'subcategory_id', 'liquor_id', 'soda_id']
        
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
            if hasattr(data, 'category_obj') and data.category_obj:
                result['category_name'] = data.category_obj.name
                result['category_icon'] = data.category_obj.icon
            elif hasattr(data, 'category') and data.category:
                result['category_name'] = data.category
            
            # Resolve liquor and soda names from relationships
            if hasattr(data, 'liquor') and data.liquor:
                result['liquor_name'] = data.liquor.name
            if hasattr(data, 'soda') and data.soda:
                result['soda_name'] = data.soda.name
            
            # Merge with original data if it's a dict-like object
            if isinstance(data, dict):
                data.update(result)
                return data
            # Otherwise, create a new dict with all attributes
            if hasattr(data, '__dict__'):
                converted = {}
                for k, v in data.__dict__.items():
                    if k.startswith('_'):
                        continue
                    if k in uuid_fields:
                        converted[k] = str(v) if isinstance(v, UUID) else v
                    else:
                        converted[k] = v
                # Add resolved category info
                if hasattr(data, 'category_obj') and data.category_obj:
                    converted['category_name'] = data.category_obj.name
                    converted['category_icon'] = data.category_obj.icon
                elif hasattr(data, 'category') and data.category:
                    converted['category_name'] = data.category
                # Add resolved liquor/soda names
                if hasattr(data, 'liquor') and data.liquor:
                    converted['liquor_name'] = data.liquor.name
                if hasattr(data, 'soda') and data.soda:
                    converted['soda_name'] = data.soda.name
                return converted
        return data

    class Config:
        from_attributes = True
        json_encoders = {
            Decimal: lambda v: float(v)
        }


class Drink(DrinkResponse):
    pass


# Cocktail creation (Liquor + Soda combination)
class CocktailCreate(BaseModel):
    """Schema for creating a cocktail from liquor + soda."""
    club_id: str
    liquor_id: str
    soda_id: str
    name: Optional[str] = None  # Auto-generated if not provided: "Liquor + Soda"
    price: Optional[Decimal] = None  # Auto-calculated if not provided
    description: Optional[str] = None
    image_url: Optional[str] = None


class CocktailBulkCreate(BaseModel):
    """Schema for bulk creating cocktails from selected liquors and sodas."""
    club_id: str
    liquor_ids: List[str]  # List of liquor IDs to combine
    soda_ids: List[str]  # List of soda IDs to combine
    price_markup: Decimal = Decimal("2.00")  # Default markup over shot price


class CocktailPreview(BaseModel):
    """Preview of a cocktail before creation."""
    liquor_id: str
    liquor_name: str
    soda_id: str
    soda_name: str
    suggested_name: str
    suggested_price: float
    liquor_image_url: Optional[str] = None


class CocktailPreviewResponse(BaseModel):
    """Response with previews of all possible cocktail combinations."""
    cocktails: List[CocktailPreview]
    total_count: int

