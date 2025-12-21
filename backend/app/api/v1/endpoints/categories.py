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


@router.get("/clubs/{club_id}/categories", response_model=CategoryTreeResponse)
def get_club_categories(
    club_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    category_service: CategoryService = Depends(get_category_service)
):
    """Get all categories for a club with subcategories"""
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

    categories = category_service.get_club_categories(club_uuid, db)
    
    # Convert to response format
    category_responses = []
    for cat in categories:
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
        
        category_responses.append(
            CategoryResponse(
                id=str(cat.id),
                club_id=str(cat.club_id),
                name=cat.name,
                description=cat.description,
                display_order=cat.display_order,
                is_active=cat.is_active,
                subcategories=subcategories,
                created_at=cat.created_at,
                updated_at=cat.updated_at
            )
        )

    return CategoryTreeResponse(categories=category_responses)


@router.post("/clubs/{club_id}/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    club_id: str,
    category_data: CategoryCreate,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db),
    category_service: CategoryService = Depends(get_category_service)
):
    """Create a new category (club owner only)"""
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
            display_order=category_data.display_order
        )

        return CategoryResponse(
            id=str(category.id),
            club_id=str(category.club_id),
            name=category.name,
            description=category.description,
            display_order=category.display_order,
            is_active=category.is_active,
            subcategories=[],
            created_at=category.created_at,
            updated_at=category.updated_at
        )
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
    """Update a category (club owner only)"""
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

    club = db.query(Club).filter(Club.id == category.club_id, Club.owner_id == current_user.id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to modify this category"
        )

    updated = category_service.update_category(
        cat_uuid,
        db,
        name=category_data.name,
        description=category_data.description,
        display_order=category_data.display_order
    )

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

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
        for sub in updated.subcategories if sub.is_active
    ]

    return CategoryResponse(
        id=str(updated.id),
        club_id=str(updated.club_id),
        name=updated.name,
        description=updated.description,
        display_order=updated.display_order,
        is_active=updated.is_active,
        subcategories=subcategories,
        created_at=updated.created_at,
        updated_at=updated.updated_at
    )


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: str,
    current_user: User = Depends(get_current_club_owner),
    db: Session = Depends(get_db),
    category_service: CategoryService = Depends(get_category_service)
):
    """Delete a category (club owner only)"""
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

    club = db.query(Club).filter(Club.id == category.club_id, Club.owner_id == current_user.id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this category"
        )

    success = category_service.delete_category(cat_uuid, db)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

