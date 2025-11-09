from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.db.base import get_db
from app.models.user import User
from app.models.drink_list import DrinkList
from app.models.drink import Drink
from app.models.club import Club
from app.schemas.drink_list import DrinkListCreate, DrinkListUpdate, DrinkListResponse, DrinkListWithDrinks
from app.core.dependencies import get_current_user, get_current_club_owner

router = APIRouter()


@router.post("", response_model=DrinkListResponse, status_code=status.HTTP_201_CREATED)
def create_drink_list(
    drink_list_data: DrinkListCreate,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Create a new drink list."""
    db_drink_list = DrinkList(
        name=drink_list_data.name,
        description=drink_list_data.description,
    )
    
    # Add drinks if provided
    if drink_list_data.drink_ids:
        drink_uuids = []
        for drink_id in drink_list_data.drink_ids:
            try:
                drink_uuids.append(UUID(drink_id))
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid drink ID format: {drink_id}",
                )
        
        drinks = db.query(Drink).filter(Drink.id.in_(drink_uuids)).all()
        if len(drinks) != len(drink_uuids):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="One or more drinks not found",
            )
        
        db_drink_list.drinks = drinks
    
    db.add(db_drink_list)
    db.commit()
    db.refresh(db_drink_list)
    
    # Count drinks
    drink_count = len(db_drink_list.drinks)
    result = DrinkListResponse.model_validate(db_drink_list)
    result.drink_count = drink_count
    
    return result


@router.get("", response_model=List[DrinkListResponse])
def list_drink_lists(
    db: Session = Depends(get_db)
):
    """List all drink lists (public endpoint)."""
    drink_lists = db.query(DrinkList).filter(DrinkList.is_active == True).all()
    results = []
    for dl in drink_lists:
        result = DrinkListResponse.model_validate(dl)
        result.drink_count = len(dl.drinks)
        results.append(result)
    return results


@router.get("/{drink_list_id}", response_model=DrinkListWithDrinks)
def get_drink_list(
    drink_list_id: str,
    db: Session = Depends(get_db)
):
    """Get a drink list with its drinks."""
    try:
        drink_list_uuid = UUID(drink_list_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid drink list ID format",
        )
    
    drink_list = db.query(DrinkList).filter(DrinkList.id == drink_list_uuid).first()
    if not drink_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Drink list not found",
        )
    
    result = DrinkListWithDrinks.model_validate(drink_list)
    result.drinks = [{"id": str(d.id), "name": d.name, "price": float(d.price)} for d in drink_list.drinks]
    return result


@router.put("/{drink_list_id}", response_model=DrinkListResponse)
def update_drink_list(
    drink_list_id: str,
    drink_list_data: DrinkListUpdate,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Update a drink list."""
    try:
        drink_list_uuid = UUID(drink_list_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid drink list ID format",
        )
    
    drink_list = db.query(DrinkList).filter(DrinkList.id == drink_list_uuid).first()
    if not drink_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Drink list not found",
        )
    
    update_data = drink_list_data.dict(exclude_unset=True)
    
    # Handle drink_ids separately
    if "drink_ids" in update_data:
        drink_ids = update_data.pop("drink_ids")
        if drink_ids is not None:
            drink_uuids = []
            for drink_id in drink_ids:
                try:
                    drink_uuids.append(UUID(drink_id))
                except ValueError:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid drink ID format: {drink_id}",
                    )
            
            drinks = db.query(Drink).filter(Drink.id.in_(drink_uuids)).all()
            drink_list.drinks = drinks
    
    # Update other fields
    for field, value in update_data.items():
        setattr(drink_list, field, value)
    
    db.commit()
    db.refresh(drink_list)
    
    result = DrinkListResponse.model_validate(drink_list)
    result.drink_count = len(drink_list.drinks)
    return result


@router.delete("/{drink_list_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_drink_list(
    drink_list_id: str,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Delete a drink list."""
    try:
        drink_list_uuid = UUID(drink_list_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid drink list ID format",
        )
    
    drink_list = db.query(DrinkList).filter(DrinkList.id == drink_list_uuid).first()
    if not drink_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Drink list not found",
        )
    
    db.delete(drink_list)
    db.commit()
    
    return None


@router.post("/{drink_list_id}/associate-club/{club_id}", response_model=DrinkListResponse)
def associate_drink_list_to_club(
    drink_list_id: str,
    club_id: str,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Associate a drink list with a club."""
    try:
        drink_list_uuid = UUID(drink_list_id)
        club_uuid = UUID(club_id)
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
    
    drink_list = db.query(DrinkList).filter(DrinkList.id == drink_list_uuid).first()
    if not drink_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Drink list not found",
        )
    
    # Associate club with drink list
    if club not in drink_list.clubs:
        drink_list.clubs.append(club)
        db.commit()
    
    db.refresh(drink_list)
    result = DrinkListResponse.model_validate(drink_list)
    result.drink_count = len(drink_list.drinks)
    return result


@router.delete("/{drink_list_id}/associate-club/{club_id}", status_code=status.HTTP_204_NO_CONTENT)
def disassociate_drink_list_from_club(
    drink_list_id: str,
    club_id: str,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Disassociate a drink list from a club."""
    try:
        drink_list_uuid = UUID(drink_list_id)
        club_uuid = UUID(club_id)
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
    
    drink_list = db.query(DrinkList).filter(DrinkList.id == drink_list_uuid).first()
    if not drink_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Drink list not found",
        )
    
    # Disassociate club from drink list
    if club in drink_list.clubs:
        drink_list.clubs.remove(club)
        db.commit()
    
    return None

