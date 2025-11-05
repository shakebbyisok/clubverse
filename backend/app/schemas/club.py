from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ClubBase(BaseModel):
    name: str
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    logo_url: Optional[str] = None
    cover_image_url: Optional[str] = None


class ClubCreate(ClubBase):
    pass


class ClubUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    logo_url: Optional[str] = None
    cover_image_url: Optional[str] = None
    is_active: Optional[bool] = None


class ClubResponse(ClubBase):
    id: str
    owner_id: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Club(ClubResponse):
    pass

