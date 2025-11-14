from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from uuid import UUID as UUIDType
from app.db.base import get_db
from app.models.user import User
from app.models.club import Club
from app.models.user_club import UserClub
from app.schemas.user_club import UserClubCreate, UserClubWithClub
from app.core.dependencies import get_current_user

router = APIRouter()


@router.get("/me/clubs", response_model=List[UserClubWithClub])
def get_user_clubs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all clubs the current user is registered with, including stats."""
    user_clubs = (
        db.query(UserClub)
        .filter(UserClub.user_id == current_user.id)
        .options(joinedload(UserClub.club))
        .all()
    )
    
    return [UserClubWithClub.model_validate(uc) for uc in user_clubs]


@router.post("/me/clubs/{club_id}/register", response_model=UserClubWithClub, status_code=status.HTTP_201_CREATED)
def register_user_to_club(
    club_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Register the current user to a club (creates UserClub relationship)."""
    # Validate club exists
    club = db.query(Club).filter(Club.id == UUIDType(club_id)).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found"
        )
    
    # Check if already registered
    existing = db.query(UserClub).filter(
        UserClub.user_id == current_user.id,
        UserClub.club_id == UUIDType(club_id)
    ).first()
    
    if existing:
        # Load club relationship if not already loaded
        if not existing.club:
            db.refresh(existing, ["club"])
        return UserClubWithClub.model_validate(existing)
    
    # Create new UserClub relationship
    user_club = UserClub(
        user_id=current_user.id,
        club_id=UUIDType(club_id),
        points=0,
        total_orders=0,
        total_spent=0
    )
    
    db.add(user_club)
    db.commit()
    db.refresh(user_club)
    
    # Load club relationship
    db.refresh(user_club, ["club"])
    
    return UserClubWithClub.model_validate(user_club)

