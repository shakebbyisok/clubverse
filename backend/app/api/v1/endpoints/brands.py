"""
Brand Search Endpoints
Endpoints for retrieving brand logos from brand logo mapping.
"""
from fastapi import APIRouter, HTTPException, status, Query
from typing import Optional
from app.core.brand_logos import get_logo_url
from pydantic import BaseModel

router = APIRouter()


class BrandLogoResponse(BaseModel):
    """Response for brand logo retrieval."""
    logo_url: Optional[str]
    brand_name: Optional[str] = None
    source: str  # "mapping" or "not_found"


@router.get("/logo", response_model=BrandLogoResponse)
def get_brand_logo(
    brand_name: str = Query(..., description="Brand name to get logo for")
):
    """
    Get logo URL for a brand name from the brand logo mapping.
    
    Example:
        GET /api/v1/brands/logo?brand_name=Absolut
    """
    if not brand_name or len(brand_name.strip()) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Brand name must be at least 2 characters"
        )
    
    logo_url = get_logo_url(brand_name.strip())
    
    return BrandLogoResponse(
        logo_url=logo_url,
        brand_name=brand_name.strip(),
        source="mapping" if logo_url else "not_found"
    )

