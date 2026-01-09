"""
Liquor model - base spirits that can be used for shots and cocktails.
"""
from sqlalchemy import Column, String, Text, DateTime, Boolean, ForeignKey, Numeric, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.db.base import Base


class LiquorType(str, enum.Enum):
    """Types of liquor spirits."""
    VODKA = "vodka"
    GIN = "gin"
    RUM = "rum"
    WHISKY = "whisky"
    TEQUILA = "tequila"
    BRANDY = "brandy"
    LIQUEUR = "liqueur"
    OTHER = "other"


class Liquor(Base):
    """
    Base liquor/spirit that serves as an ingredient.
    
    When a liquor is added:
    - A corresponding "Shot" drink is auto-created
    - The liquor becomes available for cocktail combinations with sodas
    """
    __tablename__ = "liquors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id"), nullable=False, index=True)
    
    # Basic info
    name = Column(String(100), nullable=False, index=True)  # e.g., "Absolut", "Jack Daniel's"
    brand_name = Column(String(100), nullable=True)  # Brand for logo resolution
    liquor_type = Column(SQLEnum(LiquorType), nullable=False, default=LiquorType.OTHER)
    description = Column(Text, nullable=True)
    
    # Pricing
    shot_price = Column(Numeric(10, 2), nullable=False)  # Base price for a shot
    
    # Display
    image_url = Column(String(500), nullable=True)
    display_order = Column(Numeric, default=0)
    
    # Status
    is_available = Column(Boolean, default=True, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    club = relationship("Club", back_populates="liquors")
    drinks = relationship("Drink", back_populates="liquor", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Liquor(name='{self.name}', type='{self.liquor_type}', price={self.shot_price})>"

