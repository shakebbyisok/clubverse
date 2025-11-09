"""
Google Maps Geocoding Service
Converts addresses to coordinates and vice versa using Google Maps Geocoding API.
"""
import logging
import httpx
from typing import Optional, Dict, Any
from decimal import Decimal
from app.core.config import settings

logger = logging.getLogger(__name__)


class GeocodingService:
    """Service for geocoding addresses using Google Maps API."""
    
    def __init__(self):
        self.api_key = settings.GOOGLE_MAPS_KEY
        self.base_url = "https://maps.googleapis.com/maps/api/geocode/json"
    
    async def geocode_address(self, address: str) -> Optional[Dict[str, Any]]:
        """
        Geocode an address to get coordinates and formatted address.
        
        Args:
            address: Address string to geocode
            
        Returns:
            Dictionary with:
            - latitude: float
            - longitude: float
            - formatted_address: str
            - place_id: str (optional)
            - city: str (extracted from components)
            - address_components: dict (full components)
            
            Returns None if geocoding fails or API key is missing
        """
        if not self.api_key:
            logger.warning("GOOGLE_MAPS_KEY not configured, geocoding unavailable")
            return None
        
        if not address or len(address.strip()) < 3:
            logger.warning(f"Address too short for geocoding: {address}")
            return None
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    self.base_url,
                    params={
                        "address": address,
                        "key": self.api_key,
                    }
                )
                response.raise_for_status()
                data = response.json()
                
                if data.get("status") != "OK":
                    logger.error(f"Geocoding API error: {data.get('status')} - {data.get('error_message', 'Unknown error')}")
                    return None
                
                results = data.get("results", [])
                if not results:
                    logger.warning(f"No results for address: {address}")
                    return None
                
                # Use first result (most relevant)
                result = results[0]
                location = result.get("geometry", {}).get("location", {})
                
                # Extract city from address components
                city = None
                for component in result.get("address_components", []):
                    types = component.get("types", [])
                    if "locality" in types or "administrative_area_level_1" in types:
                        city = component.get("long_name")
                        break
                
                return {
                    "latitude": Decimal(str(location.get("lat", 0))),
                    "longitude": Decimal(str(location.get("lng", 0))),
                    "formatted_address": result.get("formatted_address", address),
                    "place_id": result.get("place_id"),
                    "city": city,
                    "address_components": result.get("address_components", []),
                }
                
        except httpx.HTTPError as e:
            logger.error(f"HTTP error during geocoding: {e}")
            return None
        except Exception as e:
            logger.error(f"Error geocoding address '{address}': {e}")
            return None
    
    async def reverse_geocode(self, latitude: float, longitude: float) -> Optional[Dict[str, Any]]:
        """
        Reverse geocode coordinates to get address.
        
        Args:
            latitude: Latitude coordinate
            longitude: Longitude coordinate
            
        Returns:
            Dictionary with formatted_address and components, or None if fails
        """
        if not self.api_key:
            logger.warning("GOOGLE_MAPS_KEY not configured, reverse geocoding unavailable")
            return None
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    self.base_url,
                    params={
                        "latlng": f"{latitude},{longitude}",
                        "key": self.api_key,
                    }
                )
                response.raise_for_status()
                data = response.json()
                
                if data.get("status") != "OK":
                    logger.error(f"Reverse geocoding API error: {data.get('status')}")
                    return None
                
                results = data.get("results", [])
                if not results:
                    return None
                
                result = results[0]
                return {
                    "formatted_address": result.get("formatted_address"),
                    "place_id": result.get("place_id"),
                    "address_components": result.get("address_components", []),
                }
                
        except Exception as e:
            logger.error(f"Error reverse geocoding coordinates: {e}")
            return None


# Singleton instance
geocoding_service = GeocodingService()

