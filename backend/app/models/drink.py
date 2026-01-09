from sqlalchemy import Column, String, Text, DateTime, Boolean, ForeignKey, Numeric, JSON, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.db.base import Base


class DrinkType(str, enum.Enum):
    """Type of drink - determines how it's created and displayed."""
    SHOT = "shot"  # Pure liquor shot (auto-created from Liquor)
    COCKTAIL = "cocktail"  # Liquor + Soda combination
    BEER = "beer"  # Standalone beer
    WINE = "wine"  # Standalone wine
    SODA = "soda"  # Standalone soda (non-alcoholic)
    OTHER = "other"  # Other drinks


class Drink(Base):
    __tablename__ = "drinks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id"), nullable=False)
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    
    # Drink type for smart categorization
    drink_type = Column(SQLEnum(DrinkType), nullable=True, default=DrinkType.OTHER)
    
    # Liquor + Soda references for cocktails
    liquor_id = Column(UUID(as_uuid=True), ForeignKey("liquors.id"), nullable=True, index=True)
    soda_id = Column(UUID(as_uuid=True), ForeignKey("sodas.id"), nullable=True, index=True)
    
    # Legacy category fields (kept for backward compatibility)
    category = Column(String, nullable=True)  # Legacy: e.g., 'beer', 'cocktail', 'shot', 'wine'
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True, index=True)
    subcategory_id = Column(UUID(as_uuid=True), ForeignKey("subcategories.id"), nullable=True, index=True)
    
    # Display
    image_url = Column(String, nullable=True)
    brand_name = Column(String, nullable=True)  # Brand name for reference
    brand_colors = Column(JSON, nullable=True)  # Brand color palette
    brand_fonts = Column(JSON, nullable=True)  # Brand typography
    
    # Status
    is_available = Column(Boolean, default=True, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    club = relationship("Club", back_populates="drinks")
    liquor = relationship("Liquor", back_populates="drinks", foreign_keys=[liquor_id])
    soda = relationship("Soda", back_populates="drinks", foreign_keys=[soda_id])
    category_obj = relationship("Category", back_populates="drinks", foreign_keys=[category_id])
    subcategory_obj = relationship("Subcategory", back_populates="drinks", foreign_keys=[subcategory_id])
    order_items = relationship("OrderItem", back_populates="drink")
    drink_lists = relationship("DrinkList", secondary="drink_list_drinks", back_populates="drinks")

