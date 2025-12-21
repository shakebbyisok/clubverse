"""
Category service for managing categories and subcategories.
Handles CRUD operations and business logic.
"""
import logging
from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.category import Category, Subcategory
from app.models.club import Club

logger = logging.getLogger(__name__)


class CategoryService:
    """Service for managing categories and subcategories"""

    def get_club_categories(self, club_id: UUID, db: Session, include_inactive: bool = False) -> List[Category]:
        """Get all categories for a club"""
        query = db.query(Category).filter(Category.club_id == club_id)
        if not include_inactive:
            query = query.filter(Category.is_active == True)
        return query.order_by(Category.display_order, Category.created_at).all()

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
        display_order: Optional[int] = None
    ) -> Category:
        """Create a new category"""
        # Verify club exists
        club = db.query(Club).filter(Club.id == club_id).first()
        if not club:
            raise ValueError(f"Club {club_id} not found")

        # Get next display order if not provided
        if display_order is None:
            max_order = db.query(Category.display_order).filter(
                Category.club_id == club_id
            ).order_by(Category.display_order.desc()).first()
            display_order = (max_order[0] + 1) if max_order else 0

        category = Category(
            club_id=club_id,
            name=name,
            description=description,
            display_order=display_order
        )

        db.add(category)
        db.commit()
        db.refresh(category)

        logger.info(f"Created category {category.id} ({name}) for club {club_id}")
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
        display_order: Optional[int] = None,
        is_active: Optional[bool] = None
    ) -> Optional[Category]:
        """Update a category"""
        category = self.get_category(category_id, db)
        if not category:
            return None

        if name is not None:
            category.name = name
        if description is not None:
            category.description = description
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
        """Delete a category (cascades to subcategories)"""
        category = self.get_category(category_id, db)
        if not category:
            return False

        db.delete(category)
        db.commit()
        logger.info(f"Deleted category {category_id}")
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

