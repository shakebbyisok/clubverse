"""
Category and subcategory management endpoints.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.db.base import get_db
from app.models.user import User
from app.models.club import Club
from app.schemas.category import (
    CategoryCreate,
    CategoryResponse,
    SubcategoryCreate,
    SubcategoryResponse,
    CategoryTreeResponse
)
from app.core.dependencies import get_current_user, get_current_club_owner
from app.core.category_service import CategoryService

logger = logging.getLogger(__name__)

router = APIRouter()


def get_category_service(db: Session = Depends(get_db)) -> CategoryService:
    """Dependency to get category service"""
    return CategoryService()


def _category_to_response(cat) -> CategoryResponse:
    """Helper to convert Category model to CategoryResponse schema"""
    subcategories = [
        SubcategoryResponse(
            id=str(sub.id),
            category_id=str(sub.category_id),
            name=sub.name,
            description=sub.description,
            display_order=sub.display_order,
            is_active=sub.is_active,
            created_at=sub.created_at,
            updated_at=sub.updated_at
        )
        for sub in cat.subcategories if sub.is_active
    ]
    
    return CategoryResponse(
        id=str(cat.id),
        club_id=str(cat.club_id) if cat.club_id else None,
        name=cat.name,
        description=cat.description,
        icon=cat.icon,
        display_order=cat.display_order,
        is_system=cat.is_system,
        is_active=cat.is_active,
        subcategories=subcategories,
        created_at=cat.created_at,
        updated_at=cat.updated_at
    )


@router.get("/clubs/{club_id}/categories", response_model=CategoryTreeResponse)
def get_club_categories(
    club_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    category_service: CategoryService = Depends(get_category_service)
):
    """
    Get all categories for a club (both system and custom).
    
    Returns:
        - system_categories: Predefined categories shared across all clubs
        - custom_categories: Club-specific categories created by the owner
    """
    try:
        club_uuid = UUID(club_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid club ID format"
        )

    # Verify club exists and user has access
    club = db.query(Club).filter(Club.id == club_uuid).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found"
        )

    # Check access: club owner or public read
    if club.owner_id != current_user.id and current_user.role.value not in ["admin"]:
        # Allow public read for now, can restrict later
        pass

    # Ensure system categories exist
    category_service.ensure_system_categories_exist(db)
    
    # Get both system and custom categories
    system_cats, custom_cats = category_service.get_all_categories_for_club(club_uuid, db)
    
    return CategoryTreeResponse(
        system_categories=[_category_to_response(cat) for cat in system_cats],
        custom_categories=[_category_to_response(cat) for cat in custom_cats]
    )


@router.post("/clubs/{club_id}/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    club_id: str,
    category_data: CategoryCreate,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db),
    category_service: CategoryService = Depends(get_category_service)
):
    """Create a new custom category for a club (club owner only)"""
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

    try:
        category = category_service.create_category(
            club_uuid,
            category_data.name,
            db,
            description=category_data.description,
            icon=category_data.icon,
            display_order=category_data.display_order
        )

        return _category_to_response(category)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/categories/{category_id}/subcategories", response_model=SubcategoryResponse, status_code=status.HTTP_201_CREATED)
def create_subcategory(
    category_id: str,
    subcategory_data: SubcategoryCreate,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db),
    category_service: CategoryService = Depends(get_category_service)
):
    """Create a new subcategory (club owner only)"""
    try:
        cat_uuid = UUID(category_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid category ID format"
        )

    # Verify category exists and user owns the club
    category = category_service.get_category(cat_uuid, db)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    club = db.query(Club).filter(Club.id == category.club_id, Club.owner_id == current_user.id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to modify this category"
        )

    try:
        subcategory = category_service.create_subcategory(
            cat_uuid,
            subcategory_data.name,
            db,
            description=subcategory_data.description,
            display_order=subcategory_data.display_order
        )

        return SubcategoryResponse(
            id=str(subcategory.id),
            category_id=str(subcategory.category_id),
            name=subcategory.name,
            description=subcategory.description,
            display_order=subcategory.display_order,
            is_active=subcategory.is_active,
            created_at=subcategory.created_at,
            updated_at=subcategory.updated_at
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/categories/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: str,
    category_data: CategoryCreate,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db),
    category_service: CategoryService = Depends(get_category_service)
):
    """Update a custom category (club owner only). System categories cannot be modified."""
    try:
        cat_uuid = UUID(category_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid category ID format"
        )

    category = category_service.get_category(cat_uuid, db)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    # System categories cannot be modified
    if category.is_system:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="System categories cannot be modified"
        )

    club = db.query(Club).filter(Club.id == category.club_id, Club.owner_id == current_user.id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to modify this category"
        )

    try:
        updated = category_service.update_category(
            cat_uuid,
            db,
            name=category_data.name,
            description=category_data.description,
            icon=category_data.icon,
            display_order=category_data.display_order
        )

        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )

        return _category_to_response(updated)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: str,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db),
    category_service: CategoryService = Depends(get_category_service)
):
    """Delete a custom category (club owner only). System categories cannot be deleted."""
    try:
        cat_uuid = UUID(category_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid category ID format"
        )

    category = category_service.get_category(cat_uuid, db)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    # System categories cannot be deleted
    if category.is_system:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="System categories cannot be deleted"
        )

    club = db.query(Club).filter(Club.id == category.club_id, Club.owner_id == current_user.id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this category"
        )

    try:
        success = category_service.delete_category(cat_uuid, db)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )

