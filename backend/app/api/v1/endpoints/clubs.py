from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.base import get_db
from app.models.user import User
from app.models.club import Club
from app.models.drink import Drink
from app.schemas.club import ClubCreate, ClubUpdate, ClubResponse
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

