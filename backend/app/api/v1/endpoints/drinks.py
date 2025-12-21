"""
Drink parsing and batch creation endpoints.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
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
from app.core.image_resolver import image_resolver
from app.core.default_categories import get_or_create_default_categories
from app.core.category_service import CategoryService
from app.models.category import Category, Subcategory
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
    club_id: str = Query(None),
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
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
    
    # Get or create default categories if club_id provided
    categories_map = {}
    subcategories_map = {}
    if club_id:
        try:
            club_uuid = UUID(club_id)
            categories = get_or_create_default_categories(club_uuid, db)
            
            # Build maps for quick lookup
            for cat in categories:
                categories_map[cat.name.lower()] = cat
                for subcat in cat.subcategories:
                    subcategories_map[f"{cat.name.lower()}_{subcat.name.lower()}"] = subcat
        except Exception as e:
            logger.warning(f"Could not load categories for club {club_id}: {e}")
    
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
    
    # Map categories to our structure
    def map_category(category: str, subcategory: str = None) -> str:
        """Map LLM category to our category name"""
        if not category:
            return None
        
        cat_lower = category.lower()
        subcat_lower = (subcategory or "").lower()
        
        # Map LLM categories to our categories
        if cat_lower == "liquors":
            return "Liquors"
        elif cat_lower == "drinks_liquor_soda":
            return "Drinks (liquor + soda)"
        elif cat_lower == "beers":
            return "Beers"
        elif cat_lower == "sodas":
            return "Sodas"
        elif cat_lower == "wines":
            return "Wines"
        elif cat_lower in ["shot", "cocktail"]:
            # Legacy categories
            return "Liquors" if cat_lower == "shot" else "Drinks (liquor + soda)"
        
        return None
    
    # Get logo URLs and map categories
    preview_drinks = []
    for drink in parsed_drinks:
        brand_name = drink.get("name")
        
        # Map category first (needed for image resolver)
        llm_category = drink.get("category")
        llm_subcategory = drink.get("subcategory")
        mapped_category = map_category(llm_category, llm_subcategory)
        
        # Use image resolver (checks brand logos first, then generic fallbacks)
        # Works for liquors, beers, and sodas
        logo_url = image_resolver.resolve_drink_image(
            drink_name=drink["name"],
            category=mapped_category or llm_category,
            brand_name=brand_name
        )
        
        # Fallback to old method if image resolver returns None
        if not logo_url:
            logo_url = _get_brand_logo(brand_name)
        
        preview_drinks.append(DrinkPreview(
            name=drink["name"],
            price=drink["price"],
            category=mapped_category or llm_category,  # Fallback to original if mapping fails
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
    
    # Get or create default categories
    categories = get_or_create_default_categories(club_uuid, db)
    category_service = CategoryService()
    
    # Build category maps
    categories_by_name = {cat.name.lower(): cat for cat in categories}
    subcategories_by_name = {}
    for cat in categories:
        for subcat in cat.subcategories:
            key = f"{cat.name.lower()}_{subcat.name.lower()}"
            subcategories_by_name[key] = subcat
    
    # Helper to find category/subcategory
    def find_category_assignment(category_name: str, drink_name: str) -> tuple:
        """Find category_id and subcategory_id for a drink"""
        if not category_name:
            return None, None
        
        cat_name_lower = category_name.lower()
        drink_lower = drink_name.lower()
        
        # Map category names
        if cat_name_lower in ["liquors", "liquor", "shot"]:
            cat = categories_by_name.get("liquors")
            if not cat:
                return None, None
            
            # Determine subcategory based on drink name
            if "gin" in drink_lower or any(g in drink_lower for g in ["beefeater", "seagram", "puerto indias", "bombay", "hendrick"]):
                subcat_key = "liquors_gin"
            elif "rum" in drink_lower or any(r in drink_lower for r in ["cacique", "brugal", "barcelo", "havana"]):
                subcat_key = "liquors_rum"
            elif "whisky" in drink_lower or "whiskey" in drink_lower or any(w in drink_lower for w in ["ballantine", "red label", "black label", "jack daniel"]):
                subcat_key = "liquors_whisky"
            else:
                subcat_key = "liquors_shots"
            
            subcat = subcategories_by_name.get(subcat_key)
            return str(cat.id) if cat else None, str(subcat.id) if subcat else None
        
        elif cat_name_lower in ["drinks (liquor + soda)", "drinks_liquor_soda", "cocktail", "cubata"]:
            cat = categories_by_name.get("drinks (liquor + soda)")
            return str(cat.id) if cat else None, None
        
        elif cat_name_lower in ["beers", "beer"]:
            cat = categories_by_name.get("beers")
            return str(cat.id) if cat else None, None
        
        elif cat_name_lower in ["sodas", "soda"]:
            cat = categories_by_name.get("sodas")
            return str(cat.id) if cat else None, None
        
        elif cat_name_lower in ["wines", "wine"]:
            cat = categories_by_name.get("wines")
            return str(cat.id) if cat else None, None
        
        return None, None
    
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
        
        # Find category assignment
        category_id, subcategory_id = find_category_assignment(drink_data.category, drink_data.name)
        
        # Resolve image URL using image resolver (handles liquors, beers, sodas)
        # Use provided logo_url if available, otherwise resolve from drink name/category
        image_url = drink_data.logo_url
        if not image_url:
            image_url = image_resolver.resolve_drink_image(
                drink_name=drink_data.name,
                category=drink_data.category,
                brand_name=drink_data.brand_name or drink_data.name
            )
        
        db_drink = Drink(
            club_id=club_uuid,
            name=drink_data.name,
            price=drink_data.price,
            category=drink_data.category,  # Keep legacy field
            category_id=UUID(category_id) if category_id else None,
            subcategory_id=UUID(subcategory_id) if subcategory_id else None,
            image_url=image_url,  # Resolved logo path (e.g., "/assets/logos/liquors/absolut.png")
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

