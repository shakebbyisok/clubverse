from pydantic import BaseModel, model_validator
from typing import Optional, Any
from datetime import datetime
from uuid import UUID
from app.schemas.club import ClubResponse


class UserClubBase(BaseModel):
    points: int = 0
    total_orders: int = 0
    total_spent: int = 0  # In cents


class UserClubCreate(BaseModel):
    club_id: str


class UserClubResponse(UserClubBase):
    id: str
    user_id: str
    club_id: str
    joined_at: datetime
    updated_at: Optional[datetime] = None

    @model_validator(mode='before')
    @classmethod
    def convert_uuid_fields(cls, data: Any) -> Any:
        # Handle SQLAlchemy model instance
        if hasattr(data, 'id'):
            if isinstance(data.id, UUID):
                data.id = str(data.id)
        if hasattr(data, 'user_id'):
            if isinstance(data.user_id, UUID):
                data.user_id = str(data.user_id)
        if hasattr(data, 'club_id'):
            if isinstance(data.club_id, UUID):
                data.club_id = str(data.club_id)
        # Handle dict
        if isinstance(data, dict):
            if 'id' in data and isinstance(data['id'], UUID):
                data['id'] = str(data['id'])
            if 'user_id' in data and isinstance(data['user_id'], UUID):
                data['user_id'] = str(data['user_id'])
            if 'club_id' in data and isinstance(data['club_id'], UUID):
                data['club_id'] = str(data['club_id'])
        return data

    class Config:
        from_attributes = True


class UserClubWithClub(UserClubResponse):
    """UserClub with nested club information."""
    club: ClubResponse

