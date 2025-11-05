from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.base import get_db
from app.models.user import User, UserRole
from app.models.club import Club
from app.models.bartender import Bartender
from app.schemas.bartender import BartenderCreate, BartenderResponse
from app.core.dependencies import get_current_club_owner

router = APIRouter()


@router.post("", response_model=BartenderResponse, status_code=status.HTTP_201_CREATED)
def add_bartender(
    bartender_data: BartenderCreate,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Add a bartender to a club (club owner only)."""
    from uuid import UUID
    try:
        club_uuid = UUID(bartender_data.club_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid club ID format",
        )
    # Verify club ownership
    club = db.query(Club).filter(
        Club.id == club_uuid,
        Club.owner_id == current_user.id
    ).first()
    
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found or you don't have permission",
        )
    
    # Find user by email
    user = db.query(User).filter(User.email == bartender_data.user_email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Update user role to bartender if needed
    if user.role != UserRole.BARTENDER:
        user.role = UserRole.BARTENDER
    
    # Check if bartender already exists for this club
    existing_bartender = db.query(Bartender).filter(
        Bartender.user_id == user.id,
        Bartender.club_id == bartender_data.club_id
    ).first()
    
    if existing_bartender:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bartender already added to this club",
        )
    
    # Create bartender profile
    db_bartender = Bartender(
        user_id=user.id,
        club_id=club_uuid,
        is_active=True,
    )
    
    db.add(db_bartender)
    db.commit()
    db.refresh(db_bartender)
    
    # Format response
    bartender_dict = BartenderResponse.model_validate(db_bartender).model_dump()
    bartender_dict["user_name"] = user.full_name
    
    return BartenderResponse(**bartender_dict)


@router.get("/club/{club_id}", response_model=List[BartenderResponse])
def list_bartenders(
    club_id: str,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """List all bartenders for a club (club owner only)."""
    from uuid import UUID
    try:
        club_uuid = UUID(club_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid club ID format",
        )
    # Verify club ownership
    club = db.query(Club).filter(
        Club.id == club_uuid,
        Club.owner_id == current_user.id
    ).first()
    
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found or you don't have permission",
        )
    
    bartenders = db.query(Bartender).filter(
        Bartender.club_id == club_uuid
    ).all()
    
    result = []
    for bartender in bartenders:
        bartender_dict = BartenderResponse.model_validate(bartender).model_dump()
        bartender_dict["user_name"] = bartender.user.full_name if bartender.user else None
        result.append(BartenderResponse(**bartender_dict))
    
    return result

