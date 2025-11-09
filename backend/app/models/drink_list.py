from sqlalchemy import Column, String, Text, DateTime, Boolean, ForeignKey, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.base import Base

# Junction table for many-to-many relationship between clubs and drink lists
club_drink_lists = Table(
    'club_drink_lists',
    Base.metadata,
    Column('club_id', UUID(as_uuid=True), ForeignKey('clubs.id'), primary_key=True),
    Column('drink_list_id', UUID(as_uuid=True), ForeignKey('drink_lists.id'), primary_key=True),
)

# Junction table for many-to-many relationship between drink lists and drinks
drink_list_drinks = Table(
    'drink_list_drinks',
    Base.metadata,
    Column('drink_list_id', UUID(as_uuid=True), ForeignKey('drink_lists.id'), primary_key=True),
    Column('drink_id', UUID(as_uuid=True), ForeignKey('drinks.id'), primary_key=True),
)


class DrinkList(Base):
    __tablename__ = "drink_lists"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    clubs = relationship("Club", secondary=club_drink_lists, back_populates="drink_lists")
    drinks = relationship("Drink", secondary=drink_list_drinks, back_populates="drink_lists")

