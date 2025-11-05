from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from decimal import Decimal
import uuid
from app.db.base import get_db
from app.models.user import User
from app.models.club import Club
from app.models.drink import Drink
from app.models.order import Order, OrderItem, OrderStatus
from app.schemas.order import OrderCreate, OrderResponse, OrderItemResponse, OrderStatusUpdate
from app.core.dependencies import get_current_user
from app.core.stripe_service import create_payment_intent
from app.core.qr_service import generate_qr_code

router = APIRouter()


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    order_data: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new order (customer only)."""
    from uuid import UUID
    try:
        club_uuid = UUID(order_data.club_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid club ID format",
        )
    # Verify club exists
    club = db.query(Club).filter(Club.id == club_uuid, Club.is_active == True).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found or inactive",
        )
    
    # Calculate total and validate drinks
    total_amount = Decimal("0.00")
    order_items_data = []
    
    for item_data in order_data.items:
        try:
            drink_uuid = UUID(item_data.drink_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid drink ID format: {item_data.drink_id}",
            )
        drink = db.query(Drink).filter(
            Drink.id == drink_uuid,
            Drink.club_id == club_uuid,
            Drink.is_available == True
        ).first()
        
        if not drink:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Drink {item_data.drink_id} not found or unavailable",
            )
        
        item_total = drink.price * Decimal(str(item_data.quantity))
        total_amount += item_total
        
        order_items_data.append({
            "drink": drink,
            "quantity": item_data.quantity,
            "price_at_purchase": drink.price,
        })
    
    # Create payment intent with Stripe
    payment_intent = create_payment_intent(
        amount=int(total_amount * 100),  # Convert to cents
        currency="usd",
        metadata={
            "customer_id": str(current_user.id),
            "club_id": str(club.id),
        }
    )
    
    # Create order with pending_payment status
    db_order = Order(
        customer_id=current_user.id,
        club_id=club_uuid,
        total_amount=total_amount,
        status=OrderStatus.PENDING_PAYMENT,
        payment_intent_id=payment_intent.id,
    )
    
    db.add(db_order)
    db.flush()  # Get order ID
    
    # Create order items
    for item_data in order_items_data:
        db_item = OrderItem(
            order_id=db_order.id,
            drink_id=item_data["drink"].id,
            quantity=int(item_data["quantity"]),
            price_at_purchase=item_data["price_at_purchase"],
        )
        db.add(db_item)
    
    db.commit()
    db.refresh(db_order)
    
    # Format response with items
    order_dict = OrderResponse.model_validate(db_order).model_dump()
    items = []
    for item in db_order.items:
        drink = db.query(Drink).filter(Drink.id == item.drink_id).first()
        item_dict = OrderItemResponse.model_validate(item).model_dump()
        item_dict["drink_name"] = drink.name if drink else None
        items.append(item_dict)
    order_dict["items"] = items
    order_dict["club_name"] = club.name
    order_dict["payment_intent_id"] = payment_intent.client_secret  # Return client secret for frontend
    
    return OrderResponse(**order_dict)


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get order details by ID."""
    from uuid import UUID
    try:
        order_uuid = UUID(order_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid order ID format",
        )
    order = db.query(Order).filter(Order.id == order_uuid).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    
    # Only owner or customer can view order
    if order.customer_id != current_user.id and current_user.role not in ["club_owner", "bartender"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    
    # Load items with drink names
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


@router.get("/me/history", response_model=List[OrderResponse])
def get_my_orders(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get order history for current user."""
    orders = db.query(Order).filter(
        Order.customer_id == current_user.id
    ).order_by(Order.created_at.desc()).offset(skip).limit(limit).all()
    
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

