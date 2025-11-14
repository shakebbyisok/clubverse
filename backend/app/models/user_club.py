from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.base import Base


class UserClub(Base):
    """Junction table for user-club relationships with points and stats."""
    __tablename__ = "user_clubs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id"), nullable=False, index=True)
    
    # Points and stats
    points = Column(Integer, default=0, nullable=False)
    total_orders = Column(Integer, default=0, nullable=False)
    total_spent = Column(Integer, default=0, nullable=False)  # In cents
    
    # Timestamps
    joined_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Unique constraint: one record per user-club pair
    __table_args__ = (
        UniqueConstraint('user_id', 'club_id', name='uq_user_club'),
    )

    # Relationships
    user = relationship("User", back_populates="user_clubs")
    club = relationship("Club", back_populates="user_clubs")

