from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from app.db.base import get_db
from app.models.user import User, UserRole
from app.models.club import Club
from app.models.bartender import Bartender
from app.schemas.bartender import BartenderCreate, BartenderResponse, BartenderClubInfo
from app.core.dependencies import get_current_club_owner

router = APIRouter()


@router.post("", response_model=BartenderResponse, status_code=status.HTTP_201_CREATED)
def add_bartender(
    bartender_data: BartenderCreate,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Add a bartender to a club (club owner only). Creates user if doesn't exist."""
    from app.core.security import get_password_hash
    
    # Pydantic already validates and converts club_id to UUID
    club_uuid = bartender_data.club_id
    
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
    
    # Check if user already exists
    user = db.query(User).filter(User.email == bartender_data.email).first()
    
    if user:
        # User exists - check if already a bartender for this club
        existing_bartender = db.query(Bartender).filter(
            Bartender.user_id == user.id,
            Bartender.club_id == club_uuid
        ).first()
        
        if existing_bartender:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bartender already added to this club",
            )
        
        # Update user role to bartender if needed
        if user.role != UserRole.BARTENDER:
            user.role = UserRole.BARTENDER
            if bartender_data.full_name:
                user.full_name = bartender_data.full_name
    else:
        # Create new user with bartender role
        hashed_password = get_password_hash(bartender_data.password)
        user = User(
            email=bartender_data.email,
            hashed_password=hashed_password,
            full_name=bartender_data.full_name,
            role=UserRole.BARTENDER,
            is_active=True,
        )
        db.add(user)
        db.flush()  # Flush to get user.id without committing
    
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
    bartender_dict["user_email"] = user.email
    bartender_dict["club_name"] = club.name
    
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
        bartender_dict["user_email"] = bartender.user.email if bartender.user else None
        bartender_dict["club_name"] = club.name
        result.append(BartenderResponse(**bartender_dict))
    
    return result


@router.get("", response_model=List[BartenderResponse])
def list_all_bartenders(
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """List all bartenders for all clubs owned by the current user."""
    # Get all clubs owned by the user
    owned_clubs = db.query(Club).filter(
        Club.owner_id == current_user.id
    ).all()
    
    if not owned_clubs:
        return []
    
    club_ids = [club.id for club in owned_clubs]
    
    # Get all bartenders for these clubs
    bartenders = db.query(Bartender).filter(
        Bartender.club_id.in_(club_ids)
    ).all()
    
    # Create a map of club_id -> club_name for quick lookup
    club_map = {club.id: club.name for club in owned_clubs}
    
    result = []
    for bartender in bartenders:
        bartender_dict = BartenderResponse.model_validate(bartender).model_dump()
        bartender_dict["user_name"] = bartender.user.full_name if bartender.user else None
        bartender_dict["user_email"] = bartender.user.email if bartender.user else None
        bartender_dict["club_name"] = club_map.get(bartender.club_id)
        result.append(BartenderResponse(**bartender_dict))
    
    return result


@router.put("/{bartender_id}/status", response_model=BartenderResponse)
def update_bartender_status(
    bartender_id: str,
    is_active: bool = Query(..., description="Active status"),
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Update bartender active status (club owner only)."""
    from uuid import UUID
    try:
        bartender_uuid = UUID(bartender_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid bartender ID format",
        )
    
    # Get bartender and verify club ownership
    bartender = db.query(Bartender).join(Club).filter(
        Bartender.id == bartender_uuid,
        Club.owner_id == current_user.id
    ).first()
    
    if not bartender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bartender not found or you don't have permission",
        )
    
    # Update status
    bartender.is_active = is_active
    db.commit()
    db.refresh(bartender)
    
    # Format response
    bartender_dict = BartenderResponse.model_validate(bartender).model_dump()
    bartender_dict["user_name"] = bartender.user.full_name if bartender.user else None
    bartender_dict["user_email"] = bartender.user.email if bartender.user else None
    bartender_dict["club_name"] = bartender.club.name if bartender.club else None
    
    return BartenderResponse(**bartender_dict)


@router.put("/{bartender_id}/club", response_model=BartenderResponse)
def update_bartender_club(
    bartender_id: str,
    new_club_id: str = Query(..., description="New club ID"),
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Update bartender's club association (club owner only)."""
    from uuid import UUID
    try:
        bartender_uuid = UUID(bartender_id)
        new_club_uuid = UUID(new_club_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ID format",
        )
    
    # Get bartender - verify current user owns the bartender's current club OR the new club
    bartender = db.query(Bartender).join(Club, Bartender.club_id == Club.id).filter(
        Bartender.id == bartender_uuid
    ).first()
    
    if not bartender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bartender not found",
        )
    
    # Verify user owns either the current club or the new club
    current_club = db.query(Club).filter(
        Club.id == bartender.club_id,
        Club.owner_id == current_user.id
    ).first()
    
    new_club = db.query(Club).filter(
        Club.id == new_club_uuid,
        Club.owner_id == current_user.id
    ).first()
    
    # User must own either the current club (to move from) or the new club (to move to)
    if not current_club and not new_club:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to move this bartender. You must own either the current club or the new club.",
        )
    
    # Verify new club exists and user owns it
    if not new_club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="New club not found or you don't own it",
        )
    
    # Check if bartender already exists for the new club
    existing_bartender = db.query(Bartender).filter(
        Bartender.user_id == bartender.user_id,
        Bartender.club_id == new_club_uuid
    ).first()
    
    if existing_bartender:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bartender already associated with this club",
        )
    
    # Update club association
    bartender.club_id = new_club_uuid
    db.commit()
    db.refresh(bartender)
    
    # Format response
    bartender_dict = BartenderResponse.model_validate(bartender).model_dump()
    bartender_dict["user_name"] = bartender.user.full_name if bartender.user else None
    bartender_dict["user_email"] = bartender.user.email if bartender.user else None
    bartender_dict["club_name"] = new_club.name
    
    return BartenderResponse(**bartender_dict)


@router.delete("/{bartender_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_bartender(
    bartender_id: str,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Remove a bartender from a club (club owner only)."""
    from uuid import UUID
    try:
        bartender_uuid = UUID(bartender_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid bartender ID format",
        )
    
    # Get bartender and verify club ownership
    bartender = db.query(Bartender).join(Club).filter(
        Bartender.id == bartender_uuid,
        Club.owner_id == current_user.id
    ).first()
    
    if not bartender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bartender not found or you don't have permission",
        )
    
    # Delete bartender profile (doesn't delete the user)
    db.delete(bartender)
    db.commit()
    
    return None

