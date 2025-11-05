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

router = APIRouter()


@router.post("", response_model=ClubResponse, status_code=status.HTTP_201_CREATED)
def create_club(
    club_data: ClubCreate,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Register a new club (club owner only)."""
    db_club = Club(
        owner_id=current_user.id,
        name=club_data.name,
        description=club_data.description,
        address=club_data.address,
        city=club_data.city,
        logo_url=club_data.logo_url,
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


@router.put("/{club_id}", response_model=ClubResponse)
def update_club(
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
    for field, value in update_data.items():
        setattr(club, field, value)
    
    db.commit()
    db.refresh(club)
    
    return ClubResponse.model_validate(club)


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
    """List all drinks for a club."""
    from uuid import UUID
    try:
        club_uuid = UUID(club_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid club ID format",
        )
    drinks = db.query(Drink).filter(Drink.club_id == club_uuid, Drink.is_available == True).all()
    return [DrinkResponse.model_validate(drink) for drink in drinks]


@router.post("/{club_id}/drinks", response_model=DrinkResponse, status_code=status.HTTP_201_CREATED)
def create_drink(
    club_id: str,
    drink_data: DrinkCreate,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Add a new drink to club (club owner only)."""
    from uuid import UUID
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
    
    db_drink = Drink(
        club_id=club_uuid,
        name=drink_data.name,
        description=drink_data.description,
        price=drink_data.price,
        category=drink_data.category,
        image_url=drink_data.image_url,
        is_available=drink_data.is_available,
    )
    
    db.add(db_drink)
    db.commit()
    db.refresh(db_drink)
    
    return DrinkResponse.model_validate(db_drink)


@router.put("/drinks/{drink_id}", response_model=DrinkResponse)
def update_drink(
    drink_id: str,
    drink_data: DrinkUpdate,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Update a drink (club owner only)."""
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
    
    update_data = drink_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(drink, field, value)
    
    db.commit()
    db.refresh(drink)
    
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

