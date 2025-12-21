"""
Image resolver service for drinks.
Handles brand logo mapping and generic image fallbacks for liquors, beers, and sodas.
"""
import logging
from typing import Optional
from app.core.brand_logos import get_logo_url

logger = logging.getLogger(__name__)


class ImageResolver:
    """Resolves image paths for drinks based on type and category"""

    # Generic liquor image library mapping (fallback when brand logo not found)
    LIQUOR_IMAGE_MAP = {
        "vodka": "/assets/logos/liquors/vodka.png",
        "rum": "/assets/logos/liquors/rum.png",
        "tequila": "/assets/logos/liquors/tequila.png",
        "whiskey": "/assets/logos/liquors/whiskey.png",
        "whisky": "/assets/logos/liquors/whiskey.png",
        "bourbon": "/assets/logos/liquors/bourbon.png",
        "scotch": "/assets/logos/liquors/scotch.png",
        "gin": "/assets/logos/liquors/gin.png",
        "brandy": "/assets/logos/liquors/brandy.png",
        "cognac": "/assets/logos/liquors/cognac.png",
        "champagne": "/assets/logos/liquors/champagne.png",
        "wine": "/assets/logos/liquors/wine.png",
    }

    # Generic fallback images
    GENERIC_LIQUOR_IMAGE = "/assets/logos/liquors/generic.png"
    GENERIC_BEER_IMAGE = "/assets/logos/beers/generic.png"
    GENERIC_SODA_IMAGE = "/assets/logos/sodas/generic.png"

    def resolve_drink_image(
        self,
        drink_name: str,
        category: Optional[str] = None,
        brand_name: Optional[str] = None
    ) -> Optional[str]:
        """
        Resolve image path for a drink.
        
        Priority:
        1. Brand logo (from brand_logos.py - works for liquors, beers, sodas)
        2. Generic category image based on category type
        3. Generic liquor image for liquor drinks
        4. None (requires custom upload)
        
        Args:
            drink_name: Name of the drink
            category: Category name (e.g., 'liquors', 'beers', 'sodas', 'shot', 'cocktail', 'beer')
            brand_name: Brand name if available
            
        Returns:
            Image URL or None if custom upload needed
        """
        # Try brand logo first (highest priority) - works for all categories
        # This checks brand_logos.py which has mappings for liquors, beers, and sodas
        logo_url = get_logo_url(brand_name or drink_name)
        if logo_url:
            logger.debug(f"Resolved brand logo for {drink_name}: {logo_url}")
            return logo_url

        # Normalize category name
        cat_lower = (category or "").lower()
        
        # Handle beers
        if cat_lower in ['beers', 'beer'] or self._is_beer_drink(drink_name):
            logger.debug(f"Resolved generic beer image for {drink_name}")
            return self.GENERIC_BEER_IMAGE
        
        # Handle sodas
        if cat_lower in ['sodas', 'soda'] or self._is_soda_drink(drink_name):
            logger.debug(f"Resolved generic soda image for {drink_name}")
            return self.GENERIC_SODA_IMAGE
        
        # Handle liquors (shots, cocktails, etc.)
        if cat_lower in ['liquors', 'liquor', 'shot', 'cocktail', 'drinks (liquor + soda)', 'drinks_liquor_soda'] or self._is_liquor_drink(drink_name):
            # Try specific liquor type first
            liquor_type = self._extract_liquor_type(drink_name)
            if liquor_type:
                image_path = self.LIQUOR_IMAGE_MAP.get(liquor_type.lower())
                if image_path:
                    logger.debug(f"Resolved liquor type image for {drink_name}: {image_path}")
                    return image_path
            
            # Fallback to generic liquor image
            logger.debug(f"Resolved generic liquor image for {drink_name}")
            return self.GENERIC_LIQUOR_IMAGE

        # No image found - requires custom upload
        return None

    def _is_beer_drink(self, drink_name: str) -> bool:
        """Check if drink name suggests it's a beer"""
        drink_lower = drink_name.lower()
        beer_keywords = ['beer', 'cerveza', 'lager', 'ale', 'ipa', 'pilsner', 'stout']
        return any(keyword in drink_lower for keyword in beer_keywords)
    
    def _is_soda_drink(self, drink_name: str) -> bool:
        """Check if drink name suggests it's a soda/soft drink"""
        drink_lower = drink_name.lower()
        soda_keywords = ['cola', 'soda', 'soft drink', 'refresco', 'gaseosa', 'tonic', 'lemonade']
        return any(keyword in drink_lower for keyword in soda_keywords)
    
    def _is_liquor_drink(self, drink_name: str) -> bool:
        """Check if drink name suggests it's a liquor-based drink"""
        drink_lower = drink_name.lower()
        liquor_keywords = [
            'vodka', 'rum', 'tequila', 'whiskey', 'whisky', 'gin',
            'bourbon', 'scotch', 'brandy', 'cognac', 'champagne', 'wine'
        ]
        return any(keyword in drink_lower for keyword in liquor_keywords)

    def _extract_liquor_type(self, drink_name: str) -> Optional[str]:
        """Extract liquor type from drink name"""
        drink_lower = drink_name.lower()
        
        # Check for exact matches first
        for liquor_type in self.LIQUOR_IMAGE_MAP.keys():
            if liquor_type in drink_lower:
                return liquor_type
        
        # Check for common patterns
        if 'vodka' in drink_lower:
            return 'vodka'
        elif 'rum' in drink_lower:
            return 'rum'
        elif 'tequila' in drink_lower:
            return 'tequila'
        elif 'whiskey' in drink_lower or 'whisky' in drink_lower:
            return 'whiskey'
        elif 'gin' in drink_lower:
            return 'gin'
        elif 'beer' in drink_lower:
            return 'beer'
        
        return None

    def get_liquor_list(self) -> list[str]:
        """Get list of available liquors"""
        return list(self.LIQUOR_IMAGE_MAP.keys())


# Singleton instance
image_resolver = ImageResolver()

