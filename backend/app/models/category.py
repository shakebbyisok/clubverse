from sqlalchemy import Column, String, Text, DateTime, Boolean, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.base import Base


# Default system categories - shared across all clubs
SYSTEM_CATEGORIES = [
    {"name": "Cocktails", "description": "Mixed drinks and cocktails", "display_order": 0},
    {"name": "Beers", "description": "Draft and bottled beers", "display_order": 1},
    {"name": "Wines", "description": "Red, white, and sparkling wines", "display_order": 2},
    {"name": "Shots", "description": "Shot glasses and shooters", "display_order": 3},
    {"name": "Sodas", "description": "Soft drinks and mixers", "display_order": 4},
    {"name": "Spirits", "description": "Premium spirits and liquors", "display_order": 5},
    {"name": "Non-Alcoholic", "description": "Mocktails and alcohol-free drinks", "display_order": 6},
]


class Category(Base):
    """
    Drink category (e.g., 'Cocktails', 'Beers', 'Wines').
    
    Categories can be:
    - System categories (is_system=True, club_id=None): Predefined, shared across all clubs
    - Custom categories (is_system=False, club_id=<uuid>): Created by club owners
    """
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id"), nullable=True, index=True)  # Nullable for system categories
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    icon = Column(String(10), nullable=True)  # Emoji icon for category
    display_order = Column(Integer, default=0, nullable=False)
    is_system = Column(Boolean, default=False, nullable=False, index=True)  # True for predefined system categories
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    club = relationship("Club", back_populates="categories")
    subcategories = relationship("Subcategory", back_populates="category", cascade="all, delete-orphan", order_by="Subcategory.display_order")
    drinks = relationship("Drink", back_populates="category_obj")


class Subcategory(Base):
    """Subcategory within a category (e.g., 'Cocktails', 'Shots', 'Beers')"""
    __tablename__ = "subcategories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    display_order = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    category = relationship("Category", back_populates="subcategories")
    drinks = relationship("Drink", back_populates="subcategory_obj")

