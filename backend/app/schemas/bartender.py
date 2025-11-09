from pydantic import BaseModel, ConfigDict, field_serializer
from typing import Optional
from datetime import datetime
from uuid import UUID


class BartenderBase(BaseModel):
    club_id: UUID


class BartenderCreate(BaseModel):
    club_id: UUID
    email: str  # Email for the bartender user
    password: str  # Password for the bartender user
    full_name: Optional[str] = None  # Full name of the bartender


class BartenderResponse(BaseModel):
    id: UUID
    user_id: UUID
    club_id: UUID
    user_name: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    # Serialize UUIDs as strings for JSON
    @field_serializer('id', 'user_id', 'club_id')
    def serialize_uuid(self, value: UUID) -> str:
        return str(value)


class Bartender(BartenderResponse):
    pass

