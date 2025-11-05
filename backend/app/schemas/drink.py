from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal


class DrinkBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: Decimal
    category: Optional[str] = None
    image_url: Optional[str] = None
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

    class Config:
        from_attributes = True


class Drink(DrinkResponse):
    pass

