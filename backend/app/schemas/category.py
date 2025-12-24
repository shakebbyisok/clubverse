from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class SubcategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    display_order: int = 0


class SubcategoryCreate(SubcategoryBase):
    pass


class SubcategoryResponse(SubcategoryBase):
    id: str
    category_id: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None  # Emoji icon for category
    display_order: int = 0


class CategoryCreate(CategoryBase):
    pass


class CategoryResponse(CategoryBase):
    id: str
    club_id: Optional[str] = None  # Nullable for system categories
    is_system: bool = False  # True for predefined system categories
    is_active: bool
    subcategories: List[SubcategoryResponse] = []
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CategoryTreeResponse(BaseModel):
    """Full category tree with system and custom categories"""
    system_categories: List[CategoryResponse] = []  # Predefined system categories
    custom_categories: List[CategoryResponse] = []  # Club-specific custom categories

    class Config:
        from_attributes = True

