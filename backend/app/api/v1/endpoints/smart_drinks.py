"""
Smart drink parsing endpoint.
Handles intelligent creation of liquors, sodas, cocktails, and categories from natural language.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from decimal import Decimal
from pydantic import BaseModel

from app.db.base import get_db
from app.models.user import User
from app.models.club import Club
from app.models.liquor import Liquor, LiquorType
from app.models.soda import Soda
from app.models.drink import Drink, DrinkType
from app.models.category import Category
from app.core.dependencies import get_current_club_owner
from app.core.llm_service import llm_service
from app.core.image_resolver import image_resolver
from app.core.brand_logos import get_logo_url
from app.core.category_service import CategoryService

logger = logging.getLogger(__name__)
router = APIRouter()


# ============== Schemas ==============

class SmartParseRequest(BaseModel):
    """Request for smart parsing."""
    text: str


class LiquorPreviewItem(BaseModel):
    name: str
    price: float
    liquor_type: str
    is_new: bool
    image_url: Optional[str] = None
    existing_id: Optional[str] = None


class SodaPreviewItem(BaseModel):
    name: str
    price: float
    price_addon: float
    is_new: bool
    image_url: Optional[str] = None
    existing_id: Optional[str] = None


class CocktailPreviewItem(BaseModel):
    name: str
    price: float
    liquor_name: str
    liquor_exists: bool
    liquor_id: Optional[str] = None
    soda_name: str
    soda_exists: bool
    soda_id: Optional[str] = None
    image_url: Optional[str] = None


class DrinkPreviewItem(BaseModel):
    name: str
    price: float
    category: str
    image_url: Optional[str] = None


class CategoryPreview(BaseModel):
    name: str
    is_new: bool
    reason: Optional[str] = None


class SmartParseResponse(BaseModel):
    """Response with parsed items ready for creation."""
    liquors: List[LiquorPreviewItem]
    sodas: List[SodaPreviewItem]
    cocktails: List[CocktailPreviewItem]
    drinks: List[DrinkPreviewItem]
    category: Optional[CategoryPreview] = None
    summary: str


class SmartSaveRequest(BaseModel):
    """Request to save parsed items."""
    liquors: List[LiquorPreviewItem]
    sodas: List[SodaPreviewItem]
    cocktails: List[CocktailPreviewItem]
    drinks: List[DrinkPreviewItem]
    category: Optional[CategoryPreview] = None


class SmartSaveResponse(BaseModel):
    """Response after saving."""
    liquors_created: int
    sodas_created: int
    shots_created: int
    cocktails_created: int
    drinks_created: int
    category_created: bool
    category_name: Optional[str] = None


# ============== Helpers ==============

def _resolve_image(name: str, category: str, brand_name: Optional[str] = None) -> Optional[str]:
    """Resolve image URL for an item."""
    logo = get_logo_url(brand_name or name)
    if logo:
        return logo
    return image_resolver.resolve_drink_image(
        drink_name=name,
        category=category,
        brand_name=brand_name or name
    )


def _map_liquor_type(type_str: str) -> LiquorType:
    """Map string to LiquorType enum."""
    mapping = {
        'vodka': LiquorType.VODKA,
        'gin': LiquorType.GIN,
        'rum': LiquorType.RUM,
        'whisky': LiquorType.WHISKY,
        'whiskey': LiquorType.WHISKY,
        'tequila': LiquorType.TEQUILA,
        'brandy': LiquorType.BRANDY,
        'liqueur': LiquorType.LIQUEUR,
    }
    return mapping.get(type_str.lower(), LiquorType.OTHER)


def _find_liquor_by_name(db: Session, club_id: UUID, name: str) -> Optional[Liquor]:
    """Find liquor by name (case-insensitive) or by type."""
    # Exact match
    liquor = db.query(Liquor).filter(
        Liquor.club_id == club_id,
        Liquor.name.ilike(name)
    ).first()
    if liquor:
        return liquor
    
    # Try matching by liquor type for generic names
    type_mapping = {
        'gin': LiquorType.GIN,
        'vodka': LiquorType.VODKA,
        'rum': LiquorType.RUM,
        'whisky': LiquorType.WHISKY,
        'whiskey': LiquorType.WHISKY,
        'tequila': LiquorType.TEQUILA,
    }
    liquor_type = type_mapping.get(name.lower())
    if liquor_type:
        return db.query(Liquor).filter(
            Liquor.club_id == club_id,
            Liquor.liquor_type == liquor_type,
            Liquor.is_available == True
        ).first()
    
    return None


def _find_soda_by_name(db: Session, club_id: UUID, name: str) -> Optional[Soda]:
    """Find soda by name (case-insensitive, partial match)."""
    # Exact match
    soda = db.query(Soda).filter(
        Soda.club_id == club_id,
        Soda.name.ilike(name)
    ).first()
    if soda:
        return soda
    
    # Partial match for common names
    name_lower = name.lower()
    common_mappings = {
        'tonic': ['tonic', 'tonic water', 'schweppes'],
        'cola': ['cola', 'coca-cola', 'coca cola', 'coke', 'pepsi'],
        'red bull': ['red bull', 'redbull'],
        'sprite': ['sprite', '7up', '7-up'],
        'orange': ['orange', 'orange juice', 'fanta'],
    }
    
    for key, variants in common_mappings.items():
        if name_lower in variants or key in name_lower:
            for variant in variants:
                soda = db.query(Soda).filter(
                    Soda.club_id == club_id,
                    Soda.name.ilike(f"%{variant}%")
                ).first()
                if soda:
                    return soda
    
    return None


# ============== Endpoints ==============

@router.post("/parse", response_model=SmartParseResponse)
async def smart_parse(
    request: SmartParseRequest,
    club_id: str = Query(..., description="Club ID"),
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """
    Smart parse natural language into structured drink data.
    
    Understands:
    - Pure liquors: "Absolut $8, Beefeater $9"
    - Pure sodas: "Coca-Cola $3, Red Bull $4"
    - Cocktails: "Gin Tonic $10, Vodka Red Bull $12"
    - Explicit categories: "...under Premium Whisky"
    
    For cocktails, will auto-create missing liquors/sodas.
    """
    try:
        club_uuid = UUID(club_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid club ID format")
    
    # Verify club ownership
    club = db.query(Club).filter(Club.id == club_uuid, Club.owner_id == current_user.id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found or access denied")
    
    if not request.text or len(request.text.strip()) < 3:
        raise HTTPException(status_code=400, detail="Input text must be at least 3 characters")
    
    # Get existing inventory for context
    existing_liquors = [
        {"id": str(l.id), "name": l.name, "liquor_type": l.liquor_type.value}
        for l in db.query(Liquor).filter(Liquor.club_id == club_uuid).all()
    ]
    existing_sodas = [
        {"id": str(s.id), "name": s.name}
        for s in db.query(Soda).filter(Soda.club_id == club_uuid).all()
    ]
    
    # Get existing categories
    category_service = CategoryService()
    category_service.ensure_system_categories_exist(db)
    system_cats = category_service.get_system_categories(db)
    custom_cats = category_service.get_club_custom_categories(club_uuid, db)
    existing_categories = [{"id": str(c.id), "name": c.name} for c in system_cats + custom_cats]
    
    # Parse with LLM
    try:
        parsed = await llm_service.smart_parse(
            request.text,
            existing_liquors=existing_liquors,
            existing_sodas=existing_sodas,
            existing_categories=existing_categories
        )
    except ValueError as e:
        raise HTTPException(status_code=503, detail="LLM service not available")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing: {str(e)}")
    
    # Build response with images and IDs
    liquor_previews = []
    for liq in parsed.get("liquors", []):
        existing = _find_liquor_by_name(db, club_uuid, liq["name"])
        liquor_previews.append(LiquorPreviewItem(
            name=liq["name"],
            price=liq["price"],
            liquor_type=liq.get("liquor_type", "other"),
            is_new=existing is None,
            image_url=_resolve_image(liq["name"], "liquors"),
            existing_id=str(existing.id) if existing else None
        ))
    
    soda_previews = []
    for soda in parsed.get("sodas", []):
        existing = _find_soda_by_name(db, club_uuid, soda["name"])
        soda_previews.append(SodaPreviewItem(
            name=soda["name"],
            price=soda.get("price", 0),
            price_addon=soda.get("price_addon", 0),
            is_new=existing is None,
            image_url=_resolve_image(soda["name"], "sodas"),
            existing_id=str(existing.id) if existing else None
        ))
    
    # Process cocktails - resolve liquor/soda references
    cocktail_previews = []
    for cocktail in parsed.get("cocktails", []):
        liquor_name = cocktail.get("liquor_name", "")
        soda_name = cocktail.get("soda_name", "")
        
        # Find or note that we need to create
        existing_liquor = _find_liquor_by_name(db, club_uuid, liquor_name)
        existing_soda = _find_soda_by_name(db, club_uuid, soda_name)
        
        # If liquor doesn't exist, check if it's in our pending liquors
        liquor_in_pending = any(l.name.lower() == liquor_name.lower() for l in liquor_previews)
        soda_in_pending = any(s.name.lower() == soda_name.lower() for s in soda_previews)
        
        # Add missing liquor to pending if not there
        if not existing_liquor and not liquor_in_pending and liquor_name:
            liquor_type = _map_liquor_type(liquor_name)
            # Default price: half of cocktail price or $8
            default_price = cocktail["price"] / 2 if cocktail["price"] > 8 else 8.0
            liquor_previews.append(LiquorPreviewItem(
                name=liquor_name.title(),
                price=default_price,
                liquor_type=liquor_type.value,
                is_new=True,
                image_url=_resolve_image(liquor_name, "liquors"),
                existing_id=None
            ))
        
        # Add missing soda to pending if not there
        if not existing_soda and not soda_in_pending and soda_name:
            soda_previews.append(SodaPreviewItem(
                name=soda_name.title(),
                price=0,
                price_addon=2.0 if 'red bull' in soda_name.lower() else 0,
                is_new=True,
                image_url=_resolve_image(soda_name, "sodas"),
                existing_id=None
            ))
        
        cocktail_previews.append(CocktailPreviewItem(
            name=cocktail["name"],
            price=cocktail["price"],
            liquor_name=liquor_name.title() if liquor_name else "",
            liquor_exists=existing_liquor is not None,
            liquor_id=str(existing_liquor.id) if existing_liquor else None,
            soda_name=soda_name.title() if soda_name else "",
            soda_exists=existing_soda is not None,
            soda_id=str(existing_soda.id) if existing_soda else None,
            image_url=_resolve_image(liquor_name or cocktail["name"], "cocktails") if liquor_name else None
        ))
    
    # Process other drinks
    drink_previews = []
    for drink in parsed.get("drinks", []):
        drink_previews.append(DrinkPreviewItem(
            name=drink["name"],
            price=drink["price"],
            category=drink.get("category", "other"),
            image_url=_resolve_image(drink["name"], drink.get("category", "other"))
        ))
    
    # Process category
    category_preview = None
    if parsed.get("new_category"):
        cat_name = parsed["new_category"].get("name", "")
        if cat_name:
            existing_cat = next((c for c in existing_categories if c["name"].lower() == cat_name.lower()), None)
            category_preview = CategoryPreview(
                name=cat_name,
                is_new=existing_cat is None,
                reason=parsed["new_category"].get("reason", "")
            )
    
    # Build summary
    summary_parts = []
    new_liquors = len([l for l in liquor_previews if l.is_new])
    new_sodas = len([s for s in soda_previews if s.is_new])
    if new_liquors:
        summary_parts.append(f"{new_liquors} new liquor{'s' if new_liquors > 1 else ''}")
    if new_sodas:
        summary_parts.append(f"{new_sodas} new soda{'s' if new_sodas > 1 else ''}")
    if cocktail_previews:
        summary_parts.append(f"{len(cocktail_previews)} cocktail{'s' if len(cocktail_previews) > 1 else ''}")
    if drink_previews:
        summary_parts.append(f"{len(drink_previews)} drink{'s' if len(drink_previews) > 1 else ''}")
    if category_preview and category_preview.is_new:
        summary_parts.append(f"new category '{category_preview.name}'")
    
    summary = "Will create: " + ", ".join(summary_parts) if summary_parts else "Nothing to create"
    
    return SmartParseResponse(
        liquors=liquor_previews,
        sodas=soda_previews,
        cocktails=cocktail_previews,
        drinks=drink_previews,
        category=category_preview,
        summary=summary
    )


@router.post("/save", response_model=SmartSaveResponse, status_code=status.HTTP_201_CREATED)
async def smart_save(
    club_id: str = Query(..., description="Club ID"),
    request: SmartSaveRequest = ...,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db)
):
    """
    Save parsed items to database.
    Creates liquors (with auto-shots), sodas, cocktails, drinks, and category.
    """
    try:
        club_uuid = UUID(club_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid club ID format")
    
    # Verify club ownership
    club = db.query(Club).filter(Club.id == club_uuid, Club.owner_id == current_user.id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found or access denied")
    
    category_service = CategoryService()
    category_service.ensure_system_categories_exist(db)
    
    # Get system categories for shots/cocktails
    system_cats = category_service.get_system_categories(db)
    shots_category = next((c for c in system_cats if c.name == "Shots"), None)
    cocktails_category = next((c for c in system_cats if c.name == "Cocktails"), None)
    beers_category = next((c for c in system_cats if c.name == "Beers"), None)
    wines_category = next((c for c in system_cats if c.name == "Wines"), None)
    
    # 1. Create category if new
    category_created = False
    target_category_id = None
    if request.category and request.category.is_new and request.category.name:
        new_cat = category_service.create_category(
            club_uuid,
            request.category.name,
            db
        )
        category_created = True
        target_category_id = new_cat.id
        logger.info(f"Created category: {request.category.name}")
    
    # 2. Create liquors and shots
    liquors_created = 0
    shots_created = 0
    liquor_name_to_id = {}  # Map name to ID for cocktail creation
    
    for liq in request.liquors:
        if liq.existing_id:
            # Already exists
            liquor_name_to_id[liq.name.lower()] = UUID(liq.existing_id)
            continue
        
        if not liq.is_new:
            continue
        
        # Check if already exists (safety)
        existing = db.query(Liquor).filter(
            Liquor.club_id == club_uuid,
            Liquor.name.ilike(liq.name)
        ).first()
        if existing:
            liquor_name_to_id[liq.name.lower()] = existing.id
            continue
        
        # Create liquor
        liquor = Liquor(
            club_id=club_uuid,
            name=liq.name,
            brand_name=liq.name,
            liquor_type=_map_liquor_type(liq.liquor_type),
            shot_price=Decimal(str(liq.price)),
            image_url=liq.image_url,
            is_available=True
        )
        db.add(liquor)
        db.flush()
        liquor_name_to_id[liq.name.lower()] = liquor.id
        liquors_created += 1
        
        # Auto-create shot
        shot = Drink(
            club_id=club_uuid,
            name=f"Shot of {liq.name}",
            description=f"Pure {liq.name} shot",
            price=Decimal(str(liq.price)),
            drink_type=DrinkType.SHOT,
            liquor_id=liquor.id,
            category="Shots",
            category_id=shots_category.id if shots_category else None,
            image_url=liq.image_url,
            brand_name=liq.name,
            is_available=True
        )
        db.add(shot)
        shots_created += 1
    
    # 3. Create sodas
    sodas_created = 0
    soda_name_to_id = {}  # Map name to ID for cocktail creation
    
    for soda in request.sodas:
        if soda.existing_id:
            soda_name_to_id[soda.name.lower()] = UUID(soda.existing_id)
            continue
        
        if not soda.is_new:
            continue
        
        # Check if already exists (safety)
        existing = db.query(Soda).filter(
            Soda.club_id == club_uuid,
            Soda.name.ilike(soda.name)
        ).first()
        if existing:
            soda_name_to_id[soda.name.lower()] = existing.id
            continue
        
        # Create soda
        new_soda = Soda(
            club_id=club_uuid,
            name=soda.name,
            brand_name=soda.name,
            price=Decimal(str(soda.price)),
            price_addon=Decimal(str(soda.price_addon)),
            image_url=soda.image_url,
            is_available=True
        )
        db.add(new_soda)
        db.flush()
        soda_name_to_id[soda.name.lower()] = new_soda.id
        sodas_created += 1
    
    # 4. Create cocktails
    cocktails_created = 0
    
    for cocktail in request.cocktails:
        # Get liquor ID
        liquor_id = None
        if cocktail.liquor_id:
            liquor_id = UUID(cocktail.liquor_id)
        elif cocktail.liquor_name:
            liquor_id = liquor_name_to_id.get(cocktail.liquor_name.lower())
        
        # Get soda ID
        soda_id = None
        if cocktail.soda_id:
            soda_id = UUID(cocktail.soda_id)
        elif cocktail.soda_name:
            soda_id = soda_name_to_id.get(cocktail.soda_name.lower())
        
        # Check for duplicate
        existing = db.query(Drink).filter(
            Drink.club_id == club_uuid,
            Drink.name.ilike(cocktail.name)
        ).first()
        if existing:
            continue
        
        new_cocktail = Drink(
            club_id=club_uuid,
            name=cocktail.name,
            description=f"{cocktail.liquor_name} + {cocktail.soda_name}",
            price=Decimal(str(cocktail.price)),
            drink_type=DrinkType.COCKTAIL,
            liquor_id=liquor_id,
            soda_id=soda_id,
            category="Cocktails",
            category_id=target_category_id or (cocktails_category.id if cocktails_category else None),
            image_url=cocktail.image_url,
            is_available=True
        )
        db.add(new_cocktail)
        cocktails_created += 1
    
    # 5. Create other drinks
    drinks_created = 0
    
    for drink in request.drinks:
        # Check for duplicate
        existing = db.query(Drink).filter(
            Drink.club_id == club_uuid,
            Drink.name.ilike(drink.name)
        ).first()
        if existing:
            continue
        
        # Map category
        drink_type = DrinkType.OTHER
        category_id = target_category_id
        if drink.category == "beer":
            drink_type = DrinkType.BEER
            category_id = category_id or (beers_category.id if beers_category else None)
        elif drink.category == "wine":
            drink_type = DrinkType.WINE
            category_id = category_id or (wines_category.id if wines_category else None)
        
        new_drink = Drink(
            club_id=club_uuid,
            name=drink.name,
            price=Decimal(str(drink.price)),
            drink_type=drink_type,
            category=drink.category.title(),
            category_id=category_id,
            image_url=drink.image_url,
            brand_name=drink.name,
            is_available=True
        )
        db.add(new_drink)
        drinks_created += 1
    
    db.commit()
    
    logger.info(
        f"Smart save: {liquors_created} liquors, {shots_created} shots, "
        f"{sodas_created} sodas, {cocktails_created} cocktails, {drinks_created} drinks"
    )
    
    return SmartSaveResponse(
        liquors_created=liquors_created,
        sodas_created=sodas_created,
        shots_created=shots_created,
        cocktails_created=cocktails_created,
        drinks_created=drinks_created,
        category_created=category_created,
        category_name=request.category.name if category_created and request.category else None
    )

