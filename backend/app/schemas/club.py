from pydantic import BaseModel, model_validator
from typing import Optional, Any
from datetime import datetime
from uuid import UUID


class ClubBase(BaseModel):
    name: str
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    formatted_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    place_id: Optional[str] = None
    logo_url: Optional[str] = None
    logo_settings: Optional[dict] = None  # { width, height, x, y }
    cover_image_url: Optional[str] = None


class ClubCreate(ClubBase):
    pass


class ClubUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    formatted_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    place_id: Optional[str] = None
    logo_url: Optional[str] = None  # Can be base64 data URL or regular URL
    logo_settings: Optional[dict] = None  # { width, height, x, y }
    cover_image_url: Optional[str] = None
    is_active: Optional[bool] = None


class ClubResponse(ClubBase):
    id: str
    owner_id: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    @model_validator(mode='before')
    @classmethod
    def convert_uuid_fields(cls, data: Any) -> Any:
        # Handle SQLAlchemy model instance
        if hasattr(data, 'id'):
            if isinstance(data.id, UUID):
                data.id = str(data.id)
        if hasattr(data, 'owner_id'):
            if isinstance(data.owner_id, UUID):
                data.owner_id = str(data.owner_id)
        # Handle dict
        if isinstance(data, dict):
            if 'id' in data and isinstance(data['id'], UUID):
                data['id'] = str(data['id'])
            if 'owner_id' in data and isinstance(data['owner_id'], UUID):
                data['owner_id'] = str(data['owner_id'])
        return data

    class Config:
        from_attributes = True


class Club(ClubResponse):
    pass


# Analytics schemas
class HourlyActivity(BaseModel):
    hour: int
    orders: int
    revenue: float


class OrdersByStatus(BaseModel):
    pending: int
    paid: int
    preparing: int
    ready: int
    completed: int
    cancelled: int


class TopDrink(BaseModel):
    id: str
    name: str
    count: int
    revenue: float
    image_url: Optional[str] = None


class RecentOrder(BaseModel):
    id: str
    customer_name: Optional[str] = None
    total_amount: float
    status: str
    payment_method: str
    items_count: int
    created_at: datetime


class ClubAnalytics(BaseModel):
    # Summary stats
    today_revenue: float
    today_orders: int
    week_revenue: float
    week_orders: int
    pending_orders: int
    active_bartenders: int
    total_drinks: int
    
    # Charts data
    orders_by_status: OrdersByStatus
    hourly_activity: list[HourlyActivity]
    top_drinks: list[TopDrink]
    recent_orders: list[RecentOrder]
    
    # Comparison percentages
    revenue_change_percent: float
    orders_change_percent: float

