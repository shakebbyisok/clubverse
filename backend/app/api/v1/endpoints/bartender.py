from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.db.base import get_db
from app.models.user import User
from app.models.club import Club
from app.models.drink import Drink
from app.models.order import Order, OrderItem, OrderStatus
from app.models.bartender import Bartender
from app.schemas.order import OrderResponse, OrderItemResponse, OrderStatusUpdate, QRScanRequest
from app.core.dependencies import get_current_bartender

router = APIRouter()


@router.get("/orders", response_model=List[OrderResponse])
def get_bartender_orders(
    status_filter: OrderStatus = None,
    current_user: User = Depends(get_current_bartender),
    db: Session = Depends(get_db)
):
    """Get orders for the bartender's club."""
    # Get bartender's club
    bartender = db.query(Bartender).filter(
        Bartender.user_id == current_user.id,
        Bartender.is_active == True
    ).first()
    
    if not bartender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bartender profile not found",
        )
    
    # Query orders for this club
    query = db.query(Order).filter(Order.club_id == bartender.club_id)
    
    if status_filter:
        query = query.filter(Order.status == status_filter)
    else:
        # Default: show paid, preparing, and ready orders
        query = query.filter(Order.status.in_([
            OrderStatus.PAID,
            OrderStatus.PREPARING,
            OrderStatus.READY
        ]))
    
    orders = query.order_by(Order.created_at.asc()).all()
    
    # Format response with drink names
    result = []
    for order in orders:
        order_dict = OrderResponse.model_validate(order).model_dump()
        items = []
        for item in order.items:
            drink = db.query(Drink).filter(Drink.id == item.drink_id).first()
            item_dict = OrderItemResponse.model_validate(item).model_dump()
            item_dict["drink_name"] = drink.name if drink else None
            items.append(item_dict)
        order_dict["items"] = items
        order_dict["club_name"] = order.club.name if order.club else None
        result.append(OrderResponse(**order_dict))
    
    return result


@router.post("/scan", response_model=OrderResponse)
def scan_qr_code(
    qr_data: QRScanRequest,
    current_user: User = Depends(get_current_bartender),
    db: Session = Depends(get_db)
):
    """Scan QR code and validate order."""
    # Get bartender's club
    bartender = db.query(Bartender).filter(
        Bartender.user_id == current_user.id,
        Bartender.is_active == True
    ).first()
    
    if not bartender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bartender profile not found",
        )
    
    # Find order by QR code
    order = db.query(Order).filter(
        Order.qr_code == qr_data.qr_code,
        Order.club_id == bartender.club_id
    ).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found or QR code invalid",
        )
    
    # Verify order is paid
    if order.status != OrderStatus.PAID:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order status is {order.status.value}, cannot be processed",
        )
    
    # Update order status to preparing
    order.status = OrderStatus.PREPARING
    db.commit()
    db.refresh(order)
    
    # Format response
    order_dict = OrderResponse.model_validate(order).model_dump()
    items = []
    for item in order.items:
        drink = db.query(Drink).filter(Drink.id == item.drink_id).first()
        item_dict = OrderItemResponse.model_validate(item).model_dump()
        item_dict["drink_name"] = drink.name if drink else None
        items.append(item_dict)
    order_dict["items"] = items
    order_dict["club_name"] = order.club.name if order.club else None
    
    return OrderResponse(**order_dict)


@router.put("/orders/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: str,
    status_update: OrderStatusUpdate,
    current_user: User = Depends(get_current_bartender),
    db: Session = Depends(get_db)
):
    """Update order status (bartender only)."""
    from uuid import UUID
    try:
        order_uuid = UUID(order_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid order ID format",
        )
    # Get bartender's club
    bartender = db.query(Bartender).filter(
        Bartender.user_id == current_user.id,
        Bartender.is_active == True
    ).first()
    
    if not bartender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bartender profile not found",
        )
    
    # Find order
    order = db.query(Order).filter(
        Order.id == order_uuid,
        Order.club_id == bartender.club_id
    ).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    
    # Validate status transition
    valid_transitions = {
        OrderStatus.PAID: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
        OrderStatus.PREPARING: [OrderStatus.READY, OrderStatus.CANCELLED],
        OrderStatus.READY: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
    }
    
    if status_update.status not in valid_transitions.get(order.status, []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition from {order.status.value} to {status_update.status.value}",
        )
    
    # Update status
    order.status = status_update.status
    
    if status_update.status == OrderStatus.COMPLETED:
        order.completed_at = datetime.utcnow()
    
    db.commit()
    db.refresh(order)
    
    # Format response
    order_dict = OrderResponse.model_validate(order).model_dump()
    items = []
    for item in order.items:
        drink = db.query(Drink).filter(Drink.id == item.drink_id).first()
        item_dict = OrderItemResponse.model_validate(item).model_dump()
        item_dict["drink_name"] = drink.name if drink else None
        items.append(item_dict)
    order_dict["items"] = items
    order_dict["club_name"] = order.club.name if order.club else None
    
    return OrderResponse(**order_dict)

