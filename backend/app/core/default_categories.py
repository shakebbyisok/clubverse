"""
Default categories service for clubs.
Creates standard category structure for new clubs.
"""
import logging
from typing import List, Dict
from uuid import UUID
from sqlalchemy.orm import Session

from app.models.category import Category, Subcategory
from app.core.category_service import CategoryService

logger = logging.getLogger(__name__)


# Default category structure
DEFAULT_CATEGORIES = [
    {
        "name": "Drinks (liquor + soda)",
        "description": "Mixed drinks with liquor and soda",
        "subcategories": [
            {"name": "Cocktails", "description": "Mixed cocktails"},
            {"name": "Cubatas", "description": "Liquor with soda"},
        ]
    },
    {
        "name": "Liquors",
        "description": "Pure liquors and shots",
        "subcategories": [
            {"name": "Shots", "description": "Pure liquor shots"},
            {"name": "Gin", "description": "Gin brands"},
            {"name": "Rum", "description": "Rum brands"},
            {"name": "Whisky", "description": "Whisky brands"},
            {"name": "Vodka", "description": "Vodka brands"},
            {"name": "Tequila", "description": "Tequila brands"},
        ]
    },
    {
        "name": "Beers",
        "description": "Beers and ciders",
        "subcategories": []
    },
    {
        "name": "Sodas",
        "description": "Non-alcoholic drinks",
        "subcategories": []
    },
    {
        "name": "Wines",
        "description": "Wines and champagne",
        "subcategories": []
    },
]


def initialize_default_categories(club_id: UUID, db: Session) -> List[Category]:
    """
    Initialize default categories for a club.
    Creates all default categories and subcategories.
    
    Args:
        club_id: Club UUID
        db: Database session
        
    Returns:
        List of created Category objects
    """
    category_service = CategoryService()
    created_categories = []
    
    for idx, cat_data in enumerate(DEFAULT_CATEGORIES):
        try:
            # Check if category already exists
            existing = db.query(Category).filter(
                Category.club_id == club_id,
                Category.name == cat_data["name"]
            ).first()
            
            if existing:
                logger.info(f"Category '{cat_data['name']}' already exists for club {club_id}")
                created_categories.append(existing)
                continue
            
            # Create category
            category = category_service.create_category(
                club_id=club_id,
                name=cat_data["name"],
                db=db,
                description=cat_data.get("description"),
                display_order=idx
            )
            
            # Create subcategories
            for sub_idx, subcat_data in enumerate(cat_data.get("subcategories", [])):
                try:
                    category_service.create_subcategory(
                        category_id=category.id,
                        name=subcat_data["name"],
                        db=db,
                        description=subcat_data.get("description"),
                        display_order=sub_idx
                    )
                except Exception as e:
                    logger.warning(f"Failed to create subcategory '{subcat_data['name']}': {e}")
            
            created_categories.append(category)
            logger.info(f"Created category '{cat_data['name']}' with {len(cat_data.get('subcategories', []))} subcategories")
            
        except Exception as e:
            logger.error(f"Failed to create category '{cat_data['name']}': {e}")
            continue
    
    return created_categories


def get_or_create_default_categories(club_id: UUID, db: Session) -> List[Category]:
    """
    Get existing categories or create defaults if none exist.
    
    Args:
        club_id: Club UUID
        db: Database session
        
    Returns:
        List of Category objects
    """
    existing_categories = db.query(Category).filter(
        Category.club_id == club_id,
        Category.is_active == True
    ).all()
    
    if existing_categories:
        return existing_categories
    
    # No categories exist, create defaults
    return initialize_default_categories(club_id, db)

