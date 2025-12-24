from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List
from datetime import datetime, timedelta, timezone
from app.db.base import get_db
from app.models.user import User
from app.models.club import Club
from app.models.drink import Drink
from app.models.order import Order, OrderItem, OrderStatus
from app.models.bartender import Bartender
from app.schemas.club import (
    ClubCreate, ClubUpdate, ClubResponse, ClubAnalytics,
    HourlyActivity, OrdersByStatus, TopDrink, RecentOrder
)
from app.schemas.drink import DrinkCreate, DrinkUpdate, DrinkResponse
from app.core.dependencies import get_current_user, get_current_club_owner
from app.core.geocoding_service import geocoding_service

router = APIRouter()


@router.post("", response_model=ClubResponse, status_code=status.HTTP_201_CREATED)
async def create_club(
    club_data: ClubCreate,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Register a new club (club owner only)."""
    # Geocode address if provided (use formatted_address if available, otherwise address)
    geocode_result = None
    address_to_geocode = club_data.formatted_address or club_data.address
    
    if address_to_geocode:
        geocode_result = await geocoding_service.geocode_address(address_to_geocode)
    
    db_club = Club(
        owner_id=current_user.id,
        name=club_data.name,
        description=club_data.description,
        address=club_data.address,
        city=club_data.city or (geocode_result.get("city") if geocode_result else None),
        formatted_address=club_data.formatted_address or (geocode_result.get("formatted_address") if geocode_result else None),
        latitude=club_data.latitude or (geocode_result.get("latitude") if geocode_result else None),
        longitude=club_data.longitude or (geocode_result.get("longitude") if geocode_result else None),
        place_id=club_data.place_id or (geocode_result.get("place_id") if geocode_result else None),
        logo_url=club_data.logo_url,
        logo_settings=club_data.logo_settings,
        cover_image_url=club_data.cover_image_url,
    )
    
    db.add(db_club)
    db.commit()
    db.refresh(db_club)
    
    return ClubResponse.model_validate(db_club)


@router.get("/me", response_model=ClubResponse)
def get_my_club(
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Get club details for the current club owner."""
    club = db.query(Club).filter(Club.owner_id == current_user.id).first()
    
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found",
        )
    
    return ClubResponse.model_validate(club)


@router.get("/my-clubs", response_model=List[ClubResponse])
def get_my_clubs(
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Get all clubs owned by the current club owner."""
    clubs = db.query(Club).filter(Club.owner_id == current_user.id).order_by(Club.created_at.desc()).all()
    return [ClubResponse.model_validate(club) for club in clubs]


@router.get("/analytics", response_model=ClubAnalytics)
def get_club_analytics(
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Get analytics for all clubs owned by the current club owner."""
    # Get all clubs for this owner
    clubs = db.query(Club).filter(Club.owner_id == current_user.id).all()
    if not clubs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No clubs found",
        )
    
    club_ids = [club.id for club in clubs]
    
    # Time ranges (use timezone-aware datetimes to match DB)
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    prev_week_start = week_start - timedelta(days=7)
    
    # Today's stats
    today_orders = db.query(Order).filter(
        Order.club_id.in_(club_ids),
        Order.created_at >= today_start,
        Order.status != OrderStatus.CANCELLED
    ).all()
    
    today_revenue = sum(float(o.total_amount) for o in today_orders if o.status in [
        OrderStatus.PAID, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.COMPLETED
    ])
    today_orders_count = len(today_orders)
    
    # This week's stats
    week_orders = db.query(Order).filter(
        Order.club_id.in_(club_ids),
        Order.created_at >= week_start,
        Order.status != OrderStatus.CANCELLED
    ).all()
    
    week_revenue = sum(float(o.total_amount) for o in week_orders if o.status in [
        OrderStatus.PAID, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.COMPLETED
    ])
    week_orders_count = len(week_orders)
    
    # Previous week for comparison
    prev_week_orders = db.query(Order).filter(
        Order.club_id.in_(club_ids),
        Order.created_at >= prev_week_start,
        Order.created_at < week_start,
        Order.status != OrderStatus.CANCELLED
    ).all()
    
    prev_week_revenue = sum(float(o.total_amount) for o in prev_week_orders if o.status in [
        OrderStatus.PAID, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.COMPLETED
    ])
    prev_week_orders_count = len(prev_week_orders)
    
    # Calculate change percentages
    revenue_change = ((week_revenue - prev_week_revenue) / prev_week_revenue * 100) if prev_week_revenue > 0 else 0
    orders_change = ((week_orders_count - prev_week_orders_count) / prev_week_orders_count * 100) if prev_week_orders_count > 0 else 0
    
    # Pending orders (paid but not completed)
    pending_orders = db.query(Order).filter(
        Order.club_id.in_(club_ids),
        Order.status.in_([OrderStatus.PAID, OrderStatus.PREPARING, OrderStatus.READY])
    ).count()
    
    # Active bartenders
    active_bartenders = db.query(Bartender).filter(
        Bartender.club_id.in_(club_ids),
        Bartender.is_active == True
    ).count()
    
    # Total drinks
    total_drinks = db.query(Drink).filter(
        Drink.club_id.in_(club_ids),
        Drink.is_available == True
    ).count()
    
    # Orders by status
    status_counts = {s: 0 for s in ['pending', 'paid', 'preparing', 'ready', 'completed', 'cancelled']}
    all_orders = db.query(Order).filter(
        Order.club_id.in_(club_ids),
        Order.created_at >= week_start
    ).all()
    
    for order in all_orders:
        status_key = order.status.value.lower()
        if status_key == 'pending_payment':
            status_key = 'pending'
        if status_key in status_counts:
            status_counts[status_key] += 1
    
    orders_by_status = OrdersByStatus(
        pending=status_counts['pending'],
        paid=status_counts['paid'],
        preparing=status_counts['preparing'],
        ready=status_counts['ready'],
        completed=status_counts['completed'],
        cancelled=status_counts['cancelled']
    )
    
    # Hourly activity (last 24 hours)
    hourly_activity = []
    for hour in range(24):
        hour_start = today_start.replace(hour=hour)
        hour_end = hour_start + timedelta(hours=1)
        
        # Filter orders for this hour
        def in_hour(order_time):
            if order_time is None:
                return False
            # Make naive datetime aware if needed
            if order_time.tzinfo is None:
                order_time = order_time.replace(tzinfo=timezone.utc)
            return hour_start <= order_time < hour_end
        
        hour_orders = [o for o in today_orders if in_hour(o.created_at)]
        hour_revenue = sum(float(o.total_amount) for o in hour_orders if o.status in [
            OrderStatus.PAID, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.COMPLETED
        ])
        
        hourly_activity.append(HourlyActivity(
            hour=hour,
            orders=len(hour_orders),
            revenue=round(hour_revenue, 2)
        ))
    
    # Top drinks (this week)
    drink_stats = {}
    for order in week_orders:
        if order.status in [OrderStatus.PAID, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.COMPLETED]:
            for item in order.items:
                drink_id = str(item.drink_id)
                if drink_id not in drink_stats:
                    drink = db.query(Drink).filter(Drink.id == item.drink_id).first()
                    drink_stats[drink_id] = {
                        'id': drink_id,
                        'name': drink.name if drink else 'Unknown',
                        'image_url': drink.image_url if drink else None,
                        'count': 0,
                        'revenue': 0.0
                    }
                drink_stats[drink_id]['count'] += int(item.quantity)
                drink_stats[drink_id]['revenue'] += float(item.price_at_purchase) * int(item.quantity)
    
    top_drinks = sorted(drink_stats.values(), key=lambda x: x['count'], reverse=True)[:5]
    top_drinks = [TopDrink(**d) for d in top_drinks]
    
    # Recent orders (last 10)
    recent_orders_query = db.query(Order).filter(
        Order.club_id.in_(club_ids)
    ).order_by(Order.created_at.desc()).limit(10).all()
    
    recent_orders = []
    for order in recent_orders_query:
        customer = db.query(User).filter(User.id == order.customer_id).first()
        recent_orders.append(RecentOrder(
            id=str(order.id),
            customer_name=customer.full_name if customer else None,
            total_amount=float(order.total_amount),
            status=order.status.value,
            payment_method=order.payment_method.value,
            items_count=len(order.items),
            created_at=order.created_at
        ))
    
    return ClubAnalytics(
        today_revenue=round(today_revenue, 2),
        today_orders=today_orders_count,
        week_revenue=round(week_revenue, 2),
        week_orders=week_orders_count,
        pending_orders=pending_orders,
        active_bartenders=active_bartenders,
        total_drinks=total_drinks,
        orders_by_status=orders_by_status,
        hourly_activity=hourly_activity,
        top_drinks=top_drinks,
        recent_orders=recent_orders,
        revenue_change_percent=round(revenue_change, 1),
        orders_change_percent=round(orders_change, 1)
    )


@router.get("/{club_id}/orders", response_model=List)
def get_club_orders(
    club_id: str,
    status_filter: str = None,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Get orders for a specific club (club owner only)."""
    from uuid import UUID
    from app.schemas.order import OrderResponse
    
    try:
        club_uuid = UUID(club_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid club ID format",
        )
    
    # Verify club ownership
    club = db.query(Club).filter(Club.id == club_uuid, Club.owner_id == current_user.id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found or you don't have permission",
        )
    
    # Build query
    query = db.query(Order).filter(Order.club_id == club_uuid)
    
    if status_filter and status_filter != 'all':
        try:
            status_enum = OrderStatus(status_filter)
            query = query.filter(Order.status == status_enum)
        except ValueError:
            pass  # Invalid status, ignore filter
    
    # Get total count for pagination
    total_count = query.count()
    
    # Apply pagination
    orders = query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()
    
    # Format response
    result = []
    for order in orders:
        customer = db.query(User).filter(User.id == order.customer_id).first()
        order_dict = {
            'id': str(order.id),
            'customer_id': str(order.customer_id),
            'customer_name': customer.full_name if customer else None,
            'club_id': str(order.club_id),
            'total_amount': order.total_amount,
            'payment_method': order.payment_method.value,
            'status': order.status.value,
            'qr_code': order.qr_code,
            'payment_intent_id': order.payment_intent_id,
            'created_at': order.created_at,
            'updated_at': order.updated_at,
            'completed_at': order.completed_at,
            'items': []
        }
        
        for item in order.items:
            drink = db.query(Drink).filter(Drink.id == item.drink_id).first()
            order_dict['items'].append({
                'id': str(item.id),
                'drink_id': str(item.drink_id),
                'drink_name': drink.name if drink else None,
                'quantity': item.quantity,
                'price_at_purchase': float(item.price_at_purchase)
            })
        
        result.append(order_dict)
    
    return result


@router.put("/{club_id}/orders/{order_id}/status")
def update_club_order_status(
    club_id: str,
    order_id: str,
    status_update: dict,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Update order status (club owner only)."""
    from uuid import UUID
    
    try:
        club_uuid = UUID(club_id)
        order_uuid = UUID(order_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ID format",
        )
    
    # Verify club ownership
    club = db.query(Club).filter(Club.id == club_uuid, Club.owner_id == current_user.id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found or you don't have permission",
        )
    
    # Find order
    order = db.query(Order).filter(Order.id == order_uuid, Order.club_id == club_uuid).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    
    # Update status
    new_status = status_update.get('status')
    if new_status:
        try:
            order.status = OrderStatus(new_status)
            if order.status == OrderStatus.COMPLETED:
                order.completed_at = datetime.utcnow()
            db.commit()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid status value",
            )
    
    return {"success": True, "status": order.status.value}


@router.put("/{club_id}", response_model=ClubResponse)
async def update_club(
    club_id: str,
    club_data: ClubUpdate,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Update club information."""
    from uuid import UUID
    try:
        club_uuid = UUID(club_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid club ID format",
        )
    club = db.query(Club).filter(Club.id == club_uuid, Club.owner_id == current_user.id).first()
    
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found",
        )
    
    update_data = club_data.dict(exclude_unset=True)
    
    # If address is being updated, geocode it
    if "address" in update_data or "formatted_address" in update_data:
        address_to_geocode = update_data.get("formatted_address") or update_data.get("address")
        if address_to_geocode:
            geocode_result = await geocoding_service.geocode_address(address_to_geocode)
            if geocode_result:
                # Update geocoding fields if not explicitly provided
                if "formatted_address" not in update_data:
                    update_data["formatted_address"] = geocode_result.get("formatted_address")
                if "latitude" not in update_data:
                    update_data["latitude"] = geocode_result.get("latitude")
                if "longitude" not in update_data:
                    update_data["longitude"] = geocode_result.get("longitude")
                if "place_id" not in update_data:
                    update_data["place_id"] = geocode_result.get("place_id")
                if "city" not in update_data and geocode_result.get("city"):
                    update_data["city"] = geocode_result.get("city")
    
    for field, value in update_data.items():
        setattr(club, field, value)
    
    db.commit()
    db.refresh(club)
    
    return ClubResponse.model_validate(club)


@router.delete("/{club_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_club(
    club_id: str,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Delete a club (club owner only). This will also delete all associated drinks."""
    from uuid import UUID
    try:
        club_uuid = UUID(club_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid club ID format",
        )
    
    club = db.query(Club).filter(Club.id == club_uuid, Club.owner_id == current_user.id).first()
    
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found or you don't have permission",
        )
    
    # Delete associated drinks first
    db.query(Drink).filter(Drink.club_id == club_uuid).delete()
    
    # Delete the club
    db.delete(club)
    db.commit()
    
    return None


@router.get("", response_model=List[ClubResponse])
def list_clubs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """List all active clubs (public endpoint for customers)."""
    clubs = db.query(Club).filter(Club.is_active == True).offset(skip).limit(limit).all()
    return [ClubResponse.model_validate(club) for club in clubs]


@router.get("/{club_id}", response_model=ClubResponse)
def get_club(club_id: str, db: Session = Depends(get_db)):
    """Get club details by ID."""
    from uuid import UUID
    try:
        club_uuid = UUID(club_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid club ID format",
        )
    club = db.query(Club).filter(Club.id == club_uuid).first()
    
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found",
        )
    
    return ClubResponse.model_validate(club)


# Drink endpoints
@router.get("/{club_id}/drinks", response_model=List[DrinkResponse])
def list_drinks(club_id: str, db: Session = Depends(get_db)):
    """List all drinks for a club with category information.
    
    This includes:
    1. Drinks directly created for this club (club_id matches)
    2. Drinks from drink lists that are associated with this club
    """
    from uuid import UUID
    from sqlalchemy.orm import joinedload
    from sqlalchemy import or_
    
    try:
        club_uuid = UUID(club_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid club ID format",
        )
    
    # Get the club to access its associated drink lists
    club = db.query(Club).filter(Club.id == club_uuid).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found",
        )
    
    # Collect all drink IDs from associated drink lists
    drink_ids_from_lists = set()
    for drink_list in club.drink_lists:
        for drink in drink_list.drinks:
            drink_ids_from_lists.add(drink.id)
    
    # Query drinks that either:
    # 1. Have club_id matching this club (directly created for this club)
    # 2. Are in the drink_ids_from_lists (from associated drink lists)
    if drink_ids_from_lists:
        drinks = (
            db.query(Drink)
            .options(joinedload(Drink.category_obj))
            .filter(
                or_(
                    Drink.club_id == club_uuid,
                    Drink.id.in_(drink_ids_from_lists)
                )
            )
            .all()
        )
    else:
        # No associated drink lists, just get drinks directly for this club
        drinks = (
            db.query(Drink)
            .options(joinedload(Drink.category_obj))
            .filter(Drink.club_id == club_uuid)
            .all()
        )
    
    # Remove duplicates (in case a drink is both directly in club AND in a list)
    seen_ids = set()
    unique_drinks = []
    for drink in drinks:
        if drink.id not in seen_ids:
            seen_ids.add(drink.id)
            unique_drinks.append(drink)
    
    return [DrinkResponse.model_validate(drink) for drink in unique_drinks]


@router.get("/{club_id}/drink-lists", response_model=List[str])
def get_club_drink_lists(
    club_id: str,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Get drink list IDs associated with a club (club owner only)."""
    from uuid import UUID
    from app.models.drink_list import DrinkList
    
    try:
        club_uuid = UUID(club_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid club ID format",
        )
    
    # Verify club ownership
    club = db.query(Club).filter(Club.id == club_uuid, Club.owner_id == current_user.id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found or you don't have permission",
        )
    
    # Get associated drink lists via the many-to-many relationship
    associated_lists = [dl for dl in club.drink_lists]
    return [str(dl.id) for dl in associated_lists]


@router.post("/{club_id}/drinks", response_model=DrinkResponse, status_code=status.HTTP_201_CREATED)
def create_drink(
    club_id: str,
    drink_data: DrinkCreate,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """
    Add a new drink to club (club owner only).
    Supports category_id for linking to categories.
    """
    from uuid import UUID
    from sqlalchemy.orm import joinedload
    from app.core.brand_logos import get_logo_url
    
    try:
        club_uuid = UUID(club_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid club ID format",
        )
    # Verify club ownership
    club = db.query(Club).filter(Club.id == club_uuid, Club.owner_id == current_user.id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found or you don't have permission",
        )
    
    # Auto-fetch logo if brand_name provided but no image_url
    image_url = drink_data.image_url
    brand_colors = drink_data.brand_colors
    brand_fonts = drink_data.brand_fonts
    
    if drink_data.brand_name and not image_url:
        logo_url = get_logo_url(drink_data.brand_name)
        if logo_url:
            image_url = logo_url
    
    # Parse category_id if provided
    category_uuid = None
    if drink_data.category_id:
        try:
            category_uuid = UUID(drink_data.category_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid category ID format",
            )
    
    db_drink = Drink(
        club_id=club_uuid,
        name=drink_data.name,
        description=drink_data.description,
        price=drink_data.price,
        category=drink_data.category,
        category_id=category_uuid,
        image_url=image_url,
        brand_name=drink_data.brand_name,
        brand_colors=drink_data.brand_colors,
        brand_fonts=drink_data.brand_fonts,
        is_available=drink_data.is_available,
    )
    
    db.add(db_drink)
    db.commit()
    
    # Reload with category relationship for response
    db_drink = (
        db.query(Drink)
        .options(joinedload(Drink.category_obj))
        .filter(Drink.id == db_drink.id)
        .first()
    )
    
    return DrinkResponse.model_validate(db_drink)


@router.put("/drinks/{drink_id}", response_model=DrinkResponse)
def update_drink(
    drink_id: str,
    drink_data: DrinkUpdate,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Update a drink (club owner only). Supports category_id for linking to categories."""
    from uuid import UUID
    from sqlalchemy.orm import joinedload
    
    try:
        drink_uuid = UUID(drink_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid drink ID format",
        )
    drink = db.query(Drink).join(Club).filter(
        Drink.id == drink_uuid,
        Club.owner_id == current_user.id
    ).first()
    
    if not drink:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Drink not found or you don't have permission",
        )
    
    update_data = drink_data.dict(exclude_unset=True)
    
    # Handle category_id specially - convert to UUID
    if 'category_id' in update_data:
        cat_id = update_data['category_id']
        if cat_id:
            try:
                update_data['category_id'] = UUID(cat_id)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid category ID format",
                )
        else:
            update_data['category_id'] = None
    
    for field, value in update_data.items():
        setattr(drink, field, value)
    
    db.commit()
    
    # Reload with category relationship for response
    drink = (
        db.query(Drink)
        .options(joinedload(Drink.category_obj))
        .filter(Drink.id == drink_uuid)
        .first()
    )
    
    return DrinkResponse.model_validate(drink)


@router.delete("/drinks/{drink_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_drink(
    drink_id: str,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Delete a drink (club owner only)."""
    from uuid import UUID
    try:
        drink_uuid = UUID(drink_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid drink ID format",
        )
    drink = db.query(Drink).join(Club).filter(
        Drink.id == drink_uuid,
        Club.owner_id == current_user.id
    ).first()
    
    if not drink:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Drink not found or you don't have permission",
        )
    
    db.delete(drink)
    db.commit()
    
    return None

