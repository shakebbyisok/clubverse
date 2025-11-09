from sqlalchemy import Column, String, Text, DateTime, Boolean, ForeignKey, Numeric, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.base import Base


class Drink(Base):
    __tablename__ = "drinks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id"), nullable=False)
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    category = Column(String, nullable=True)  # e.g., 'beer', 'cocktail', 'shot', 'wine'
    image_url = Column(String, nullable=True)
    brand_name = Column(String, nullable=True)  # Brand name for reference
    brand_colors = Column(JSON, nullable=True)  # Brand color palette
    brand_fonts = Column(JSON, nullable=True)  # Brand typography
    is_available = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    club = relationship("Club", back_populates="drinks")
    order_items = relationship("OrderItem", back_populates="drink")
    drink_lists = relationship("DrinkList", secondary="drink_list_drinks", back_populates="drinks")

