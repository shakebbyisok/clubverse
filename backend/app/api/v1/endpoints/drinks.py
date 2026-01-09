"""
Drink parsing and batch creation endpoints.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.db.base import get_db
from app.models.user import User
from app.models.club import Club
from app.models.drink import Drink, DrinkType
from app.models.liquor import Liquor, LiquorType
from app.models.soda import Soda
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
    category: str | None = None  # Legacy text category from AI
    category_id: str | None = None  # Matched system/custom category ID
    category_icon: str | None = None  # Category emoji icon
    brand_name: str | None = None
    logo_url: str | None = None


class ParsePreviewResponse(BaseModel):
    """Response with parsed drinks and brand data."""
    drinks: List[DrinkPreview]


class BatchDrinkCreate(BaseModel):
    """Single drink for batch creation."""
    name: str
    price: float
    category: str | None = None  # Legacy text category
    category_id: str | None = None  # Category ID (system or custom)
    brand_name: str | None = None
    logo_url: str | None = None


class BatchCreateRequest(BaseModel):
    """Request for batch drink creation."""
    drinks: List[BatchDrinkCreate]


# ============== Ingredient Parsing (Liquors & Sodas) ==============

class LiquorPreview(BaseModel):
    """Preview data for a liquor before saving."""
    name: str
    price: float
    liquor_type: str
    brand_name: Optional[str] = None
    image_url: Optional[str] = None


class SodaPreview(BaseModel):
    """Preview data for a soda before saving."""
    name: str
    price: float
    price_addon: float = 0
    brand_name: Optional[str] = None
    image_url: Optional[str] = None


class ParseIngredientsResponse(BaseModel):
    """Response with parsed liquors and sodas."""
    liquors: List[LiquorPreview]
    sodas: List[SodaPreview]


class BatchIngredientsCreate(BaseModel):
    """Request for batch creating liquors and sodas."""
    liquors: List[LiquorPreview]
    sodas: List[SodaPreview]


class BatchIngredientsResponse(BaseModel):
    """Response after batch creating ingredients."""
    liquors_created: int
    sodas_created: int
    shots_created: int
    liquor_ids: List[str]
    soda_ids: List[str]


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
    
    # Fetch system categories for matching
    category_service = CategoryService()
    category_service.ensure_system_categories_exist(db)
    system_categories = category_service.get_system_categories(db)
    
    # Build category lookup maps (name -> category)
    category_by_name = {cat.name.lower(): cat for cat in system_categories}
    
    # Map LLM category names to our system category names
    LLM_CATEGORY_MAP = {
        "liquors": "Spirits",
        "liquor": "Spirits",
        "spirits": "Spirits",
        "beers": "Beers",
        "beer": "Beers",
        "wines": "Wines",
        "wine": "Wines",
        "sodas": "Sodas",
        "soda": "Sodas",
        "soft drinks": "Sodas",
        "cocktails": "Cocktails",
        "cocktail": "Cocktails",
        "drinks_liquor_soda": "Cocktails",
        "mixed drinks": "Cocktails",
        "shots": "Shots",
        "shot": "Shots",
        "shooters": "Shots",
        "non-alcoholic": "Non-Alcoholic",
        "mocktails": "Non-Alcoholic",
        "alcohol-free": "Non-Alcoholic",
    }
    
    def match_category(llm_category: str) -> tuple:
        """
        Match LLM category to system category.
        Returns: (category_name, category_id, category_icon)
        """
        if not llm_category:
            return None, None, None
        
        cat_lower = llm_category.lower().strip()
        
        # Try direct mapping first
        mapped_name = LLM_CATEGORY_MAP.get(cat_lower)
        if mapped_name:
            cat = category_by_name.get(mapped_name.lower())
            if cat:
                return cat.name, str(cat.id), cat.icon
        
        # Try direct match with system categories
        cat = category_by_name.get(cat_lower)
        if cat:
            return cat.name, str(cat.id), cat.icon
        
        # No match - return original category name without ID
        return llm_category, None, None
    
    # Get logo URLs and map categories
    preview_drinks = []
    for drink in parsed_drinks:
        brand_name = drink.get("name")
        
        # Map category to system category
        llm_category = drink.get("category")
        category_name, category_id, category_icon = match_category(llm_category)
        
        # Use image resolver (checks brand logos first, then generic fallbacks)
        logo_url = image_resolver.resolve_drink_image(
            drink_name=drink["name"],
            category=category_name or llm_category,
            brand_name=brand_name
        )
        
        # Fallback to old method if image resolver returns None
        if not logo_url:
            logo_url = _get_brand_logo(brand_name)
        
        preview_drinks.append(DrinkPreview(
            name=drink["name"],
            price=drink["price"],
            category=category_name,
            category_id=category_id,
            category_icon=category_icon,
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
        
        # Use category_id if provided directly (from frontend picker)
        # Otherwise fall back to legacy category name matching
        if drink_data.category_id:
            category_id = drink_data.category_id
            subcategory_id = None
        else:
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
        
        # Parse category_id to UUID if it's a string
        cat_uuid = None
        if category_id:
            try:
                cat_uuid = UUID(category_id) if isinstance(category_id, str) else category_id
            except ValueError:
                logger.warning(f"Invalid category_id format: {category_id}")
        
        db_drink = Drink(
            club_id=club_uuid,
            name=drink_data.name,
            price=drink_data.price,
            category=drink_data.category,  # Keep legacy field
            category_id=cat_uuid,
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


# ============== Ingredient Parsing Endpoints ==============

@router.post("/parse-ingredients", response_model=ParseIngredientsResponse)
async def parse_ingredients(
    request: ParsePreviewRequest,
    club_id: str = Query(None),
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """
    Parse natural language input and separate into liquors and sodas.
    
    Example input: "Absolut $8, Jack Daniels $10, Beefeater $9, Coca-Cola $3, Red Bull $4"
    Returns separate lists of liquors (spirits) and sodas (mixers) with images.
    """
    if not request.text or len(request.text.strip()) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Input text must be at least 3 characters"
        )
    
    # Parse using LLM
    try:
        parsed = await llm_service.parse_ingredients(request.text)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LLM parsing service not available"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error parsing ingredients: {str(e)}"
        )
    
    # Build previews with images
    liquor_previews = []
    for liq in parsed.get("liquors", []):
        image_url = image_resolver.resolve_drink_image(
            drink_name=liq["name"],
            category="liquors",
            brand_name=liq["name"]
        )
        if not image_url:
            image_url = _get_brand_logo(liq["name"])
        
        liquor_previews.append(LiquorPreview(
            name=liq["name"],
            price=liq["price"],
            liquor_type=liq.get("liquor_type", "other"),
            brand_name=liq["name"],
            image_url=image_url
        ))
    
    soda_previews = []
    for soda in parsed.get("sodas", []):
        image_url = image_resolver.resolve_drink_image(
            drink_name=soda["name"],
            category="sodas",
            brand_name=soda["name"]
        )
        if not image_url:
            image_url = _get_brand_logo(soda["name"])
        
        soda_previews.append(SodaPreview(
            name=soda["name"],
            price=soda.get("price", 0),
            price_addon=soda.get("price_addon", 0),
            brand_name=soda["name"],
            image_url=image_url
        ))
    
    return ParseIngredientsResponse(
        liquors=liquor_previews,
        sodas=soda_previews
    )


@router.post("/batch-ingredients", response_model=BatchIngredientsResponse, status_code=status.HTTP_201_CREATED)
async def batch_create_ingredients(
    club_id: str = Query(..., description="Club ID"),
    request: BatchIngredientsCreate = ...,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """
    Batch create liquors and sodas from parsed preview.
    Automatically creates shot drinks for each liquor.
    """
    try:
        club_uuid = UUID(club_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid club ID format")
    
    # Verify club ownership
    club = db.query(Club).filter(Club.id == club_uuid, Club.owner_id == current_user.id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found or access denied")
    
    # Get existing to avoid duplicates
    existing_liquor_names = {l.name.lower() for l in db.query(Liquor).filter(Liquor.club_id == club_uuid).all()}
    existing_soda_names = {s.name.lower() for s in db.query(Soda).filter(Soda.club_id == club_uuid).all()}
    
    # Get shots category
    category_service = CategoryService()
    category_service.ensure_system_categories_exist(db)
    system_categories = category_service.get_system_categories(db)
    shots_category = next((c for c in system_categories if c.name == "Shots"), None)
    
    # Create liquors and shots
    created_liquor_ids = []
    shots_created = 0
    
    for liq_data in request.liquors:
        if liq_data.name.lower() in existing_liquor_names:
            continue
        
        # Map liquor_type string to enum
        try:
            liquor_type_enum = LiquorType(liq_data.liquor_type.lower())
        except (ValueError, AttributeError):
            liquor_type_enum = LiquorType.OTHER
        
        liquor = Liquor(
            club_id=club_uuid,
            name=liq_data.name,
            brand_name=liq_data.brand_name or liq_data.name,
            liquor_type=liquor_type_enum,
            shot_price=liq_data.price,
            image_url=liq_data.image_url,
            is_available=True
        )
        db.add(liquor)
        db.flush()
        
        # Auto-create shot drink
        shot_drink = Drink(
            club_id=club_uuid,
            name=f"Shot of {liquor.name}",
            description=f"Pure {liquor.name} shot",
            price=liquor.shot_price,
            drink_type=DrinkType.SHOT,
            liquor_id=liquor.id,
            category="Shots",
            category_id=shots_category.id if shots_category else None,
            image_url=liquor.image_url,
            brand_name=liquor.brand_name,
            is_available=True
        )
        db.add(shot_drink)
        
        created_liquor_ids.append(str(liquor.id))
        existing_liquor_names.add(liq_data.name.lower())
        shots_created += 1
    
    # Create sodas
    created_soda_ids = []
    
    for soda_data in request.sodas:
        if soda_data.name.lower() in existing_soda_names:
            continue
        
        soda = Soda(
            club_id=club_uuid,
            name=soda_data.name,
            brand_name=soda_data.brand_name or soda_data.name,
            price=soda_data.price,
            price_addon=soda_data.price_addon,
            image_url=soda_data.image_url,
            is_available=True
        )
        db.add(soda)
        db.flush()
        
        created_soda_ids.append(str(soda.id))
        existing_soda_names.add(soda_data.name.lower())
    
    db.commit()
    
    logger.info(f"Created {len(created_liquor_ids)} liquors, {len(created_soda_ids)} sodas, {shots_created} shots for club {club_id}")
    
    return BatchIngredientsResponse(
        liquors_created=len(created_liquor_ids),
        sodas_created=len(created_soda_ids),
        shots_created=shots_created,
        liquor_ids=created_liquor_ids,
        soda_ids=created_soda_ids
    )

