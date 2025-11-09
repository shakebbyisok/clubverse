from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class BartenderBase(BaseModel):
    club_id: str


class BartenderCreate(BartenderBase):
    email: str  # Email for the bartender user
    password: str  # Password for the bartender user
    full_name: Optional[str] = None  # Full name of the bartender


class BartenderResponse(BartenderBase):
    id: str
    user_id: str
    user_name: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Bartender(BartenderResponse):
    pass

