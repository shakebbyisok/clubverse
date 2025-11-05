from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class BartenderBase(BaseModel):
    club_id: str


class BartenderCreate(BartenderBase):
    user_email: str  # Email of user to add as bartender


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

