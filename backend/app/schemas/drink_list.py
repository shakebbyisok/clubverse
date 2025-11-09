from pydantic import BaseModel, model_validator
from typing import Optional, List, Any
from datetime import datetime
from uuid import UUID


class DrinkListBase(BaseModel):
    name: str
    description: Optional[str] = None


class DrinkListCreate(DrinkListBase):
    drink_ids: Optional[List[str]] = None  # Optional list of drink IDs to add


class DrinkListUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    drink_ids: Optional[List[str]] = None  # Replace all drinks in list


class DrinkListResponse(DrinkListBase):
    id: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    drink_count: Optional[int] = None  # Number of drinks in the list

    @model_validator(mode='before')
    @classmethod
    def convert_uuid_fields(cls, data: Any) -> Any:
        # Handle SQLAlchemy model instance
        if hasattr(data, 'id'):
            if isinstance(data.id, UUID):
                data.id = str(data.id)
        # Handle dict
        if isinstance(data, dict):
            if 'id' in data and isinstance(data['id'], UUID):
                data['id'] = str(data['id'])
        return data

    class Config:
        from_attributes = True


class DrinkList(DrinkListResponse):
    pass


class DrinkListWithDrinks(DrinkListResponse):
    drinks: List[Any] = []  # List of drink objects

