from sqlalchemy import Column, String, Enum, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.db.base import Base


class UserRole(str, enum.Enum):
    CUSTOMER = "customer"
    CLUB_OWNER = "club_owner"
    BARTENDER = "bartender"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.CUSTOMER)
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    # Stripe Connect fields
    stripe_account_id = Column(String, nullable=True, unique=True, index=True)
    stripe_account_status = Column(String, nullable=True)  # 'pending', 'active', 'restricted'
    stripe_charges_enabled = Column(Boolean, default=False)
    stripe_payouts_enabled = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    owned_clubs = relationship("Club", back_populates="owner", foreign_keys="Club.owner_id")
    orders = relationship("Order", back_populates="customer")
    bartender_profiles = relationship("Bartender", back_populates="user")

