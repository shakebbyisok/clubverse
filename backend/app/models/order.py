from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Numeric, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.db.base import Base


class PaymentMethod(str, enum.Enum):
    CARD = "card"
    CASH = "cash"


class OrderStatus(str, enum.Enum):
    PENDING_PAYMENT = "pending_payment"
    PAID = "paid"
    PREPARING = "preparing"
    READY = "ready"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Order(Base):
    __tablename__ = "orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    club_id = Column(UUID(as_uuid=True), ForeignKey("clubs.id"), nullable=False)
    total_amount = Column(Numeric(10, 2), nullable=False)
    payment_method = Column(Enum(PaymentMethod), nullable=False, default=PaymentMethod.CARD)
    status = Column(Enum(OrderStatus), nullable=False, default=OrderStatus.PENDING_PAYMENT)
    payment_intent_id = Column(String, nullable=True, unique=True, index=True)
    qr_code = Column(String, unique=True, nullable=True, index=True)  # UUID as string
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    customer = relationship("User", back_populates="orders")
    club = relationship("Club", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False)
    drink_id = Column(UUID(as_uuid=True), ForeignKey("drinks.id"), nullable=False)
    quantity = Column(Numeric(10, 0), nullable=False)  # Integer stored as Numeric
    price_at_purchase = Column(Numeric(10, 2), nullable=False)  # Snapshot of price

    # Relationships
    order = relationship("Order", back_populates="items")
    drink = relationship("Drink", back_populates="order_items")

