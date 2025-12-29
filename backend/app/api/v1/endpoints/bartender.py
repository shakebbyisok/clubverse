from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
from datetime import datetime, timedelta, timezone
from app.db.base import get_db
from app.models.user import User
from app.models.club import Club
from app.models.drink import Drink
from app.models.order import Order, OrderItem, OrderStatus, PaymentMethod
from app.models.bartender import Bartender
from app.schemas.order import OrderResponse, OrderItemResponse, OrderStatusUpdate, QRScanRequest
from app.schemas.bartender import BartenderClubInfo
from app.core.dependencies import get_current_bartender

router = APIRouter()


@router.get("/stats")
def get_bartender_stats(
    current_user: User = Depends(get_current_bartender),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get dashboard stats for the bartender."""
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
    
    club = db.query(Club).filter(Club.id == bartender.club_id).first()
    
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Today's orders
    today_orders = db.query(Order).filter(
        Order.club_id == bartender.club_id,
        Order.created_at >= today_start
    ).all()
    
    # Count by status
    pending_count = len([o for o in today_orders if o.status in [OrderStatus.PENDING_PAYMENT, OrderStatus.PAID]])
    preparing_count = len([o for o in today_orders if o.status == OrderStatus.PREPARING])
    ready_count = len([o for o in today_orders if o.status == OrderStatus.READY])
    completed_count = len([o for o in today_orders if o.status == OrderStatus.COMPLETED])
    
    # Revenue today
    paid_orders = [o for o in today_orders if o.status in [OrderStatus.PAID, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.COMPLETED]]
    today_revenue = sum(float(o.total_amount) for o in paid_orders)
    
    # Recent orders (last 5)
    recent_orders = db.query(Order).filter(
        Order.club_id == bartender.club_id,
        Order.status.in_([OrderStatus.PAID, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.PENDING_PAYMENT])
    ).order_by(Order.created_at.desc()).limit(5).all()
    
    recent_list = []
    for order in recent_orders:
        customer = db.query(User).filter(User.id == order.customer_id).first()
        items_count = sum(item.quantity for item in order.items)
        recent_list.append({
            'id': str(order.id),
            'customer_name': customer.full_name if customer else 'Customer',
            'total_amount': float(order.total_amount),
            'status': order.status.value,
            'items_count': items_count,
            'payment_method': order.payment_method.value,
            'created_at': order.created_at.isoformat(),
        })
    
    return {
        'club_name': club.name if club else None,
        'club_city': club.city if club else None,
        'today_orders': len(today_orders),
        'pending_count': pending_count,
        'preparing_count': preparing_count,
        'ready_count': ready_count,
        'completed_count': completed_count,
        'today_revenue': today_revenue,
        'recent_orders': recent_list,
    }


@router.get("/club", response_model=BartenderClubInfo)
def get_my_club(
    current_user: User = Depends(get_current_bartender),
    db: Session = Depends(get_db)
):
    """Get the club information for the current bartender."""
    # Get bartender's active club
    bartender = db.query(Bartender).filter(
        Bartender.user_id == current_user.id,
        Bartender.is_active == True
    ).first()
    
    if not bartender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bartender profile not found or inactive",
        )
    
    # Get club info
    club = db.query(Club).filter(Club.id == bartender.club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found",
        )
    
    return BartenderClubInfo(
        club_id=club.id,
        club_name=club.name,
        club_address=club.formatted_address or club.address,
        club_city=club.city,
        is_active=bartender.is_active,
        created_at=bartender.created_at,
    )


@router.get("/orders", response_model=List[OrderResponse])
def get_bartender_orders(
    status_filter: OrderStatus = None,
    current_user: User = Depends(get_current_bartender),
    db: Session = Depends(get_db)
):
    """Get orders assigned to this bartender only."""
    # Get bartender profile
    bartender = db.query(Bartender).filter(
        Bartender.user_id == current_user.id,
        Bartender.is_active == True
    ).first()
    
    if not bartender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bartender profile not found",
        )
    
    # Query only orders assigned to THIS bartender
    query = db.query(Order).filter(Order.bartender_id == bartender.id)
    
    if status_filter:
        query = query.filter(Order.status == status_filter)
    
    orders = query.order_by(Order.created_at.desc()).all()
    
    # Format response
    result = []
    for order in orders:
        order_dict = {
            'id': str(order.id),
            'customer_id': str(order.customer_id),
            'club_id': str(order.club_id),
            'total_amount': order.total_amount,
            'payment_method': order.payment_method,
            'status': order.status,
            'qr_code': order.qr_code,
            'payment_intent_id': order.payment_intent_id,
            'created_at': order.created_at,
            'updated_at': order.updated_at,
            'completed_at': order.completed_at,
        }
        
        items = []
        for item in order.items:
            drink = db.query(Drink).filter(Drink.id == item.drink_id).first()
            item_dict = {
                'id': str(item.id),
                'drink_id': str(item.drink_id),
                'quantity': item.quantity,
                'price_at_purchase': item.price_at_purchase,
                'drink_name': drink.name if drink else None,
            }
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
    """Scan QR code - assigns order to bartender and returns it for immediate action."""
    # Get bartender profile
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
    
    # Check if order already completed
    if order.status == OrderStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order already completed",
        )
    
    if order.status == OrderStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order was cancelled",
        )
    
    # Assign bartender to order (if not already assigned)
    if not order.bartender_id:
        order.bartender_id = bartender.id
    
    db.commit()
    db.refresh(order)
    
    # Format response - convert UUIDs to strings explicitly
    order_dict = {
        'id': str(order.id),
        'customer_id': str(order.customer_id),
        'club_id': str(order.club_id),
        'total_amount': order.total_amount,
        'payment_method': order.payment_method,
        'status': order.status,
        'qr_code': order.qr_code,
        'payment_intent_id': order.payment_intent_id,
        'created_at': order.created_at,
        'updated_at': order.updated_at,
        'completed_at': order.completed_at,
    }
    
    items = []
    for item in order.items:
        drink = db.query(Drink).filter(Drink.id == item.drink_id).first()
        item_dict = {
            'id': str(item.id),
            'drink_id': str(item.drink_id),
            'quantity': item.quantity,
            'price_at_purchase': item.price_at_purchase,
            'drink_name': drink.name if drink else None,
        }
        items.append(item_dict)
    
    order_dict["items"] = items
    order_dict["club_name"] = order.club.name if order.club else None
    
    return OrderResponse(**order_dict)


@router.post("/orders/{order_id}/given", response_model=OrderResponse)
def mark_order_given(
    order_id: str,
    current_user: User = Depends(get_current_bartender),
    db: Session = Depends(get_db)
):
    """Mark order as given/completed. For cash orders pending payment, also confirms payment."""
    from uuid import UUID
    try:
        order_uuid = UUID(order_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid order ID format",
        )
    
    # Get bartender
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
    
    # Complete the order
    order.status = OrderStatus.COMPLETED
    order.completed_at = datetime.now(timezone.utc)
    
    # Ensure bartender is assigned
    if not order.bartender_id:
        order.bartender_id = bartender.id
    
    db.commit()
    db.refresh(order)
    
    # Format response
    order_dict = {
        'id': str(order.id),
        'customer_id': str(order.customer_id),
        'club_id': str(order.club_id),
        'total_amount': order.total_amount,
        'payment_method': order.payment_method,
        'status': order.status,
        'qr_code': order.qr_code,
        'payment_intent_id': order.payment_intent_id,
        'created_at': order.created_at,
        'updated_at': order.updated_at,
        'completed_at': order.completed_at,
    }
    
    items = []
    for item in order.items:
        drink = db.query(Drink).filter(Drink.id == item.drink_id).first()
        item_dict = {
            'id': str(item.id),
            'drink_id': str(item.drink_id),
            'quantity': item.quantity,
            'price_at_purchase': item.price_at_purchase,
            'drink_name': drink.name if drink else None,
        }
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
    
    # Format response - convert UUIDs to strings explicitly
    order_dict = {
        'id': str(order.id),
        'customer_id': str(order.customer_id),
        'club_id': str(order.club_id),
        'total_amount': order.total_amount,
        'payment_method': order.payment_method,
        'status': order.status,
        'qr_code': order.qr_code,
        'payment_intent_id': order.payment_intent_id,
        'created_at': order.created_at,
        'updated_at': order.updated_at,
        'completed_at': order.completed_at,
    }
    
    items = []
    for item in order.items:
        drink = db.query(Drink).filter(Drink.id == item.drink_id).first()
        item_dict = {
            'id': str(item.id),
            'drink_id': str(item.drink_id),
            'quantity': item.quantity,
            'price_at_purchase': item.price_at_purchase,
            'drink_name': drink.name if drink else None,
        }
        items.append(item_dict)
    
    order_dict["items"] = items
    order_dict["club_name"] = order.club.name if order.club else None
    
    return OrderResponse(**order_dict)


@router.post("/orders/{order_id}/given", response_model=OrderResponse)
def mark_order_given(
    order_id: str,
    current_user: User = Depends(get_current_bartender),
    db: Session = Depends(get_db)
):
    """Mark order as given/completed. For cash orders pending payment, also confirms payment."""
    from uuid import UUID
    try:
        order_uuid = UUID(order_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid order ID format",
        )
    
    # Get bartender
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
    
    # Complete the order
    order.status = OrderStatus.COMPLETED
    order.completed_at = datetime.now(timezone.utc)
    
    # Ensure bartender is assigned
    if not order.bartender_id:
        order.bartender_id = bartender.id
    
    db.commit()
    db.refresh(order)
    
    # Format response
    order_dict = {
        'id': str(order.id),
        'customer_id': str(order.customer_id),
        'club_id': str(order.club_id),
        'total_amount': order.total_amount,
        'payment_method': order.payment_method,
        'status': order.status,
        'qr_code': order.qr_code,
        'payment_intent_id': order.payment_intent_id,
        'created_at': order.created_at,
        'updated_at': order.updated_at,
        'completed_at': order.completed_at,
    }
    
    items = []
    for item in order.items:
        drink = db.query(Drink).filter(Drink.id == item.drink_id).first()
        item_dict = {
            'id': str(item.id),
            'drink_id': str(item.drink_id),
            'quantity': item.quantity,
            'price_at_purchase': item.price_at_purchase,
            'drink_name': drink.name if drink else None,
        }
        items.append(item_dict)
    
    order_dict["items"] = items
    order_dict["club_name"] = order.club.name if order.club else None
    
    return OrderResponse(**order_dict)


@router.post("/orders/{order_id}/confirm-payment", response_model=OrderResponse)
def confirm_cash_payment(
    order_id: str,
    current_user: User = Depends(get_current_bartender),
    db: Session = Depends(get_db)
):
    """Confirm cash payment received (bartender only)."""
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
    
    # Verify it's a cash payment and pending
    if order.payment_method != PaymentMethod.CASH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This endpoint is only for cash payments",
        )
    
    if order.status != OrderStatus.PENDING_PAYMENT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order status is {order.status.value}, cannot confirm payment",
        )
    
    # Mark as paid
    order.status = OrderStatus.PAID
    db.commit()
    db.refresh(order)
    
    # Format response - convert UUIDs to strings explicitly
    order_dict = {
        'id': str(order.id),
        'customer_id': str(order.customer_id),
        'club_id': str(order.club_id),
        'total_amount': order.total_amount,
        'payment_method': order.payment_method,
        'status': order.status,
        'qr_code': order.qr_code,
        'payment_intent_id': order.payment_intent_id,
        'created_at': order.created_at,
        'updated_at': order.updated_at,
        'completed_at': order.completed_at,
    }
    
    items = []
    for item in order.items:
        drink = db.query(Drink).filter(Drink.id == item.drink_id).first()
        item_dict = {
            'id': str(item.id),
            'drink_id': str(item.drink_id),
            'quantity': item.quantity,
            'price_at_purchase': item.price_at_purchase,
            'drink_name': drink.name if drink else None,
        }
        items.append(item_dict)
    
    order_dict["items"] = items
    order_dict["club_name"] = order.club.name if order.club else None
    
    return OrderResponse(**order_dict)


@router.post("/orders/{order_id}/given", response_model=OrderResponse)
def mark_order_given(
    order_id: str,
    current_user: User = Depends(get_current_bartender),
    db: Session = Depends(get_db)
):
    """Mark order as given/completed. For cash orders pending payment, also confirms payment."""
    from uuid import UUID
    try:
        order_uuid = UUID(order_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid order ID format",
        )
    
    # Get bartender
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
    
    # Complete the order
    order.status = OrderStatus.COMPLETED
    order.completed_at = datetime.now(timezone.utc)
    
    # Ensure bartender is assigned
    if not order.bartender_id:
        order.bartender_id = bartender.id
    
    db.commit()
    db.refresh(order)
    
    # Format response
    order_dict = {
        'id': str(order.id),
        'customer_id': str(order.customer_id),
        'club_id': str(order.club_id),
        'total_amount': order.total_amount,
        'payment_method': order.payment_method,
        'status': order.status,
        'qr_code': order.qr_code,
        'payment_intent_id': order.payment_intent_id,
        'created_at': order.created_at,
        'updated_at': order.updated_at,
        'completed_at': order.completed_at,
    }
    
    items = []
    for item in order.items:
        drink = db.query(Drink).filter(Drink.id == item.drink_id).first()
        item_dict = {
            'id': str(item.id),
            'drink_id': str(item.drink_id),
            'quantity': item.quantity,
            'price_at_purchase': item.price_at_purchase,
            'drink_name': drink.name if drink else None,
        }
        items.append(item_dict)
    
    order_dict["items"] = items
    order_dict["club_name"] = order.club.name if order.club else None
    
    return OrderResponse(**order_dict)
