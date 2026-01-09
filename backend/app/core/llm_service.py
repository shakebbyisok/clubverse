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
        
        prompt = f"""Parse drinks/ingredients into structured JSON. Classify PRECISELY based on what the item IS:

PRIMARY CATEGORIES (mutually exclusive):
- "liquor": Pure spirits/liquors that are BASE INGREDIENTS for shots and cocktails
  Examples: Absolut, Jack Daniel's, Beefeater, Cacique, Ballantine's, Havana Club, Smirnoff
  These are the ALCOHOL base - vodka, gin, rum, whisky, tequila, brandy brands
  
- "soda": Mixers and non-alcoholic drinks used to make cocktails
  Examples: Coca-Cola, Sprite, Tonic Water, Red Bull, Fanta, 7Up, Orange Juice, Cranberry
  These are what you MIX with liquor
  
- "beer": Beers and ciders (standalone drinks)
  Examples: Heineken, Corona, Estrella Galicia, Mahou, San Miguel, Amstel
  
- "wine": Wines and champagne (standalone drinks)
  Examples: Rioja, Ribera, Cava, Moet, Veuve Clicquot

LIQUOR TYPES (for liquor category only):
- "vodka": Absolut, Smirnoff, Grey Goose, Belvedere, Eristoff
- "gin": Beefeater, Bombay Sapphire, Hendrick's, Tanqueray, Puerto Indias, Seagram's
- "rum": Bacardi, Havana Club, Cacique, Brugal, Barcelo, Malibu, Captain Morgan
- "whisky": Jack Daniel's, Johnnie Walker, Ballantine's, Jameson, Jim Beam, Chivas
- "tequila": Jose Cuervo, Patron, Don Julio, Olmeca
- "brandy": Fundador, Veterano, Torres, Lepanto
- "liqueur": Jagermeister, Baileys, Licor 43, Cointreau, Kahlua, Amaretto

Input: "{text}"

RULES:
1. CRITICAL: Classify based on WHAT THE ITEM IS, not how it's listed
2. Spirits/alcohol brands → ALWAYS "liquor" (even if under "Shots" header)
3. Soft drinks/mixers → ALWAYS "soda" (Coca-Cola is soda, not liquor!)
4. Section headers help identify liquor_type, NOT the category
5. Under "Gin" section: Beefeater → category: "liquor", liquor_type: "gin"
6. Under "Ron/Rum" section: Havana Club → category: "liquor", liquor_type: "rum"
7. Normalize brand names (e.g., "Jack Daniels" → "Jack Daniel's")
8. SKIP plain headers without prices

Return JSON:
{{
  "drinks": [
    {{"name": "Beefeater", "price": 8.00, "category": "liquor", "liquor_type": "gin"}},
    {{"name": "Jack Daniel's", "price": 10.00, "category": "liquor", "liquor_type": "whisky"}},
    {{"name": "Coca-Cola", "price": 3.00, "category": "soda"}},
    {{"name": "Red Bull", "price": 4.00, "category": "soda"}},
    {{"name": "Heineken", "price": 5.00, "category": "beer"}}
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
                drink_pattern = r'\{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"price"\s*:\s*(\d+\.?\d*)\s*(?:,\s*"category"\s*:\s*"([^"]+)"\s*)?(?:\s*,\s*"subcategory"\s*:\s*"([^"]+)"\s*)?\}'
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
                                "category": match[2] if len(match) > 2 and match[2] else None,
                                "subcategory": match[3] if len(match) > 3 and match[3] else None
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
                                "category": drink.get("category") if drink.get("category") else None,
                                "liquor_type": drink.get("liquor_type") if drink.get("liquor_type") else None,
                                "subcategory": drink.get("subcategory") if drink.get("subcategory") else None
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
                    drink_pattern = r'\{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"price"\s*:\s*(\d+\.?\d*)\s*(?:,\s*"category"\s*:\s*"([^"]+)"\s*)?(?:\s*,\s*"subcategory"\s*:\s*"([^"]+)"\s*)?\}'
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
                                    "category": match[2] if len(match) > 2 and match[2] else None,
                                    "subcategory": match[3] if len(match) > 3 and match[3] else None
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


    async def parse_drinks_with_categories(
        self,
        text: str,
        existing_categories: Optional[List[dict]] = None
    ) -> Dict[str, Any]:
        """
        Parse natural language text into structured drink data with category awareness.
        
        Args:
            text: Natural language input (e.g., "Vodka Soda $8, Rum and coke $7.50")
            existing_categories: List of existing categories with structure:
                [{"id": "cat_xxx", "name": "Drinks", "subcategories": [...]}]
            
        Returns:
            Dictionary with "drinks" list and "suggested_categories" list
        """
        if not self.client:
            raise ValueError("LLM service not configured (OPENROUTER_KEY missing)")

        if not text or len(text.strip()) < 3:
            return {"drinks": [], "suggested_categories": []}

        # Build category context for prompt
        category_context = ""
        if existing_categories:
            category_lines = []
            for cat in existing_categories:
                cat_info = f"- {cat['name']} (ID: {cat['id']})"
                if cat.get('subcategories'):
                    subcats = [f"  - {sub['name']} (ID: {sub['id']})" for sub in cat['subcategories']]
                    cat_info += "\n" + "\n".join(subcats)
                category_lines.append(cat_info)
            category_context = "\n".join(category_lines)
        else:
            category_context = "No existing categories. Will suggest new ones."

        prompt = f"""Parse drinks into structured JSON with category assignments.

EXISTING CATEGORIES:
{category_context}

CATEGORIES:
- "cocktail": liquor mixed with soda (e.g., Jack & Coke, Vodka Red Bull, Gin Tonic)
- "shot": pure liquor straight (e.g., Jack Daniels, Tequila, Vodka alone)
- "beer": beer or cider (e.g., Heineken, Corona)
- "soda": non-alcoholic drinks (e.g., Coke, Sprite, Water)

Input: "{text}"

RULES:
1. SKIP category headers like "Vodkas:", "Whisky", "Otros"
2. Extract specific brands/drinks with prices
3. Assign to existing categories if match found, otherwise suggest new category
4. Classify correctly:
   - "Jack Daniels $12" → category: "shot"
   - "Jack & Coke $10" → category: "cocktail"
   - "Vodka Red Bull $8" → category: "cocktail"
   - "Heineken $5" → category: "beer"
   - "Coca Cola $3" → category: "soda"
5. Preserve variant names if different prices (e.g., "Jack Daniel's Manzana")
6. Normalize brand names (e.g., "Jack Daniels" → "Jack Daniel's")
7. SKIP plain "Tequila", "Vodka" without brand/price

Return JSON:
{{
  "drinks": [
    {{
      "name": "Jack Daniel's",
      "price": 12.00,
      "category": "shot",
      "category_id": "cat_xxx",  // Use existing ID if match, null if new
      "category_name": "Drinks",  // Name for display
      "subcategory_id": "subcat_xxx",  // Optional: if subcategory exists
      "subcategory_name": "Shots"  // Optional: name for display
    }}
  ],
  "suggested_categories": [
    {{
      "name": "New Category",
      "subcategory_name": "New Subcategory",  // Optional
      "reason": "No matching category found"
    }}
  ]
}}

Return ONLY valid JSON."""

        try:
            response = await self.client.chat.completions.create(
                model="openai/gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a JSON parser. Return only valid JSON objects."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=4000,
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content
            if not content:
                logger.error("Empty response from LLM")
                return []

            # Parse JSON response
            try:
                data = json.loads(content)
                drinks = data.get("drinks", [])
                suggested_categories = data.get("suggested_categories", [])

                # Validate and clean drinks
                parsed_drinks = []
                for drink in drinks:
                    if isinstance(drink, dict) and "name" in drink:
                        price = drink.get("price")
                        if price is None:
                            logger.warning(f"Skipping drink '{drink.get('name')}' - price is missing")
                            continue

                        try:
                            brand_name = self._normalize_brand_name(str(drink["name"]).strip())
                            parsed_drinks.append({
                                "name": brand_name,
                                "price": float(price),
                                "category": drink.get("category"),
                                "category_id": drink.get("category_id"),
                                "category_name": drink.get("category_name"),
                                "subcategory_id": drink.get("subcategory_id"),
                                "subcategory_name": drink.get("subcategory_name"),
                            })
                        except (ValueError, TypeError) as e:
                            logger.warning(f"Skipping invalid drink entry: {drink}, error: {e}")
                            continue

                logger.info(f"Parsed {len(parsed_drinks)} drinks with categories from text")
                return {
                    "drinks": parsed_drinks,
                    "suggested_categories": suggested_categories
                }

            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse LLM JSON response: {e}")
                logger.error(f"Response content (first 500 chars): {content[:500]}")
                return {"drinks": [], "suggested_categories": []}

        except Exception as e:
            logger.error(f"Error parsing drinks with categories: {str(e)}")
            return {"drinks": [], "suggested_categories": []}

    async def parse_ingredients(self, text: str) -> Dict[str, List[Dict[str, Any]]]:
        """
        Parse natural language text and separate into liquors and sodas.
        
        Args:
            text: Natural language input with liquors and/or sodas
            
        Returns:
            Dictionary with "liquors" and "sodas" lists
        """
        if not self.client:
            raise ValueError("LLM service not configured (OPENROUTER_KEY missing)")

        if not text or len(text.strip()) < 3:
            return {"liquors": [], "sodas": []}

        prompt = f"""Parse ingredients for a bar into structured JSON. Separate LIQUORS from SODAS/MIXERS.

LIQUORS (spirits/alcohol - base for shots and cocktails):
These are alcohol brands: vodka, gin, rum, whisky, tequila, brandy, liqueur
Examples: Absolut, Jack Daniel's, Beefeater, Bacardi, Havana Club, Johnnie Walker

SODAS/MIXERS (non-alcoholic drinks used to make cocktails):
These are soft drinks and mixers
Examples: Coca-Cola, Sprite, Tonic Water, Red Bull, Fanta, Orange Juice

LIQUOR TYPES:
- vodka: Absolut, Smirnoff, Grey Goose, Belvedere, Eristoff, Stolichnaya
- gin: Beefeater, Bombay Sapphire, Hendrick's, Tanqueray, Puerto Indias, Seagram's
- rum: Bacardi, Havana Club, Cacique, Brugal, Barcelo, Malibu, Captain Morgan
- whisky: Jack Daniel's, Johnnie Walker (Red/Black Label), Ballantine's, Jameson, Jim Beam
- tequila: Jose Cuervo, Patron, Don Julio, Olmeca, Sierra
- brandy: Fundador, Veterano, Torres, Lepanto, Cardenal Mendoza
- liqueur: Jagermeister, Baileys, Licor 43, Cointreau, Kahlua, Amaretto, Fireball

Input: "{text}"

RULES:
1. Classify STRICTLY by what the item IS
2. All alcohol brands → liquors
3. All soft drinks/mixers → sodas
4. Extract price for each item
5. For liquors, identify the liquor_type
6. Normalize brand names
7. Skip headers without prices

Return JSON:
{{
  "liquors": [
    {{"name": "Absolut", "price": 8.00, "liquor_type": "vodka"}},
    {{"name": "Beefeater", "price": 8.00, "liquor_type": "gin"}},
    {{"name": "Jack Daniel's", "price": 10.00, "liquor_type": "whisky"}}
  ],
  "sodas": [
    {{"name": "Coca-Cola", "price": 3.00, "price_addon": 0}},
    {{"name": "Red Bull", "price": 4.00, "price_addon": 2.00}}
  ]
}}

Notes on sodas:
- price: standalone price (if sold alone)
- price_addon: extra cost when mixed in cocktail (Red Bull typically +2€)

Return ONLY valid JSON."""

        try:
            response = await self.client.chat.completions.create(
                model="openai/gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a JSON parser for bar inventory. Return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=4000,
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content
            if not content:
                logger.error("Empty response from LLM")
                return {"liquors": [], "sodas": []}

            try:
                data = json.loads(content)
                liquors_raw = data.get("liquors", [])
                sodas_raw = data.get("sodas", [])

                # Process liquors
                liquors = []
                for item in liquors_raw:
                    if isinstance(item, dict) and "name" in item and item.get("price") is not None:
                        liquors.append({
                            "name": self._normalize_brand_name(str(item["name"]).strip()),
                            "price": float(item["price"]),
                            "liquor_type": item.get("liquor_type", "other")
                        })

                # Process sodas
                sodas = []
                for item in sodas_raw:
                    if isinstance(item, dict) and "name" in item:
                        sodas.append({
                            "name": self._normalize_brand_name(str(item["name"]).strip()),
                            "price": float(item.get("price", 0)),
                            "price_addon": float(item.get("price_addon", 0))
                        })

                logger.info(f"Parsed {len(liquors)} liquors and {len(sodas)} sodas from text")
                return {"liquors": liquors, "sodas": sodas}

            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse ingredients JSON: {e}")
                return {"liquors": [], "sodas": []}

        except Exception as e:
            logger.error(f"Error parsing ingredients: {str(e)}")
            return {"liquors": [], "sodas": []}

    async def smart_parse(
        self,
        text: str,
        existing_liquors: Optional[List[Dict[str, Any]]] = None,
        existing_sodas: Optional[List[Dict[str, Any]]] = None,
        existing_categories: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Smart parsing that understands context and auto-creates missing ingredients.
        
        Handles:
        - Pure liquors → Creates liquor + auto-shot
        - Pure sodas → Creates soda
        - Cocktails (Gin Tonic, Vodka Red Bull) → Creates missing liquor/soda + cocktail
        - Explicit category creation ("under Premium Whisky", "create category X")
        - Beers, wines → Regular drinks
        
        Args:
            text: Natural language input
            existing_liquors: List of existing liquors [{id, name, liquor_type}]
            existing_sodas: List of existing sodas [{id, name}]
            existing_categories: List of existing categories [{id, name}]
            
        Returns:
            {
                "liquors": [...],      # Liquors to create
                "sodas": [...],        # Sodas to create
                "cocktails": [...],    # Cocktails to create with liquor/soda refs
                "drinks": [...],       # Other drinks (beers, wines)
                "category": {...},     # Category to create (if explicit)
                "category_for_items": "...",  # Category name to assign
            }
        """
        if not self.client:
            raise ValueError("LLM service not configured (OPENROUTER_KEY missing)")

        if not text or len(text.strip()) < 3:
            return {"liquors": [], "sodas": [], "cocktails": [], "drinks": [], "category": None}

        # Build context for existing inventory
        liquors_context = ""
        if existing_liquors:
            liquors_list = [f"- {l['name']} ({l.get('liquor_type', 'other')})" for l in existing_liquors]
            liquors_context = "EXISTING LIQUORS:\n" + "\n".join(liquors_list)
        else:
            liquors_context = "EXISTING LIQUORS: None"

        sodas_context = ""
        if existing_sodas:
            sodas_list = [f"- {s['name']}" for s in existing_sodas]
            sodas_context = "EXISTING SODAS:\n" + "\n".join(sodas_list)
        else:
            sodas_context = "EXISTING SODAS: None"

        categories_context = ""
        if existing_categories:
            cat_list = [f"- {c['name']}" for c in existing_categories]
            categories_context = "EXISTING CATEGORIES:\n" + "\n".join(cat_list)
        else:
            categories_context = "EXISTING CATEGORIES: Shots, Cocktails, Beers, Wines, Sodas, Spirits"

        prompt = f"""Parse bar items from natural language. Be SMART about cocktails and categories.

{liquors_context}

{sodas_context}

{categories_context}

USER INPUT: "{text}"

CLASSIFICATION RULES:

1. PURE LIQUORS (spirits sold as shots):
   - Brand names: Absolut, Jack Daniel's, Beefeater, Havana Club, etc.
   - Generic: Vodka, Gin, Rum, Whisky, Tequila
   → Output as "liquors"

2. PURE SODAS (mixers):
   - Coca-Cola, Sprite, Tonic Water, Red Bull, Fanta, Orange Juice
   → Output as "sodas"

3. COCKTAILS (liquor + soda combination):
   Recognize patterns like:
   - "Gin Tonic" → liquor: "Gin", soda: "Tonic"
   - "Vodka Red Bull" → liquor: "Vodka", soda: "Red Bull"
   - "Rum Cola" / "Cuba Libre" → liquor: "Rum", soda: "Cola"
   - "Whisky Cola" / "Jack Cola" → liquor: "Whisky", soda: "Cola"
   - "Vodka Orange" → liquor: "Vodka", soda: "Orange Juice"
   
   For each cocktail:
   - Check if liquor exists in EXISTING LIQUORS → use existing name
   - If not exists → create generic (e.g., "Gin" not "Beefeater")
   - Check if soda exists in EXISTING SODAS → use existing name
   - If not exists → create it
   → Output as "cocktails" with liquor_name and soda_name

4. OTHER DRINKS (beers, wines):
   - Heineken, Corona, Estrella → category: "beer"
   - Rioja, Cava, Moet → category: "wine"
   → Output as "drinks"

5. CATEGORY DETECTION:
   Look for explicit category mentions:
   - "under [Category Name]"
   - "in [Category Name] category"
   - "create category [Name]"
   - "add to [Category Name]"
   
   If category mentioned but NOT in EXISTING CATEGORIES:
   → Set "new_category" with the name
   
   Set "category_for_items" to assign all items to this category.

LIQUOR TYPE MAPPING:
- Vodka brands/generic → "vodka"
- Gin brands/generic → "gin"  
- Rum brands/generic → "rum"
- Whisky/Whiskey/Bourbon → "whisky"
- Tequila brands → "tequila"
- Brandy/Cognac → "brandy"
- Jagermeister, Baileys, Licor 43 → "liqueur"

Return JSON:
{{
  "liquors": [
    {{"name": "Absolut", "price": 8.00, "liquor_type": "vodka", "is_new": true}}
  ],
  "sodas": [
    {{"name": "Tonic Water", "price": 2.00, "price_addon": 0, "is_new": true}}
  ],
  "cocktails": [
    {{
      "name": "Gin Tonic",
      "price": 10.00,
      "liquor_name": "Gin",
      "liquor_exists": false,
      "soda_name": "Tonic Water", 
      "soda_exists": true
    }}
  ],
  "drinks": [
    {{"name": "Heineken", "price": 5.00, "category": "beer"}}
  ],
  "new_category": {{"name": "Premium Spirits", "reason": "explicitly requested"}},
  "category_for_items": "Premium Spirits"
}}

IMPORTANT:
- For cocktails, extract the BASE liquor type (Gin, Vodka, Rum) not brand
- Match existing inventory by name (case-insensitive)
- If "Gin Tonic" and no gin exists, create generic "Gin" liquor
- Only set "new_category" if explicitly mentioned and doesn't exist
- "is_new" = true if item needs to be created, false if exists

Return ONLY valid JSON."""

        try:
            response = await self.client.chat.completions.create(
                model="openai/gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a smart bar inventory parser. Return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=4000,
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content
            if not content:
                logger.error("Empty response from LLM smart_parse")
                return {"liquors": [], "sodas": [], "cocktails": [], "drinks": [], "category": None}

            try:
                data = json.loads(content)
                
                # Process liquors
                liquors = []
                for item in data.get("liquors", []):
                    if isinstance(item, dict) and "name" in item and item.get("price") is not None:
                        liquors.append({
                            "name": self._normalize_brand_name(str(item["name"]).strip()),
                            "price": float(item["price"]),
                            "liquor_type": item.get("liquor_type", "other"),
                            "is_new": item.get("is_new", True)
                        })

                # Process sodas
                sodas = []
                for item in data.get("sodas", []):
                    if isinstance(item, dict) and "name" in item:
                        sodas.append({
                            "name": str(item["name"]).strip(),
                            "price": float(item.get("price", 0)),
                            "price_addon": float(item.get("price_addon", 0)),
                            "is_new": item.get("is_new", True)
                        })

                # Process cocktails
                cocktails = []
                for item in data.get("cocktails", []):
                    if isinstance(item, dict) and "name" in item and item.get("price") is not None:
                        cocktails.append({
                            "name": str(item["name"]).strip(),
                            "price": float(item["price"]),
                            "liquor_name": str(item.get("liquor_name", "")).strip(),
                            "liquor_exists": item.get("liquor_exists", False),
                            "soda_name": str(item.get("soda_name", "")).strip(),
                            "soda_exists": item.get("soda_exists", False)
                        })

                # Process other drinks
                drinks = []
                for item in data.get("drinks", []):
                    if isinstance(item, dict) and "name" in item and item.get("price") is not None:
                        drinks.append({
                            "name": self._normalize_brand_name(str(item["name"]).strip()),
                            "price": float(item["price"]),
                            "category": item.get("category", "other")
                        })

                # Process category
                new_category = None
                if data.get("new_category") and isinstance(data["new_category"], dict):
                    new_category = {
                        "name": str(data["new_category"].get("name", "")).strip(),
                        "reason": data["new_category"].get("reason", "")
                    }

                category_for_items = data.get("category_for_items")

                logger.info(
                    f"Smart parsed: {len(liquors)} liquors, {len(sodas)} sodas, "
                    f"{len(cocktails)} cocktails, {len(drinks)} drinks, "
                    f"category: {category_for_items}"
                )

                return {
                    "liquors": liquors,
                    "sodas": sodas,
                    "cocktails": cocktails,
                    "drinks": drinks,
                    "new_category": new_category,
                    "category_for_items": category_for_items
                }

            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse smart_parse JSON: {e}")
                return {"liquors": [], "sodas": [], "cocktails": [], "drinks": [], "category": None}

        except Exception as e:
            logger.error(f"Error in smart_parse: {str(e)}")
            return {"liquors": [], "sodas": [], "cocktails": [], "drinks": [], "category": None}


# Singleton instance
llm_service = LLMService()

