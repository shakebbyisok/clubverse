"""
Liquor management endpoints.
Handles CRUD operations for liquors and auto-creates shot drinks.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.db.base import get_db
from app.models.user import User
from app.models.club import Club
from app.models.liquor import Liquor, LiquorType
from app.models.drink import Drink, DrinkType
from app.schemas.liquor import (
    LiquorCreate, LiquorUpdate, LiquorResponse, LiquorWithShot,
    BatchLiquorCreate, BatchLiquorRequest
)
from app.schemas.drink import DrinkResponse
from app.core.dependencies import get_current_club_owner
from app.core.image_resolver import image_resolver
from app.core.brand_logos import get_logo_url
from app.core.category_service import CategoryService

logger = logging.getLogger(__name__)
router = APIRouter()


def _resolve_liquor_image(name: str, brand_name: Optional[str], liquor_type: LiquorType) -> Optional[str]:
    """Resolve image URL for a liquor."""
    # Try brand logo first
    if brand_name:
        logo = get_logo_url(brand_name)
        if logo:
            return logo
    
    # Try by name
    logo = get_logo_url(name)
    if logo:
        return logo
    
    # Use image resolver for fallback
    return image_resolver.resolve_drink_image(
        drink_name=name,
        category="liquors",
        brand_name=brand_name or name
    )


def _create_shot_drink(
    db: Session,
    liquor: Liquor,
    category_service: CategoryService
) -> Drink:
    """Create a shot drink for a liquor."""
    # Get or create Shots category
    system_categories = category_service.get_system_categories(db)
    shots_category = next((c for c in system_categories if c.name == "Shots"), None)
    
    shot_drink = Drink(
        club_id=liquor.club_id,
        name=f"Shot of {liquor.name}",
        description=f"Pure {liquor.name} shot",
        price=liquor.shot_price,
        drink_type=DrinkType.SHOT,
        liquor_id=liquor.id,
        soda_id=None,
        category="Shots",
        category_id=shots_category.id if shots_category else None,
        image_url=liquor.image_url,
        brand_name=liquor.brand_name or liquor.name,
        is_available=liquor.is_available
    )
    db.add(shot_drink)
    return shot_drink


@router.get("", response_model=List[LiquorResponse])
async def get_liquors(
    club_id: str = Query(..., description="Club ID to get liquors for"),
    include_unavailable: bool = Query(False, description="Include unavailable liquors"),
    liquor_type: Optional[LiquorType] = Query(None, description="Filter by liquor type"),
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Get all liquors for a club."""
    try:
        club_uuid = UUID(club_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid club ID format")
    
    # Verify club ownership
    club = db.query(Club).filter(Club.id == club_uuid, Club.owner_id == current_user.id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found or access denied")
    
    query = db.query(Liquor).filter(Liquor.club_id == club_uuid)
    
    if not include_unavailable:
        query = query.filter(Liquor.is_available == True)
    
    if liquor_type:
        query = query.filter(Liquor.liquor_type == liquor_type)
    
    liquors = query.order_by(Liquor.display_order, Liquor.name).all()
    return [LiquorResponse.model_validate(l) for l in liquors]


@router.post("", response_model=LiquorWithShot, status_code=status.HTTP_201_CREATED)
async def create_liquor(
    liquor_data: LiquorCreate,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """
    Create a new liquor and automatically create a shot drink for it.
    """
    try:
        club_uuid = UUID(liquor_data.club_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid club ID format")
    
    # Verify club ownership
    club = db.query(Club).filter(Club.id == club_uuid, Club.owner_id == current_user.id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found or access denied")
    
    # Check for duplicate
    existing = db.query(Liquor).filter(
        Liquor.club_id == club_uuid,
        Liquor.name == liquor_data.name
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Liquor '{liquor_data.name}' already exists")
    
    # Resolve image if not provided
    image_url = liquor_data.image_url
    if not image_url:
        image_url = _resolve_liquor_image(
            liquor_data.name,
            liquor_data.brand_name,
            liquor_data.liquor_type
        )
    
    # Create liquor
    liquor = Liquor(
        club_id=club_uuid,
        name=liquor_data.name,
        brand_name=liquor_data.brand_name or liquor_data.name,
        liquor_type=liquor_data.liquor_type,
        description=liquor_data.description,
        shot_price=liquor_data.shot_price,
        image_url=image_url,
        display_order=liquor_data.display_order or 0,
        is_available=liquor_data.is_available
    )
    db.add(liquor)
    db.flush()  # Get the liquor ID
    
    # Auto-create shot drink
    shot_drink = None
    if not liquor_data.skip_shot_creation:
        category_service = CategoryService()
        category_service.ensure_system_categories_exist(db)
        shot_drink = _create_shot_drink(db, liquor, category_service)
    
    db.commit()
    db.refresh(liquor)
    if shot_drink:
        db.refresh(shot_drink)
    
    response = LiquorWithShot.model_validate(liquor)
    if shot_drink:
        response.shot_drink = DrinkResponse.model_validate(shot_drink).model_dump()
        response.shot_drink_id = str(shot_drink.id)
    
    logger.info(f"Created liquor '{liquor.name}' with shot drink for club {club_id}")
    return response


@router.post("/batch", response_model=List[LiquorWithShot], status_code=status.HTTP_201_CREATED)
async def batch_create_liquors(
    club_id: str = Query(..., description="Club ID"),
    request: BatchLiquorRequest = ...,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """
    Batch create multiple liquors with auto-created shot drinks.
    """
    try:
        club_uuid = UUID(club_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid club ID format")
    
    # Verify club ownership
    club = db.query(Club).filter(Club.id == club_uuid, Club.owner_id == current_user.id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found or access denied")
    
    # Get existing liquors to avoid duplicates
    existing_names = {l.name.lower() for l in db.query(Liquor).filter(Liquor.club_id == club_uuid).all()}
    
    category_service = CategoryService()
    category_service.ensure_system_categories_exist(db)
    
    created_liquors = []
    for liquor_data in request.liquors:
        if liquor_data.name.lower() in existing_names:
            logger.info(f"Skipping duplicate liquor: {liquor_data.name}")
            continue
        
        # Resolve image
        image_url = liquor_data.image_url
        if not image_url:
            image_url = _resolve_liquor_image(
                liquor_data.name,
                liquor_data.brand_name,
                liquor_data.liquor_type
            )
        
        liquor = Liquor(
            club_id=club_uuid,
            name=liquor_data.name,
            brand_name=liquor_data.brand_name or liquor_data.name,
            liquor_type=liquor_data.liquor_type,
            shot_price=liquor_data.shot_price,
            image_url=image_url,
            is_available=True
        )
        db.add(liquor)
        db.flush()
        
        # Create shot drink
        shot_drink = _create_shot_drink(db, liquor, category_service)
        
        created_liquors.append((liquor, shot_drink))
        existing_names.add(liquor_data.name.lower())
    
    if not created_liquors:
        raise HTTPException(status_code=400, detail="All liquors already exist")
    
    db.commit()
    
    # Refresh and build response
    results = []
    for liquor, shot_drink in created_liquors:
        db.refresh(liquor)
        db.refresh(shot_drink)
        response = LiquorWithShot.model_validate(liquor)
        response.shot_drink = DrinkResponse.model_validate(shot_drink).model_dump()
        response.shot_drink_id = str(shot_drink.id)
        results.append(response)
    
    logger.info(f"Created {len(results)} liquors with shots for club {club_id}")
    return results


@router.get("/{liquor_id}", response_model=LiquorResponse)
async def get_liquor(
    liquor_id: str,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Get a specific liquor by ID."""
    try:
        liquor_uuid = UUID(liquor_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid liquor ID format")
    
    liquor = db.query(Liquor).filter(Liquor.id == liquor_uuid).first()
    if not liquor:
        raise HTTPException(status_code=404, detail="Liquor not found")
    
    # Verify club ownership
    club = db.query(Club).filter(Club.id == liquor.club_id, Club.owner_id == current_user.id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Access denied")
    
    return LiquorResponse.model_validate(liquor)


@router.put("/{liquor_id}", response_model=LiquorResponse)
async def update_liquor(
    liquor_id: str,
    update_data: LiquorUpdate,
    sync_shot_price: bool = Query(True, description="Also update the shot drink price"),
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Update a liquor. Optionally syncs the shot drink price."""
    try:
        liquor_uuid = UUID(liquor_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid liquor ID format")
    
    liquor = db.query(Liquor).filter(Liquor.id == liquor_uuid).first()
    if not liquor:
        raise HTTPException(status_code=404, detail="Liquor not found")
    
    # Verify club ownership
    club = db.query(Club).filter(Club.id == liquor.club_id, Club.owner_id == current_user.id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Access denied")
    
    # Update liquor fields
    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(liquor, key, value)
    
    # Sync shot drink price if requested
    if sync_shot_price and update_data.shot_price is not None:
        shot_drink = db.query(Drink).filter(
            Drink.liquor_id == liquor_uuid,
            Drink.drink_type == DrinkType.SHOT
        ).first()
        if shot_drink:
            shot_drink.price = update_data.shot_price
            # Also update name if liquor name changed
            if update_data.name:
                shot_drink.name = f"Shot of {update_data.name}"
    
    # Update availability of related shot drink
    if update_data.is_available is not None:
        shot_drink = db.query(Drink).filter(
            Drink.liquor_id == liquor_uuid,
            Drink.drink_type == DrinkType.SHOT
        ).first()
        if shot_drink:
            shot_drink.is_available = update_data.is_available
    
    db.commit()
    db.refresh(liquor)
    
    return LiquorResponse.model_validate(liquor)


@router.delete("/{liquor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_liquor(
    liquor_id: str,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Delete a liquor and its associated shot drink."""
    try:
        liquor_uuid = UUID(liquor_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid liquor ID format")
    
    liquor = db.query(Liquor).filter(Liquor.id == liquor_uuid).first()
    if not liquor:
        raise HTTPException(status_code=404, detail="Liquor not found")
    
    # Verify club ownership
    club = db.query(Club).filter(Club.id == liquor.club_id, Club.owner_id == current_user.id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Access denied")
    
    # Note: Associated drinks will be deleted via cascade
    db.delete(liquor)
    db.commit()
    
    logger.info(f"Deleted liquor {liquor_id}")


@router.patch("/{liquor_id}/availability", response_model=LiquorResponse)
async def toggle_liquor_availability(
    liquor_id: str,
    is_available: bool = Query(...),
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Toggle liquor availability. Also updates related shot and cocktail drinks."""
    try:
        liquor_uuid = UUID(liquor_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid liquor ID format")
    
    liquor = db.query(Liquor).filter(Liquor.id == liquor_uuid).first()
    if not liquor:
        raise HTTPException(status_code=404, detail="Liquor not found")
    
    # Verify club ownership
    club = db.query(Club).filter(Club.id == liquor.club_id, Club.owner_id == current_user.id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Access denied")
    
    liquor.is_available = is_available
    
    # Update all drinks using this liquor
    db.query(Drink).filter(Drink.liquor_id == liquor_uuid).update(
        {"is_available": is_available}
    )
    
    db.commit()
    db.refresh(liquor)
    
    return LiquorResponse.model_validate(liquor)

