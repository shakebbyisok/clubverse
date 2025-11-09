from sqlalchemy import Column, String, Text, DateTime, Boolean, ForeignKey, Numeric, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.base import Base


class Club(Base):
    __tablename__ = "clubs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    formatted_address = Column(String, nullable=True)  # Full address from Google Maps
    latitude = Column(Numeric(10, 7), nullable=True)  # -90 to 90
    longitude = Column(Numeric(10, 7), nullable=True)  # -180 to 180
    place_id = Column(String, nullable=True)  # Google Place ID for future use
    logo_url = Column(String, nullable=True)
    logo_settings = Column(JSON, nullable=True)  # { width, height, x, y } for positioning
    cover_image_url = Column(String, nullable=True)
    stripe_account_id = Column(String, nullable=True)  # For future Stripe Connect
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    owner = relationship("User", back_populates="owned_clubs", foreign_keys=[owner_id])
    drinks = relationship("Drink", back_populates="club", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="club")
    bartenders = relationship("Bartender", back_populates="club", cascade="all, delete-orphan")
    drink_lists = relationship("DrinkList", secondary="club_drink_lists", back_populates="clubs")

