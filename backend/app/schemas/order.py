from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from decimal import Decimal
from app.models.order import OrderStatus


class OrderItemBase(BaseModel):
    drink_id: str
    quantity: int
    price_at_purchase: Decimal


class OrderItemResponse(OrderItemBase):
    id: str
    drink_name: Optional[str] = None

    class Config:
        from_attributes = True


class OrderItem(OrderItemResponse):
    pass


class OrderBase(BaseModel):
    club_id: str
    items: List[OrderItemBase]


class OrderCreate(OrderBase):
    pass


class OrderResponse(BaseModel):
    id: str
    customer_id: str
    club_id: str
    club_name: Optional[str] = None
    total_amount: Decimal
    status: OrderStatus
    qr_code: Optional[str] = None
    payment_intent_id: Optional[str] = None
    items: List[OrderItemResponse]
    created_at: datetime
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Order(OrderResponse):
    pass


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


class QRScanRequest(BaseModel):
    qr_code: str

