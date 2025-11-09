from pydantic import BaseModel, model_validator
from typing import Optional, Any
from datetime import datetime
from uuid import UUID


class ClubBase(BaseModel):
    name: str
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    formatted_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    place_id: Optional[str] = None
    logo_url: Optional[str] = None
    logo_settings: Optional[dict] = None  # { width, height, x, y }
    cover_image_url: Optional[str] = None


class ClubCreate(ClubBase):
    pass


class ClubUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    formatted_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    place_id: Optional[str] = None
    logo_url: Optional[str] = None  # Can be base64 data URL or regular URL
    logo_settings: Optional[dict] = None  # { width, height, x, y }
    cover_image_url: Optional[str] = None
    is_active: Optional[bool] = None


class ClubResponse(ClubBase):
    id: str
    owner_id: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    @model_validator(mode='before')
    @classmethod
    def convert_uuid_fields(cls, data: Any) -> Any:
        # Handle SQLAlchemy model instance
        if hasattr(data, 'id'):
            if isinstance(data.id, UUID):
                data.id = str(data.id)
        if hasattr(data, 'owner_id'):
            if isinstance(data.owner_id, UUID):
                data.owner_id = str(data.owner_id)
        # Handle dict
        if isinstance(data, dict):
            if 'id' in data and isinstance(data['id'], UUID):
                data['id'] = str(data['id'])
            if 'owner_id' in data and isinstance(data['owner_id'], UUID):
                data['owner_id'] = str(data['owner_id'])
        return data

    class Config:
        from_attributes = True


class Club(ClubResponse):
    pass

