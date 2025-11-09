from pydantic import BaseModel, EmailStr, model_validator, field_validator
from typing import Optional, Any
from datetime import datetime
from uuid import UUID
from app.models.user import UserRole


class UserBase(BaseModel):
    email: EmailStr
    phone: Optional[str] = None
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str
    role: UserRole = UserRole.CUSTOMER


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: str
    role: UserRole
    is_active: bool
    created_at: datetime

    @model_validator(mode='before')
    @classmethod
    def convert_uuid_fields(cls, data: Any) -> Any:
        # Handle SQLAlchemy model instance
        if hasattr(data, 'id') and isinstance(data.id, UUID):
            data.id = str(data.id)
        # Handle dict
        elif isinstance(data, dict) and 'id' in data:
            if isinstance(data['id'], UUID):
                data['id'] = str(data['id'])
        return data

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class User(UserResponse):
    pass
