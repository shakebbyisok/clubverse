"""
Soda model - mixers that can be combined with liquors to create cocktails.
"""
from sqlalchemy import Column, String, Text, DateTime, Boolean, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.base import Base


class Soda(Base):
    """
    Mixer/soda that can be combined with liquors to create cocktails.
    
    Examples: Coca-Cola, Tonic Water, Red Bull, Sprite, Orange Juice
    """
    __tablename__ = "sodas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id"), nullable=False, index=True)
    
    # Basic info
    name = Column(String(100), nullable=False, index=True)  # e.g., "Coca-Cola", "Tonic Water"
    brand_name = Column(String(100), nullable=True)  # Brand for logo resolution
    description = Column(Text, nullable=True)
    
    # Pricing
    price = Column(Numeric(10, 2), default=0, nullable=False)  # Price if sold standalone
    price_addon = Column(Numeric(10, 2), default=0, nullable=False)  # Extra cost when mixed (e.g., Red Bull +$2)
    
    # Display
    image_url = Column(String(500), nullable=True)
    display_order = Column(Numeric, default=0)
    
    # Status
    is_available = Column(Boolean, default=True, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    club = relationship("Club", back_populates="sodas")
    drinks = relationship("Drink", back_populates="soda", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Soda(name='{self.name}', price={self.price}, addon={self.price_addon})>"

