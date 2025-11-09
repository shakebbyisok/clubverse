"""
Simple LLM Service for parsing natural language drink inputs.
Uses OpenRouter API for structured output generation.
"""
import json
import logging
import re
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI
from app.core.config import settings

logger = logging.getLogger(__name__)


class LLMService:
    """Simple LLM service for parsing natural language to structured data."""
    
    def __init__(self):
        self.api_key = settings.OPENROUTER_KEY
        self.client = None
        
        if self.api_key:
            self.client = AsyncOpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=self.api_key,
            )
        else:
            logger.warning("OPENROUTER_KEY not configured, LLM parsing will be unavailable")
    
    def _normalize_brand_name(self, name: str) -> str:
        """
        Normalize brand names, fixing common misspellings but preserving variants.
        Returns normalized brand name (preserves variants like "Manzana", "Red Label").
        """
        name = name.strip()
        
        # Brand name mappings and normalizations (fix misspellings only)
        brand_mappings = {
            # Fix misspellings only - preserve variants
            "havanna club": "Havana Club",
            "havanna": "Havana Club",
            "licor43": "Licor 43",
            "licor 43": "Licor 43",
            "fireball": "Fireball",
            "fire ball": "Fireball",
            "jagger": "Jagermeister",
            "jagermeister": "Jagermeister",
            "ballantines": "Ballantine's",
            "ballantine": "Ballantine's",
            "seagrams": "Seagram's",
            "seagram": "Seagram's",
            "bombay sapphire": "Bombay Sapphire",
            "hendricks": "Hendrick's",
            "hendrick's": "Hendrick's",
            "beefeater": "Beefeater",
            "absolut": "Absolut",
            "belvedere": "Belvedere",
            "jack daniels": "Jack Daniel's",
            "jack daniel's": "Jack Daniel's",
            "malibu": "Malibu",
            "brugal": "Brugal",
            "cacique": "Cacique",
            "barcelo": "Barcelo",
            "eristoff": "Eristoff",
            "puerto indias": "Puerto Indias",
            "ratafia": "Ratafia",
        }
        
        # Check exact match first (case-insensitive)
        name_lower = name.lower()
        if name_lower in brand_mappings:
            base_name = brand_mappings[name_lower]
            # If original had additional text (variant), preserve it
            if len(name) > len(name_lower):
                # Check if there's a variant after the base name
                variant_match = re.search(r'\s+(manzana|red label|black label|7|fresa)', name, re.IGNORECASE)
                if variant_match:
                    variant = variant_match.group(1)
                    if variant.lower() == "red label":
                        return "Johnnie Walker Red Label"
                    elif variant.lower() == "black label":
                        return "Johnnie Walker Black Label"
                    elif variant.lower() == "7":
                        return f"{base_name} 7" if "havana" in base_name.lower() else base_name
                    else:
                        return f"{base_name} {variant.capitalize()}"
            return base_name
        
        # Normalize common patterns but preserve variants
        normalized = name
        
        # Fix "Havanna7" -> "Havana Club 7"
        if re.search(r'havanna\s*7', normalized, re.IGNORECASE):
            normalized = re.sub(r'havanna\s*7', 'Havana Club 7', normalized, flags=re.IGNORECASE)
        
        # Fix "Jack Daniels" -> "Jack Daniel's" but preserve variants
        if re.search(r'jack\s+daniels', normalized, re.IGNORECASE):
            normalized = re.sub(r'jack\s+daniels', "Jack Daniel's", normalized, flags=re.IGNORECASE)
        
        # Fix "Red Label" -> "Johnnie Walker Red Label"
        if re.search(r'red\s+label', normalized, re.IGNORECASE) and 'johnnie' not in normalized.lower():
            normalized = re.sub(r'red\s+label', 'Johnnie Walker Red Label', normalized, flags=re.IGNORECASE)
        
        # Fix "Black Label" -> "Johnnie Walker Black Label"
        if re.search(r'black\s+label', normalized, re.IGNORECASE) and 'johnnie' not in normalized.lower():
            normalized = re.sub(r'black\s+label', 'Johnnie Walker Black Label', normalized, flags=re.IGNORECASE)
        
        # Check normalized name against mappings
        normalized_lower = normalized.lower()
        if normalized_lower in brand_mappings:
            return brand_mappings[normalized_lower]
        
        return normalized
    
    async def parse_drinks_text(self, text: str) -> List[Dict[str, Any]]:
        """
        Parse natural language text into structured drink data.
        
        Args:
            text: Natural language input (e.g., "Heineken $5, Corona $6, Coca Cola $3")
            
        Returns:
            List of drink dictionaries with name, price, and optional category
        """
        if not self.client:
            raise ValueError("LLM service not configured (OPENROUTER_KEY missing)")
        
        if not text or len(text.strip()) < 3:
            return []
        
        prompt = f"""Parse drinks into structured JSON. Classify each drink into one of these categories:

CATEGORIES:
- "cocktail": liquor mixed with soda (e.g., Jack & Coke, Vodka Red Bull, Gin Tonic)
- "shot": pure liquor straight (e.g., Jack Daniels, Tequila, Vodka alone)
- "beer": beer or cider (e.g., Heineken, Corona)
- "soda": non-alcoholic drinks (e.g., Coke, Sprite, Water)

Input: "{text}"

RULES:
1. SKIP category headers like "Vodkas:", "Whisky", "Otros"
2. Extract specific brands/drinks with prices
3. Classify correctly:
   - "Jack Daniels $12" → category: "shot"
   - "Jack & Coke $10" → category: "cocktail"
   - "Vodka Red Bull $8" → category: "cocktail"
   - "Heineken $5" → category: "beer"
   - "Coca Cola $3" → category: "soda"
4. Preserve variant names if different prices (e.g., "Jack Daniel's Manzana")
5. Normalize brand names (e.g., "Jack Daniels" → "Jack Daniel's")
6. SKIP plain "Tequila", "Vodka" without brand/price

Return JSON:
{{
  "drinks": [
    {{"name": "Jack Daniel's", "price": 12.00, "category": "shot"}},
    {{"name": "Jack & Coke", "price": 10.00, "category": "cocktail"}},
    {{"name": "Heineken", "price": 5.00, "category": "beer"}},
    {{"name": "Coca Cola", "price": 3.00, "category": "soda"}}
  ]
}}

Return ONLY valid JSON."""

        try:
            response = await self.client.chat.completions.create(
                model="openai/gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a JSON parser. Return only valid JSON arrays."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=4000,  # Increased for large drink lists
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content
            if not content:
                logger.error("Empty response from LLM")
                return []
            
            # Check if response was truncated (incomplete JSON)
            content_stripped = content.strip()
            if not content_stripped.endswith('}') and not content_stripped.endswith(']'):
                logger.warning("LLM response appears truncated, attempting recovery...")
                # Try to extract complete drink objects using regex before attempting JSON repair
                drink_pattern = r'\{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"price"\s*:\s*(\d+\.?\d*)\s*(?:,\s*"category"\s*:\s*"([^"]+)"\s*)?\}'
                matches = re.findall(drink_pattern, content)
                if matches:
                    parsed_drinks = []
                    for match in matches:
                        try:
                            price_str = match[1] if len(match) > 1 else None
                            if not price_str:
                                continue
                            brand_name = self._normalize_brand_name(match[0].strip())
                            parsed_drinks.append({
                                "name": brand_name,
                                "price": float(price_str),
                                "category": match[2] if len(match) > 2 and match[2] else None
                            })
                        except (ValueError, IndexError, TypeError):
                            continue
                    if parsed_drinks:
                        logger.info(f"Recovered {len(parsed_drinks)} drinks from truncated JSON")
                        return parsed_drinks
            
            # Parse JSON response
            try:
                data = json.loads(content)
                # Handle both {"drinks": [...]} and direct array
                if isinstance(data, dict):
                    drinks = data.get("drinks", [])
                elif isinstance(data, list):
                    drinks = data
                else:
                    logger.error(f"Unexpected JSON structure: {type(data)}")
                    return []
                
                # Validate and clean drinks
                parsed_drinks = []
                for drink in drinks:
                    if isinstance(drink, dict) and "name" in drink:
                        # Check if price exists and is not None
                        price = drink.get("price")
                        if price is None:
                            logger.warning(f"Skipping drink '{drink.get('name')}' - price is missing")
                            continue
                        
                        try:
                            # Normalize brand name (preserves variants like "Manzana", "Red Label")
                            brand_name = self._normalize_brand_name(str(drink["name"]).strip())
                            
                            parsed_drinks.append({
                                "name": brand_name,
                                "price": float(price),
                                "category": drink.get("category") if drink.get("category") else None
                            })
                        except (ValueError, TypeError) as e:
                            logger.warning(f"Skipping invalid drink entry: {drink}, error: {e}")
                            continue
                
                logger.info(f"Parsed {len(parsed_drinks)} drinks from text")
                return parsed_drinks
                
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse LLM JSON response: {e}")
                logger.error(f"Response content (first 500 chars): {content[:500]}")
                logger.error(f"Response content (last 500 chars): {content[-500:]}")
                # Try to extract complete drink objects from incomplete JSON using regex
                try:
                    drink_pattern = r'\{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"price"\s*:\s*(\d+\.?\d*)\s*(?:,\s*"category"\s*:\s*"([^"]+)"\s*)?\}'
                    matches = re.findall(drink_pattern, content)
                    if matches:
                        parsed_drinks = []
                        for match in matches:
                            try:
                                price_str = match[1] if len(match) > 1 else None
                                if not price_str:
                                    continue
                                brand_name = self._normalize_brand_name(match[0].strip())
                                parsed_drinks.append({
                                    "name": brand_name,
                                    "price": float(price_str),
                                    "category": match[2] if len(match) > 2 and match[2] else None
                                })
                            except (ValueError, IndexError, TypeError):
                                continue
                        if parsed_drinks:
                            logger.info(f"Recovered {len(parsed_drinks)} drinks from partial JSON")
                            return parsed_drinks
                except Exception as recovery_error:
                    logger.error(f"Failed to recover drinks from partial JSON: {recovery_error}")
                
                return []
                
        except Exception as e:
            logger.error(f"Error parsing drinks text: {str(e)}")
            return []


# Singleton instance
llm_service = LLMService()

