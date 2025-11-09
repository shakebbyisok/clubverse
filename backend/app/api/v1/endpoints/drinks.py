"""
Drink parsing and batch creation endpoints.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from pydantic import BaseModel
from app.db.base import get_db
from app.models.user import User
from app.models.club import Club
from app.models.drink import Drink
from app.schemas.drink import DrinkCreate, DrinkResponse
from app.core.dependencies import get_current_club_owner
from app.core.llm_service import llm_service
from app.core.brand_logos import get_logo_url
from uuid import UUID

logger = logging.getLogger(__name__)

router = APIRouter()


class ParsePreviewRequest(BaseModel):
    """Request for parsing natural language drink input."""
    text: str


class DrinkPreview(BaseModel):
    """Preview data for a drink before saving."""
    name: str
    price: float
    category: str | None = None
    brand_name: str | None = None
    logo_url: str | None = None


class ParsePreviewResponse(BaseModel):
    """Response with parsed drinks and brand data."""
    drinks: List[DrinkPreview]


class BatchDrinkCreate(BaseModel):
    """Single drink for batch creation."""
    name: str
    price: float
    category: str | None = None
    brand_name: str | None = None
    logo_url: str | None = None


class BatchCreateRequest(BaseModel):
    """Request for batch drink creation."""
    drinks: List[BatchDrinkCreate]


def _get_brand_logo(brand_name: str) -> str | None:
    """
    Get logo URL for a brand name using the brand logos mapping.
    Tries exact match first, then falls back to base brand name.
    
    Args:
        brand_name: Brand name (may include variants)
        
    Returns:
        Logo URL string or None if not found
    """
    if not brand_name:
        return None
    
    # Try exact match first
    logo_url = get_logo_url(brand_name)
    if logo_url:
        return logo_url
    
    # Fallback: try base brand name (remove variants)
    import re
    base_name = brand_name.lower()
    
    # Remove common variants
    base_name = re.sub(r'\s+(manzana|red label|black label|7|fresa)$', '', base_name, flags=re.IGNORECASE)
    base_name = base_name.strip()
    
    # Try base name
    if base_name != brand_name.lower():
        logo_url = get_logo_url(base_name)
        if logo_url:
            return logo_url
    
    return None


@router.post("/parse-preview", response_model=ParsePreviewResponse)
async def parse_preview(
    request: ParsePreviewRequest,
    current_user: User = Depends(get_current_club_owner)
):
    """
    Parse natural language drink input and fetch brand logos for preview.
    
    Example input: "Absolut $10, Jack Daniel's $12, Havana Club $8"
    Returns structured drink data with logos from brand logo mapping.
    """
    if not request.text or len(request.text.strip()) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Input text must be at least 3 characters"
        )
    
    # Parse drinks using LLM
    try:
        parsed_drinks = await llm_service.parse_drinks_text(request.text)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LLM parsing service not available"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error parsing drinks: {str(e)}"
        )
    
    if not parsed_drinks:
        return ParsePreviewResponse(drinks=[])
    
    # Get logo URLs for each drink
    preview_drinks = []
    for drink in parsed_drinks:
        brand_name = drink.get("name")  # Use drink name as brand name
        logo_url = _get_brand_logo(brand_name)
        
        preview_drinks.append(DrinkPreview(
            name=drink["name"],
            price=drink["price"],
            category=drink.get("category"),
            brand_name=brand_name,
            logo_url=logo_url,
        ))
    
    return ParsePreviewResponse(drinks=preview_drinks)


@router.post("/batch", response_model=List[DrinkResponse], status_code=status.HTTP_201_CREATED)
async def batch_create_drinks(
    club_id: str,
    request: BatchCreateRequest,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """
    Create multiple drinks in batch.
    
    Used after preview - saves all drinks to database with brand data.
    """
    try:
        club_uuid = UUID(club_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid club ID format"
        )
    
    # Verify club ownership
    club = db.query(Club).filter(Club.id == club_uuid, Club.owner_id == current_user.id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found or you don't have permission"
        )
    
    if not request.drinks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No drinks provided"
        )
    
    # Check for existing drinks to avoid duplicates (match by name AND price)
    existing_drinks = db.query(Drink).filter(
        Drink.club_id == club_uuid,
        Drink.is_available == True
    ).all()
    
    # Use (name, price) as unique key - same name with different price is allowed
    existing_drink_keys = {(d.name.lower().strip(), float(d.price)) for d in existing_drinks}
    
    # Create all drinks (skip duplicates)
    created_drinks = []
    skipped_drinks = []
    
    for drink_data in request.drinks:
        drink_key = (drink_data.name.lower().strip(), float(drink_data.price))
        
        # Skip if drink already exists
        if drink_key in existing_drink_keys:
            skipped_drinks.append(drink_data.name)
            logger.info(f"Skipping duplicate drink: {drink_data.name} (${drink_data.price})")
            continue
        
        db_drink = Drink(
            club_id=club_uuid,
            name=drink_data.name,
            price=drink_data.price,
            category=drink_data.category,
            image_url=drink_data.logo_url,  # Store logo path (e.g., "/assets/logos/absolut.png")
            brand_name=drink_data.brand_name,
            brand_colors=None,  # No longer storing colors
            brand_fonts=None,   # No longer storing fonts
            is_available=True,
        )
        db.add(db_drink)
        created_drinks.append(db_drink)
        existing_drink_keys.add(drink_key)  # Add to set to prevent duplicates within this batch
    
    if not created_drinks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"All drinks already exist. Skipped: {', '.join(skipped_drinks)}"
        )
    
    db.commit()
    
    # Refresh all drinks
    for drink in created_drinks:
        db.refresh(drink)
    
    logger.info(f"Created {len(created_drinks)} drinks, skipped {len(skipped_drinks)} duplicates")
    
    # Convert UUIDs to strings before validation
    return [
        DrinkResponse.model_validate({
            **{k: str(v) if isinstance(v, UUID) and k in ['id', 'club_id'] else v 
               for k, v in drink.__dict__.items() if not k.startswith('_')}
        }) 
        for drink in created_drinks
    ]

