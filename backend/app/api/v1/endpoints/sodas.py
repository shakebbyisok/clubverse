"""
Soda management endpoints.
Handles CRUD operations for sodas (mixers).
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.db.base import get_db
from app.models.user import User
from app.models.club import Club
from app.models.soda import Soda
from app.models.drink import Drink
from app.schemas.soda import (
    SodaCreate, SodaUpdate, SodaResponse,
    BatchSodaCreate, BatchSodaRequest
)
from app.core.dependencies import get_current_club_owner
from app.core.image_resolver import image_resolver
from app.core.brand_logos import get_logo_url

logger = logging.getLogger(__name__)
router = APIRouter()


def _resolve_soda_image(name: str, brand_name: Optional[str]) -> Optional[str]:
    """Resolve image URL for a soda."""
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
        category="sodas",
        brand_name=brand_name or name
    )


@router.get("", response_model=List[SodaResponse])
async def get_sodas(
    club_id: str = Query(..., description="Club ID to get sodas for"),
    include_unavailable: bool = Query(False, description="Include unavailable sodas"),
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Get all sodas for a club."""
    try:
        club_uuid = UUID(club_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid club ID format")
    
    # Verify club ownership
    club = db.query(Club).filter(Club.id == club_uuid, Club.owner_id == current_user.id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found or access denied")
    
    query = db.query(Soda).filter(Soda.club_id == club_uuid)
    
    if not include_unavailable:
        query = query.filter(Soda.is_available == True)
    
    sodas = query.order_by(Soda.display_order, Soda.name).all()
    return [SodaResponse.model_validate(s) for s in sodas]


@router.post("", response_model=SodaResponse, status_code=status.HTTP_201_CREATED)
async def create_soda(
    soda_data: SodaCreate,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Create a new soda."""
    try:
        club_uuid = UUID(soda_data.club_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid club ID format")
    
    # Verify club ownership
    club = db.query(Club).filter(Club.id == club_uuid, Club.owner_id == current_user.id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found or access denied")
    
    # Check for duplicate
    existing = db.query(Soda).filter(
        Soda.club_id == club_uuid,
        Soda.name == soda_data.name
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Soda '{soda_data.name}' already exists")
    
    # Resolve image if not provided
    image_url = soda_data.image_url
    if not image_url:
        image_url = _resolve_soda_image(soda_data.name, soda_data.brand_name)
    
    soda = Soda(
        club_id=club_uuid,
        name=soda_data.name,
        brand_name=soda_data.brand_name or soda_data.name,
        description=soda_data.description,
        price=soda_data.price,
        price_addon=soda_data.price_addon,
        image_url=image_url,
        display_order=soda_data.display_order or 0,
        is_available=soda_data.is_available
    )
    db.add(soda)
    db.commit()
    db.refresh(soda)
    
    logger.info(f"Created soda '{soda.name}' for club {soda_data.club_id}")
    return SodaResponse.model_validate(soda)


@router.post("/batch", response_model=List[SodaResponse], status_code=status.HTTP_201_CREATED)
async def batch_create_sodas(
    club_id: str = Query(..., description="Club ID"),
    request: BatchSodaRequest = ...,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Batch create multiple sodas."""
    try:
        club_uuid = UUID(club_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid club ID format")
    
    # Verify club ownership
    club = db.query(Club).filter(Club.id == club_uuid, Club.owner_id == current_user.id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found or access denied")
    
    # Get existing sodas to avoid duplicates
    existing_names = {s.name.lower() for s in db.query(Soda).filter(Soda.club_id == club_uuid).all()}
    
    created_sodas = []
    for soda_data in request.sodas:
        if soda_data.name.lower() in existing_names:
            logger.info(f"Skipping duplicate soda: {soda_data.name}")
            continue
        
        # Resolve image
        image_url = soda_data.image_url
        if not image_url:
            image_url = _resolve_soda_image(soda_data.name, soda_data.brand_name)
        
        soda = Soda(
            club_id=club_uuid,
            name=soda_data.name,
            brand_name=soda_data.brand_name or soda_data.name,
            price=soda_data.price,
            price_addon=soda_data.price_addon,
            image_url=image_url,
            is_available=True
        )
        db.add(soda)
        created_sodas.append(soda)
        existing_names.add(soda_data.name.lower())
    
    if not created_sodas:
        raise HTTPException(status_code=400, detail="All sodas already exist")
    
    db.commit()
    
    for soda in created_sodas:
        db.refresh(soda)
    
    logger.info(f"Created {len(created_sodas)} sodas for club {club_id}")
    return [SodaResponse.model_validate(s) for s in created_sodas]


@router.get("/{soda_id}", response_model=SodaResponse)
async def get_soda(
    soda_id: str,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Get a specific soda by ID."""
    try:
        soda_uuid = UUID(soda_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid soda ID format")
    
    soda = db.query(Soda).filter(Soda.id == soda_uuid).first()
    if not soda:
        raise HTTPException(status_code=404, detail="Soda not found")
    
    # Verify club ownership
    club = db.query(Club).filter(Club.id == soda.club_id, Club.owner_id == current_user.id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Access denied")
    
    return SodaResponse.model_validate(soda)


@router.put("/{soda_id}", response_model=SodaResponse)
async def update_soda(
    soda_id: str,
    update_data: SodaUpdate,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Update a soda."""
    try:
        soda_uuid = UUID(soda_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid soda ID format")
    
    soda = db.query(Soda).filter(Soda.id == soda_uuid).first()
    if not soda:
        raise HTTPException(status_code=404, detail="Soda not found")
    
    # Verify club ownership
    club = db.query(Club).filter(Club.id == soda.club_id, Club.owner_id == current_user.id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Access denied")
    
    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(soda, key, value)
    
    db.commit()
    db.refresh(soda)
    
    return SodaResponse.model_validate(soda)


@router.delete("/{soda_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_soda(
    soda_id: str,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Delete a soda."""
    try:
        soda_uuid = UUID(soda_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid soda ID format")
    
    soda = db.query(Soda).filter(Soda.id == soda_uuid).first()
    if not soda:
        raise HTTPException(status_code=404, detail="Soda not found")
    
    # Verify club ownership
    club = db.query(Club).filter(Club.id == soda.club_id, Club.owner_id == current_user.id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Access denied")
    
    # Note: Associated drinks will be deleted via cascade
    db.delete(soda)
    db.commit()
    
    logger.info(f"Deleted soda {soda_id}")


@router.patch("/{soda_id}/availability", response_model=SodaResponse)
async def toggle_soda_availability(
    soda_id: str,
    is_available: bool = Query(...),
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Toggle soda availability. Also updates related cocktail drinks."""
    try:
        soda_uuid = UUID(soda_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid soda ID format")
    
    soda = db.query(Soda).filter(Soda.id == soda_uuid).first()
    if not soda:
        raise HTTPException(status_code=404, detail="Soda not found")
    
    # Verify club ownership
    club = db.query(Club).filter(Club.id == soda.club_id, Club.owner_id == current_user.id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Access denied")
    
    soda.is_available = is_available
    
    # Update all cocktails using this soda
    db.query(Drink).filter(Drink.soda_id == soda_uuid).update(
        {"is_available": is_available}
    )
    
    db.commit()
    db.refresh(soda)
    
    return SodaResponse.model_validate(soda)

