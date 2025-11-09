from pydantic import BaseModel, model_validator
from typing import List, Optional
from datetime import datetime
from decimal import Decimal
from uuid import UUID
from app.models.order import OrderStatus, PaymentMethod


class OrderItemBase(BaseModel):
    drink_id: str
    quantity: int
    price_at_purchase: Decimal


class OrderItemResponse(OrderItemBase):
    id: str
    drink_name: Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def convert_uuids(cls, data):
        """Convert UUID objects to strings for id and drink_id fields"""
        if isinstance(data, dict):
            if 'id' in data and isinstance(data['id'], UUID):
                data['id'] = str(data['id'])
            if 'drink_id' in data and isinstance(data['drink_id'], UUID):
                data['drink_id'] = str(data['drink_id'])
        elif hasattr(data, 'id') or hasattr(data, 'drink_id'):
            # Handle SQLAlchemy model instances
            result = {}
            for key in ['id', 'drink_id', 'quantity', 'price_at_purchase']:
                if hasattr(data, key):
                    value = getattr(data, key)
                    if isinstance(value, UUID):
                        result[key] = str(value)
                    else:
                        result[key] = value
            return result
        return data

    class Config:
        from_attributes = True


class OrderItem(OrderItemResponse):
    pass


class OrderBase(BaseModel):
    club_id: str
    items: List[OrderItemBase]


class OrderCreate(OrderBase):
    payment_method: PaymentMethod = PaymentMethod.CARD


class OrderResponse(BaseModel):
    id: str
    customer_id: str
    club_id: str
    club_name: Optional[str] = None
    total_amount: Decimal
    payment_method: PaymentMethod
    status: OrderStatus
    qr_code: Optional[str] = None
    payment_intent_id: Optional[str] = None
    items: List[OrderItemResponse]
    created_at: datetime
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    @model_validator(mode='before')
    @classmethod
    def convert_uuids(cls, data):
        """Convert UUID objects to strings for id, customer_id, and club_id fields"""
        if isinstance(data, dict):
            for field in ['id', 'customer_id', 'club_id']:
                if field in data and isinstance(data[field], UUID):
                    data[field] = str(data[field])
            # Handle items list if present
            if 'items' in data and isinstance(data['items'], list):
                for item in data['items']:
                    if isinstance(item, dict):
                        if 'id' in item and isinstance(item['id'], UUID):
                            item['id'] = str(item['id'])
                        if 'drink_id' in item and isinstance(item['drink_id'], UUID):
                            item['drink_id'] = str(item['drink_id'])
        elif hasattr(data, 'id') or hasattr(data, 'customer_id') or hasattr(data, 'club_id'):
            # Handle SQLAlchemy model instances
            result = {}
            for key in ['id', 'customer_id', 'club_id', 'total_amount', 'payment_method', 
                       'status', 'qr_code', 'payment_intent_id', 'created_at', 'updated_at', 'completed_at']:
                if hasattr(data, key):
                    value = getattr(data, key)
                    if isinstance(value, UUID):
                        result[key] = str(value)
                    else:
                        result[key] = value
            # Don't include items here - they'll be handled separately in the endpoint
            return result
        return data

    class Config:
        from_attributes = True


class Order(OrderResponse):
    pass


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


class QRScanRequest(BaseModel):
    qr_code: str

