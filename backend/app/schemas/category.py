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
    display_order: int = 0


class CategoryCreate(CategoryBase):
    pass


class CategoryResponse(CategoryBase):
    id: str
    club_id: str
    is_active: bool
    subcategories: List[SubcategoryResponse] = []
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CategoryTreeResponse(BaseModel):
    """Full category tree with subcategories"""
    categories: List[CategoryResponse]

    class Config:
        from_attributes = True

