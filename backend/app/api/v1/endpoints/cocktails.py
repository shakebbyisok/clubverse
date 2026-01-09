"""
Cocktail management endpoints.
Handles creating drinks by combining liquors + sodas.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from decimal import Decimal

from app.db.base import get_db
from app.models.user import User
from app.models.club import Club
from app.models.liquor import Liquor
from app.models.soda import Soda
from app.models.drink import Drink, DrinkType
from app.schemas.drink import (
    DrinkResponse, CocktailCreate, CocktailBulkCreate,
    CocktailPreview, CocktailPreviewResponse
)
from app.core.dependencies import get_current_club_owner
from app.core.category_service import CategoryService

logger = logging.getLogger(__name__)
router = APIRouter()


def _get_cocktails_category_id(db: Session) -> Optional[UUID]:
    """Get the system Cocktails category ID."""
    category_service = CategoryService()
    category_service.ensure_system_categories_exist(db)
    system_categories = category_service.get_system_categories(db)
    cocktails_category = next((c for c in system_categories if c.name == "Cocktails"), None)
    return cocktails_category.id if cocktails_category else None


@router.get("/preview", response_model=CocktailPreviewResponse)
async def preview_cocktails(
    club_id: str = Query(..., description="Club ID"),
    liquor_ids: Optional[str] = Query(None, description="Comma-separated liquor IDs (optional, uses all if not provided)"),
    soda_ids: Optional[str] = Query(None, description="Comma-separated soda IDs (optional, uses all if not provided)"),
    price_markup: float = Query(2.0, description="Price markup over shot price"),
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """
    Preview all possible cocktail combinations from selected liquors and sodas.
    If no IDs provided, shows all available combinations.
    """
    try:
        club_uuid = UUID(club_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid club ID format")
    
    # Verify club ownership
    club = db.query(Club).filter(Club.id == club_uuid, Club.owner_id == current_user.id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found or access denied")
    
    # Get liquors
    liquor_query = db.query(Liquor).filter(
        Liquor.club_id == club_uuid,
        Liquor.is_available == True
    )
    if liquor_ids:
        try:
            liquor_uuid_list = [UUID(lid.strip()) for lid in liquor_ids.split(",")]
            liquor_query = liquor_query.filter(Liquor.id.in_(liquor_uuid_list))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid liquor ID format")
    liquors = liquor_query.all()
    
    # Get sodas
    soda_query = db.query(Soda).filter(
        Soda.club_id == club_uuid,
        Soda.is_available == True
    )
    if soda_ids:
        try:
            soda_uuid_list = [UUID(sid.strip()) for sid in soda_ids.split(",")]
            soda_query = soda_query.filter(Soda.id.in_(soda_uuid_list))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid soda ID format")
    sodas = soda_query.all()
    
    if not liquors:
        raise HTTPException(status_code=400, detail="No liquors found")
    if not sodas:
        raise HTTPException(status_code=400, detail="No sodas found")
    
    # Get existing cocktails to filter out
    existing_combos = set()
    existing_cocktails = db.query(Drink).filter(
        Drink.club_id == club_uuid,
        Drink.drink_type == DrinkType.COCKTAIL,
        Drink.liquor_id.isnot(None),
        Drink.soda_id.isnot(None)
    ).all()
    for cocktail in existing_cocktails:
        existing_combos.add((str(cocktail.liquor_id), str(cocktail.soda_id)))
    
    # Generate preview for each combination
    previews = []
    for liquor in liquors:
        for soda in sodas:
            combo_key = (str(liquor.id), str(soda.id))
            if combo_key in existing_combos:
                continue  # Skip existing combinations
            
            suggested_price = float(liquor.shot_price) + float(soda.price_addon) + price_markup
            
            previews.append(CocktailPreview(
                liquor_id=str(liquor.id),
                liquor_name=liquor.name,
                soda_id=str(soda.id),
                soda_name=soda.name,
                suggested_name=f"{liquor.name} + {soda.name}",
                suggested_price=suggested_price,
                liquor_image_url=liquor.image_url
            ))
    
    return CocktailPreviewResponse(
        cocktails=previews,
        total_count=len(previews)
    )


@router.post("", response_model=DrinkResponse, status_code=status.HTTP_201_CREATED)
async def create_cocktail(
    cocktail_data: CocktailCreate,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """
    Create a single cocktail from a liquor + soda combination.
    """
    try:
        club_uuid = UUID(cocktail_data.club_id)
        liquor_uuid = UUID(cocktail_data.liquor_id)
        soda_uuid = UUID(cocktail_data.soda_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")
    
    # Verify club ownership
    club = db.query(Club).filter(Club.id == club_uuid, Club.owner_id == current_user.id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found or access denied")
    
    # Get liquor and soda
    liquor = db.query(Liquor).filter(Liquor.id == liquor_uuid, Liquor.club_id == club_uuid).first()
    if not liquor:
        raise HTTPException(status_code=404, detail="Liquor not found")
    
    soda = db.query(Soda).filter(Soda.id == soda_uuid, Soda.club_id == club_uuid).first()
    if not soda:
        raise HTTPException(status_code=404, detail="Soda not found")
    
    # Check for existing cocktail with same combo
    existing = db.query(Drink).filter(
        Drink.club_id == club_uuid,
        Drink.liquor_id == liquor_uuid,
        Drink.soda_id == soda_uuid
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="This cocktail combination already exists")
    
    # Generate name and price if not provided
    name = cocktail_data.name or f"{liquor.name} + {soda.name}"
    price = cocktail_data.price
    if price is None:
        # Default: shot price + soda addon + $2 markup
        price = Decimal(str(liquor.shot_price)) + Decimal(str(soda.price_addon)) + Decimal("2.00")
    
    # Get cocktails category
    cocktails_category_id = _get_cocktails_category_id(db)
    
    # Create the cocktail drink
    cocktail = Drink(
        club_id=club_uuid,
        name=name,
        description=cocktail_data.description or f"{liquor.name} mixed with {soda.name}",
        price=price,
        drink_type=DrinkType.COCKTAIL,
        liquor_id=liquor_uuid,
        soda_id=soda_uuid,
        category="Cocktails",
        category_id=cocktails_category_id,
        image_url=cocktail_data.image_url or liquor.image_url,
        brand_name=liquor.brand_name,
        is_available=liquor.is_available and soda.is_available
    )
    
    db.add(cocktail)
    db.commit()
    db.refresh(cocktail)
    
    logger.info(f"Created cocktail '{name}' for club {cocktail_data.club_id}")
    return DrinkResponse.model_validate(cocktail)


@router.post("/bulk", response_model=List[DrinkResponse], status_code=status.HTTP_201_CREATED)
async def bulk_create_cocktails(
    request: CocktailBulkCreate,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """
    Bulk create cocktails from selected liquors and sodas.
    Creates one cocktail for each unique liquor+soda combination.
    """
    try:
        club_uuid = UUID(request.club_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid club ID format")
    
    # Verify club ownership
    club = db.query(Club).filter(Club.id == club_uuid, Club.owner_id == current_user.id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found or access denied")
    
    # Parse UUIDs
    try:
        liquor_uuids = [UUID(lid) for lid in request.liquor_ids]
        soda_uuids = [UUID(sid) for sid in request.soda_ids]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format in lists")
    
    # Get liquors and sodas
    liquors = db.query(Liquor).filter(
        Liquor.id.in_(liquor_uuids),
        Liquor.club_id == club_uuid
    ).all()
    
    sodas = db.query(Soda).filter(
        Soda.id.in_(soda_uuids),
        Soda.club_id == club_uuid
    ).all()
    
    if not liquors:
        raise HTTPException(status_code=400, detail="No valid liquors found")
    if not sodas:
        raise HTTPException(status_code=400, detail="No valid sodas found")
    
    # Get existing cocktails
    existing_combos = set()
    existing_cocktails = db.query(Drink).filter(
        Drink.club_id == club_uuid,
        Drink.drink_type == DrinkType.COCKTAIL
    ).all()
    for cocktail in existing_cocktails:
        if cocktail.liquor_id and cocktail.soda_id:
            existing_combos.add((cocktail.liquor_id, cocktail.soda_id))
    
    # Get cocktails category
    cocktails_category_id = _get_cocktails_category_id(db)
    
    # Create cocktails for each combination
    created_cocktails = []
    for liquor in liquors:
        for soda in sodas:
            if (liquor.id, soda.id) in existing_combos:
                continue
            
            price = Decimal(str(liquor.shot_price)) + Decimal(str(soda.price_addon)) + request.price_markup
            
            cocktail = Drink(
                club_id=club_uuid,
                name=f"{liquor.name} + {soda.name}",
                description=f"{liquor.name} mixed with {soda.name}",
                price=price,
                drink_type=DrinkType.COCKTAIL,
                liquor_id=liquor.id,
                soda_id=soda.id,
                category="Cocktails",
                category_id=cocktails_category_id,
                image_url=liquor.image_url,
                brand_name=liquor.brand_name,
                is_available=liquor.is_available and soda.is_available
            )
            db.add(cocktail)
            created_cocktails.append(cocktail)
            existing_combos.add((liquor.id, soda.id))
    
    if not created_cocktails:
        raise HTTPException(status_code=400, detail="All cocktail combinations already exist")
    
    db.commit()
    
    for cocktail in created_cocktails:
        db.refresh(cocktail)
    
    logger.info(f"Created {len(created_cocktails)} cocktails for club {request.club_id}")
    return [DrinkResponse.model_validate(c) for c in created_cocktails]


@router.get("", response_model=List[DrinkResponse])
async def get_cocktails(
    club_id: str = Query(..., description="Club ID"),
    include_unavailable: bool = Query(False),
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Get all cocktails for a club."""
    try:
        club_uuid = UUID(club_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid club ID format")
    
    # Verify club ownership
    club = db.query(Club).filter(Club.id == club_uuid, Club.owner_id == current_user.id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found or access denied")
    
    query = db.query(Drink).filter(
        Drink.club_id == club_uuid,
        Drink.drink_type == DrinkType.COCKTAIL
    )
    
    if not include_unavailable:
        query = query.filter(Drink.is_available == True)
    
    cocktails = query.order_by(Drink.name).all()
    return [DrinkResponse.model_validate(c) for c in cocktails]


@router.delete("/{cocktail_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cocktail(
    cocktail_id: str,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """Delete a cocktail."""
    try:
        cocktail_uuid = UUID(cocktail_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid cocktail ID format")
    
    cocktail = db.query(Drink).filter(
        Drink.id == cocktail_uuid,
        Drink.drink_type == DrinkType.COCKTAIL
    ).first()
    
    if not cocktail:
        raise HTTPException(status_code=404, detail="Cocktail not found")
    
    # Verify club ownership
    club = db.query(Club).filter(Club.id == cocktail.club_id, Club.owner_id == current_user.id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Access denied")
    
    db.delete(cocktail)
    db.commit()
    
    logger.info(f"Deleted cocktail {cocktail_id}")

