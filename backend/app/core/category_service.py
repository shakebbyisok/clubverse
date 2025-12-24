"""
Category service for managing categories and subcategories.
Handles CRUD operations and business logic.
"""
import logging
from typing import List, Optional, Tuple
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.models.category import Category, Subcategory, SYSTEM_CATEGORIES
from app.models.club import Club

logger = logging.getLogger(__name__)


class CategoryService:
    """Service for managing categories and subcategories"""

    def get_system_categories(self, db: Session, include_inactive: bool = False) -> List[Category]:
        """Get all system (predefined) categories"""
        query = db.query(Category).filter(Category.is_system == True)
        if not include_inactive:
            query = query.filter(Category.is_active == True)
        return query.order_by(Category.display_order, Category.created_at).all()

    def get_club_custom_categories(self, club_id: UUID, db: Session, include_inactive: bool = False) -> List[Category]:
        """Get custom categories created by a specific club"""
        query = db.query(Category).filter(
            Category.club_id == club_id,
            Category.is_system == False
        )
        if not include_inactive:
            query = query.filter(Category.is_active == True)
        return query.order_by(Category.display_order, Category.created_at).all()

    def get_all_categories_for_club(self, club_id: UUID, db: Session, include_inactive: bool = False) -> Tuple[List[Category], List[Category]]:
        """
        Get both system and custom categories for a club.
        Returns: (system_categories, custom_categories)
        """
        system_categories = self.get_system_categories(db, include_inactive)
        custom_categories = self.get_club_custom_categories(club_id, db, include_inactive)
        return system_categories, custom_categories

    def get_club_categories(self, club_id: UUID, db: Session, include_inactive: bool = False) -> List[Category]:
        """Get all categories for a club (both system + custom) - backwards compatible"""
        system_cats, custom_cats = self.get_all_categories_for_club(club_id, db, include_inactive)
        return system_cats + custom_cats

    def ensure_system_categories_exist(self, db: Session) -> List[Category]:
        """Ensure all system categories exist in the database. Creates them if missing."""
        existing = {cat.name for cat in self.get_system_categories(db, include_inactive=True)}
        created = []
        
        for cat_data in SYSTEM_CATEGORIES:
            if cat_data["name"] not in existing:
                category = Category(
                    name=cat_data["name"],
                    description=cat_data["description"],
                    icon=cat_data.get("icon"),
                    display_order=cat_data["display_order"],
                    is_system=True,
                    club_id=None,  # System categories don't belong to any club
                )
                db.add(category)
                created.append(category)
                logger.info(f"Created system category: {cat_data['name']}")
        
        if created:
            db.commit()
            for cat in created:
                db.refresh(cat)
        
        return created

    def get_category(self, category_id: UUID, db: Session) -> Optional[Category]:
        """Get a single category by ID"""
        return db.query(Category).filter(Category.id == category_id).first()

    def get_subcategory(self, subcategory_id: UUID, db: Session) -> Optional[Subcategory]:
        """Get a single subcategory by ID"""
        return db.query(Subcategory).filter(Subcategory.id == subcategory_id).first()

    def create_category(
        self,
        club_id: UUID,
        name: str,
        db: Session,
        description: Optional[str] = None,
        icon: Optional[str] = None,
        display_order: Optional[int] = None
    ) -> Category:
        """Create a new custom category for a club"""
        # Verify club exists
        club = db.query(Club).filter(Club.id == club_id).first()
        if not club:
            raise ValueError(f"Club {club_id} not found")

        # Get next display order if not provided (only count custom categories for this club)
        if display_order is None:
            max_order = db.query(Category.display_order).filter(
                Category.club_id == club_id,
                Category.is_system == False
            ).order_by(Category.display_order.desc()).first()
            display_order = (max_order[0] + 1) if max_order else 100  # Start custom after system categories

        category = Category(
            club_id=club_id,
            name=name,
            description=description,
            icon=icon,
            display_order=display_order,
            is_system=False  # Custom category
        )

        db.add(category)
        db.commit()
        db.refresh(category)

        logger.info(f"Created custom category {category.id} ({name}) for club {club_id}")
        return category

    def create_subcategory(
        self,
        category_id: UUID,
        name: str,
        db: Session,
        description: Optional[str] = None,
        display_order: Optional[int] = None
    ) -> Subcategory:
        """Create a new subcategory"""
        # Verify category exists
        category = self.get_category(category_id, db)
        if not category:
            raise ValueError(f"Category {category_id} not found")

        # Get next display order if not provided
        if display_order is None:
            max_order = db.query(Subcategory.display_order).filter(
                Subcategory.category_id == category_id
            ).order_by(Subcategory.display_order.desc()).first()
            display_order = (max_order[0] + 1) if max_order else 0

        subcategory = Subcategory(
            category_id=category_id,
            name=name,
            description=description,
            display_order=display_order
        )

        db.add(subcategory)
        db.commit()
        db.refresh(subcategory)

        logger.info(f"Created subcategory {subcategory.id} ({name}) for category {category_id}")
        return subcategory

    def update_category(
        self,
        category_id: UUID,
        db: Session,
        name: Optional[str] = None,
        description: Optional[str] = None,
        icon: Optional[str] = None,
        display_order: Optional[int] = None,
        is_active: Optional[bool] = None
    ) -> Optional[Category]:
        """Update a category (only custom categories can be modified)"""
        category = self.get_category(category_id, db)
        if not category:
            return None
        
        # System categories cannot be modified by club owners
        if category.is_system:
            raise ValueError("System categories cannot be modified")

        if name is not None:
            category.name = name
        if description is not None:
            category.description = description
        if icon is not None:
            category.icon = icon
        if display_order is not None:
            category.display_order = display_order
        if is_active is not None:
            category.is_active = is_active

        db.commit()
        db.refresh(category)
        return category

    def update_subcategory(
        self,
        subcategory_id: UUID,
        db: Session,
        name: Optional[str] = None,
        description: Optional[str] = None,
        display_order: Optional[int] = None,
        is_active: Optional[bool] = None
    ) -> Optional[Subcategory]:
        """Update a subcategory"""
        subcategory = self.get_subcategory(subcategory_id, db)
        if not subcategory:
            return None

        if name is not None:
            subcategory.name = name
        if description is not None:
            subcategory.description = description
        if display_order is not None:
            subcategory.display_order = display_order
        if is_active is not None:
            subcategory.is_active = is_active

        db.commit()
        db.refresh(subcategory)
        return subcategory

    def delete_category(self, category_id: UUID, db: Session) -> bool:
        """Delete a category (cascades to subcategories). Only custom categories can be deleted."""
        category = self.get_category(category_id, db)
        if not category:
            return False
        
        # System categories cannot be deleted
        if category.is_system:
            raise ValueError("System categories cannot be deleted")

        db.delete(category)
        db.commit()
        logger.info(f"Deleted custom category {category_id}")
        return True

    def delete_subcategory(self, subcategory_id: UUID, db: Session) -> bool:
        """Delete a subcategory"""
        subcategory = self.get_subcategory(subcategory_id, db)
        if not subcategory:
            return False

        db.delete(subcategory)
        db.commit()
        logger.info(f"Deleted subcategory {subcategory_id}")
        return True

