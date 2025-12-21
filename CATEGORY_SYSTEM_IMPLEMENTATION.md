# Category & Item Management System - Implementation Guide

## 📋 Overview

Complete implementation of a categorized item management system with:
- **Natural Language Processing**: Convert user input to structured categorized items
- **Smart Image Resolution**: Auto-assign liquor images for drinks/shots, custom upload for others
- **Category Management**: Hierarchical categories → subcategories → items structure
- **AI-Powered Generation**: LLM parses natural language and assigns categories automatically

---

## 🏗️ Architecture

### Data Structure
```
Business.meta.category_config
├── mode: "custom" | "template" | "hybrid"
├── template_id: optional
├── categories: {
│   "cat_xxx": {
│     id: "cat_xxx",
│     name: "Drinks",
│     subcategories: {
│       "subcat_xxx": {
│         id: "subcat_xxx",
│         name: "Cocktails",
│         items: [...]
│       }
│     }
│   }
│ }
```

### Flow
```
User Input (Natural Language)
  ↓
LLM Processing (with category context)
  ↓
Parse & Structure Items
  ↓
Resolve Images (liquor library or custom)
  ↓
Assign Categories (create if needed)
  ↓
Return Structured Response (with category names)
```

---

## 🔧 Backend Implementation

### Step 1: Create Category Schemas

**File:** `shared/database/schemas/category.py`

```python
"""
Category and Item schemas for business menu/product management.
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from enum import Enum


class ImageType(str, Enum):
    """Image type for items"""
    LIQUOR = "liquor"  # Uses liquor library images
    CUSTOM = "custom"   # User uploaded images


class ItemImage(BaseModel):
    """Image configuration for an item"""
    type: ImageType = Field(..., description="Image type: liquor or custom")
    liquor_name: Optional[str] = Field(None, description="Liquor name if type is liquor")
    mixer_name: Optional[str] = Field(None, description="Mixer name for mixed drinks")
    image_path: Optional[str] = Field(None, description="Resolved image path")
    requires_upload: bool = Field(False, description="Whether user needs to upload image")
    uploaded_file_id: Optional[str] = Field(None, description="Uploaded file ID if custom")


class Item(BaseModel):
    """Individual item/product"""
    id: Optional[str] = Field(None, description="Item ID (auto-generated if not provided)")
    name: str = Field(..., description="Item name")
    description: Optional[str] = Field(None, description="Item description")
    price: Optional[float] = Field(None, description="Item price")
    category_id: str = Field(..., description="Parent category ID")
    subcategory_id: Optional[str] = Field(None, description="Subcategory ID")
    category_name: Optional[str] = Field(None, description="Category name (for display)")
    subcategory_name: Optional[str] = Field(None, description="Subcategory name (for display)")
    image: ItemImage = Field(..., description="Image configuration")
    meta: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")


class Subcategory(BaseModel):
    """Subcategory within a category"""
    id: str = Field(..., description="Subcategory ID")
    name: str = Field(..., description="Subcategory name")
    description: Optional[str] = Field(None, description="Subcategory description")
    items: List[Item] = Field(default_factory=list, description="Items in this subcategory")
    meta: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")


class Category(BaseModel):
    """Top-level category"""
    id: str = Field(..., description="Category ID")
    name: str = Field(..., description="Category name")
    description: Optional[str] = Field(None, description="Category description")
    subcategories: Dict[str, Subcategory] = Field(default_factory=dict, description="Subcategories")
    meta: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")


class CategoryConfig(BaseModel):
    """Complete category configuration for a business"""
    mode: str = Field("custom", description="Mode: template, custom, or hybrid")
    template_id: Optional[str] = Field(None, description="Template ID if using template")
    template_version: Optional[str] = Field(None, description="Template version")
    categories: Dict[str, Category] = Field(default_factory=dict, description="Categories dictionary")


class NaturalLanguageItemRequest(BaseModel):
    """Request to generate items from natural language"""
    user_input: str = Field(..., description="Natural language input describing items")


class ItemGenerationResponse(BaseModel):
    """Response from item generation"""
    items: List[Item] = Field(..., description="Generated items")
    suggested_categories: List[Dict[str, Any]] = Field(default_factory=list, description="Suggested new categories")
    requires_user_action: Dict[str, Any] = Field(default_factory=dict, description="Actions user needs to take")


class CategoryCreateRequest(BaseModel):
    """Request to create a category"""
    name: str = Field(..., description="Category name")
    description: Optional[str] = Field(None, description="Category description")


class SubcategoryCreateRequest(BaseModel):
    """Request to create a subcategory"""
    category_id: str = Field(..., description="Parent category ID")
    name: str = Field(..., description="Subcategory name")
    description: Optional[str] = Field(None, description="Subcategory description")


class ItemCreateRequest(BaseModel):
    """Request to create an item"""
    category_id: str = Field(..., description="Category ID")
    subcategory_id: Optional[str] = Field(None, description="Subcategory ID")
    name: str = Field(..., description="Item name")
    description: Optional[str] = Field(None, description="Item description")
    price: Optional[float] = Field(None, description="Item price")
    image: Optional[ItemImage] = Field(None, description="Image configuration")


class CategoryResponse(BaseModel):
    """Category response"""
    categories: Dict[str, Category] = Field(..., description="Categories dictionary")
    config: CategoryConfig = Field(..., description="Category configuration")
```

**Update:** `shared/database/schemas/__init__.py`
```python
from .category import (
    ImageType, ItemImage, Item, Subcategory, Category, CategoryConfig,
    NaturalLanguageItemRequest, ItemGenerationResponse,
    CategoryCreateRequest, SubcategoryCreateRequest, ItemCreateRequest, CategoryResponse
)

# Add to __all__:
'ImageType', 'ItemImage', 'Item', 'Subcategory', 'Category', 'CategoryConfig',
'NaturalLanguageItemRequest', 'ItemGenerationResponse',
'CategoryCreateRequest', 'SubcategoryCreateRequest', 'ItemCreateRequest', 'CategoryResponse',
```

---

### Step 2: Create Image Resolver Service

**File:** `api_gateway/app/services/domains/business/image_resolver.py`

```python
"""
Image resolver service for items.
Handles liquor library mapping and image path resolution.
"""
import logging
from typing import Dict, Any, Optional
from shared.database.schemas.category import ItemImage, ImageType

logger = logging.getLogger(__name__)


class ImageResolver:
    """Resolves image paths for items based on type and category"""
    
    # Liquor image library mapping
    LIQUOR_IMAGE_MAP = {
        "vodka": "/images/liquors/vodka.png",
        "rum": "/images/liquors/rum.png",
        "tequila": "/images/liquors/tequila.png",
        "whiskey": "/images/liquors/whiskey.png",
        "whisky": "/images/liquors/whiskey.png",
        "bourbon": "/images/liquors/bourbon.png",
        "scotch": "/images/liquors/scotch.png",
        "gin": "/images/liquors/gin.png",
        "brandy": "/images/liquors/brandy.png",
        "cognac": "/images/liquors/cognac.png",
        "champagne": "/images/liquors/champagne.png",
        "wine": "/images/liquors/wine.png",
        "beer": "/images/liquors/beer.png",
    }
    
    # Generic fallback
    GENERIC_LIQUOR_IMAGE = "/images/liquors/generic.png"
    
    def resolve_item_image(self, item_data: Dict[str, Any], category_data: Optional[Dict[str, Any]] = None) -> ItemImage:
        """
        Resolve image path based on item type and category structure.
        
        Args:
            item_data: Item data with image configuration
            category_data: Optional category data for context
            
        Returns:
            Resolved ItemImage object
        """
        image_config = item_data.get("image", {})
        image_type = image_config.get("type", "custom")
        
        if image_type == ImageType.LIQUOR:
            return self._resolve_liquor_image(item_data, image_config)
        else:
            return self._resolve_custom_image(item_data, image_config)
    
    def _resolve_liquor_image(self, item_data: Dict[str, Any], image_config: Dict[str, Any]) -> ItemImage:
        """Resolve liquor-based image"""
        liquor_name = image_config.get("liquor_name", "").lower().strip()
        
        if not liquor_name:
            logger.warning(f"No liquor name provided for item: {item_data.get('name')}")
            return ItemImage(
                type=ImageType.LIQUOR,
                image_path=self.GENERIC_LIQUOR_IMAGE,
                requires_upload=False
            )
        
        # Find matching liquor image
        image_path = self.LIQUOR_IMAGE_MAP.get(liquor_name)
        
        if not image_path:
            # Try fuzzy matching (first word match)
            first_word = liquor_name.split()[0] if liquor_name else ""
            image_path = self.LIQUOR_IMAGE_MAP.get(first_word)
        
        if not image_path:
            logger.info(f"No matching liquor image for '{liquor_name}', using generic")
            image_path = self.GENERIC_LIQUOR_IMAGE
        
        return ItemImage(
            type=ImageType.LIQUOR,
            liquor_name=liquor_name,
            mixer_name=image_config.get("mixer_name"),
            image_path=image_path,
            requires_upload=False
        )
    
    def _resolve_custom_image(self, item_data: Dict[str, Any], image_config: Dict[str, Any]) -> ItemImage:
        """Resolve custom/uploaded image"""
        image_path = image_config.get("image_path")
        uploaded_file_id = image_config.get("uploaded_file_id")
        
        # If image path or file ID exists, image is already uploaded
        if image_path or uploaded_file_id:
            return ItemImage(
                type=ImageType.CUSTOM,
                image_path=image_path,
                uploaded_file_id=uploaded_file_id,
                requires_upload=False
            )
        
        # Otherwise, requires upload
        return ItemImage(
            type=ImageType.CUSTOM,
            image_path=None,
            requires_upload=True
        )
    
    def get_liquor_list(self) -> list[str]:
        """Get list of available liquors"""
        return list(self.LIQUOR_IMAGE_MAP.keys())
    
    def add_liquor_mapping(self, liquor_name: str, image_path: str) -> None:
        """Add or update liquor mapping (for future extensibility)"""
        self.LIQUOR_IMAGE_MAP[liquor_name.lower()] = image_path
        logger.info(f"Added liquor mapping: {liquor_name} -> {image_path}")
```

---

### Step 3: Create Category Service

**File:** `api_gateway/app/services/domains/business/category_service.py`

```python
"""
Category service for managing business categories and items.
Handles CRUD operations on Business.meta.categories.
"""
import logging
import uuid
from typing import Dict, Any, Optional, List
from shared.clients.read_data import ReadServiceClient
from shared.clients.write_data import WriteServiceClient
from shared.database.schemas.category import (
    Category, Subcategory, Item, CategoryConfig, CategoryResponse
)

logger = logging.getLogger(__name__)


class CategoryService:
    """Service for managing categories and items"""
    
    def __init__(self, read_client: ReadServiceClient, write_client: WriteServiceClient):
        self.read_client = read_client
        self.write_client = write_client
    
    async def get_categories(self, business_id: str) -> Dict[str, Category]:
        """
        Get all categories for a business.
        
        Returns:
            Dictionary of categories keyed by category ID
        """
        try:
            business = await self.read_client.get_business(business_id)
            if not business:
                return {}
            
            meta = business.get("meta", {})
            category_config = meta.get("category_config", {})
            categories_dict = category_config.get("categories", {})
            
            # Convert to Category objects
            categories = {}
            for cat_id, cat_data in categories_dict.items():
                try:
                    categories[cat_id] = Category(**cat_data)
                except Exception as e:
                    logger.warning(f"Failed to parse category {cat_id}: {e}")
                    continue
            
            return categories
        except Exception as e:
            logger.error(f"Error getting categories for business {business_id}: {e}")
            return {}
    
    async def get_category_config(self, business_id: str) -> CategoryConfig:
        """Get complete category configuration"""
        try:
            business = await self.read_client.get_business(business_id)
            if not business:
                return CategoryConfig()
            
            meta = business.get("meta", {})
            category_config_data = meta.get("category_config", {})
            
            return CategoryConfig(**category_config_data)
        except Exception as e:
            logger.error(f"Error getting category config for business {business_id}: {e}")
            return CategoryConfig()
    
    async def create_category(self, business_id: str, name: str, description: Optional[str] = None) -> Category:
        """Create a new category"""
        category_id = f"cat_{uuid.uuid4().hex[:12]}"
        
        category = Category(
            id=category_id,
            name=name,
            description=description,
            subcategories={}
        )
        
        # Get existing categories
        categories = await self.get_categories(business_id)
        categories[category_id] = category
        
        # Update business meta
        await self._update_category_config(business_id, categories)
        
        logger.info(f"Created category {category_id} for business {business_id}")
        return category
    
    async def create_subcategory(
        self, 
        business_id: str, 
        category_id: str, 
        name: str, 
        description: Optional[str] = None
    ) -> Subcategory:
        """Create a new subcategory"""
        subcategory_id = f"subcat_{uuid.uuid4().hex[:12]}"
        
        subcategory = Subcategory(
            id=subcategory_id,
            name=name,
            description=description,
            items=[]
        )
        
        # Get existing categories
        categories = await self.get_categories(business_id)
        
        if category_id not in categories:
            raise ValueError(f"Category {category_id} not found")
        
        # Add subcategory
        categories[category_id].subcategories[subcategory_id] = subcategory
        
        # Update business meta
        await self._update_category_config(business_id, categories)
        
        logger.info(f"Created subcategory {subcategory_id} in category {category_id}")
        return subcategory
    
    async def add_item(
        self,
        business_id: str,
        category_id: str,
        item: Item,
        subcategory_id: Optional[str] = None
    ) -> Item:
        """Add an item to a category/subcategory"""
        # Generate ID if not provided
        if not item.id:
            item.id = f"item_{uuid.uuid4().hex[:12]}"
        
        # Get existing categories
        categories = await self.get_categories(business_id)
        
        if category_id not in categories:
            raise ValueError(f"Category {category_id} not found")
        
        category = categories[category_id]
        
        if subcategory_id:
            # Add to subcategory
            if subcategory_id not in category.subcategories:
                raise ValueError(f"Subcategory {subcategory_id} not found")
            
            subcategory = category.subcategories[subcategory_id]
            subcategory.items.append(item)
        else:
            # Add to category directly (create default subcategory if needed)
            default_subcat_id = f"subcat_default_{category_id}"
            if default_subcat_id not in category.subcategories:
                category.subcategories[default_subcat_id] = Subcategory(
                    id=default_subcat_id,
                    name="Default",
                    items=[]
                )
            category.subcategories[default_subcat_id].items.append(item)
        
        # Update business meta
        await self._update_category_config(business_id, categories)
        
        logger.info(f"Added item {item.id} to category {category_id}")
        return item
    
    async def _update_category_config(
        self,
        business_id: str,
        categories: Dict[str, Category]
    ) -> None:
        """Internal method to update category config in business meta"""
        try:
            # Get current business data
            business = await self.read_client.get_business(business_id)
            if not business:
                raise ValueError(f"Business {business_id} not found")
            
            meta = business.get("meta", {}) or {}
            category_config_data = meta.get("category_config", {}) or {}
            
            # Convert categories to dict
            categories_dict = {}
            for cat_id, category in categories.items():
                categories_dict[cat_id] = category.model_dump()
            
            # Update category config
            category_config_data["categories"] = categories_dict
            
            # Preserve other config fields
            if "mode" not in category_config_data:
                category_config_data["mode"] = "custom"
            
            # Update meta
            meta["category_config"] = category_config_data
            
            # Update business
            await self.write_client.update_business(business_id, {"meta": meta})
            
            logger.info(f"Updated category config for business {business_id}")
        except Exception as e:
            logger.error(f"Error updating category config for business {business_id}: {e}")
            raise
    
    async def get_all_items(self, business_id: str) -> List[Item]:
        """Get all items across all categories"""
        categories = await self.get_categories(business_id)
        items = []
        
        for category in categories.values():
            for subcategory in category.subcategories.values():
                items.extend(subcategory.items)
        
        return items
    
    async def find_item(self, business_id: str, item_id: str) -> Optional[Item]:
        """Find an item by ID"""
        items = await self.get_all_items(business_id)
        for item in items:
            if item.id == item_id:
                return item
        return None
```

---

### Step 4: Create Item Generation Service

**File:** `api_gateway/app/services/domains/business/item_generation_service.py`

```python
"""
Categorized item generation service.
Converts natural language input to categorized items with image paths.
"""
import logging
import json
from typing import Dict, Any, List, Optional
from shared.clients.llm.client import LLMServiceClient
from shared.database.schemas.category import (
    Item, ItemImage, ImageType, Category, NaturalLanguageItemRequest, ItemGenerationResponse
)
from .image_resolver import ImageResolver
from .category_service import CategoryService

logger = logging.getLogger(__name__)


class CategorizedItemGenerationService:
    """Generates categorized items from natural language input"""
    
    def __init__(
        self,
        llm_client: LLMServiceClient,
        image_resolver: ImageResolver,
        category_service: CategoryService
    ):
        self.llm_client = llm_client
        self.image_resolver = image_resolver
        self.category_service = category_service
    
    async def generate_items_from_natural_language(
        self,
        business_id: str,
        user_input: str
    ) -> ItemGenerationResponse:
        """
        Generate categorized items from natural language input.
        
        Args:
            business_id: Business ID
            user_input: Natural language description of items
            
        Returns:
            ItemGenerationResponse with items and suggested categories
        """
        try:
            # 1. Get existing categories for context
            existing_categories = await self.category_service.get_categories(business_id)
            
            # 2. Build enhanced prompt with category context
            prompt = self._build_categorization_prompt(user_input, existing_categories)
            
            # 3. Call LLM to generate structured data
            llm_response = await self._call_llm_for_items(prompt)
            
            # 4. Parse LLM response
            parsed_data = self._parse_llm_response(llm_response)
            
            # 5. Create suggested categories first if needed
            created_categories = {}
            for suggested_cat in parsed_data.get("suggested_categories", []):
                cat_name = suggested_cat.get("name")
                if cat_name and cat_name not in [c.name for c in existing_categories.values()]:
                    try:
                        new_category = await self.category_service.create_category(
                            business_id,
                            cat_name,
                            suggested_cat.get("reason")
                        )
                        created_categories[new_category.id] = new_category
                        existing_categories[new_category.id] = new_category
                        logger.info(f"Created suggested category: {cat_name} ({new_category.id})")
                    except Exception as e:
                        logger.warning(f"Failed to create suggested category {cat_name}: {e}")
            
            # Refresh categories after creating new ones
            existing_categories = await self.category_service.get_categories(business_id)
            
            # 6. Resolve images and assign categories
            resolved_items = []
            for item_data in parsed_data.get("items", []):
                # Resolve image path
                image_config = self.image_resolver.resolve_item_image(item_data)
                item_data["image"] = image_config.model_dump()
                
                # Assign to category and get category info
                category_assignment = await self._assign_to_category(
                    business_id,
                    item_data,
                    existing_categories
                )
                item_data["category_id"] = category_assignment["category_id"]
                item_data["subcategory_id"] = category_assignment.get("subcategory_id")
                
                # Add category and subcategory names for frontend display
                category = existing_categories.get(category_assignment["category_id"])
                if category:
                    item_data["category_name"] = category.name
                    if category_assignment.get("subcategory_id"):
                        subcategory = category.subcategories.get(category_assignment["subcategory_id"])
                        if subcategory:
                            item_data["subcategory_name"] = subcategory.name
                
                # Create Item object
                try:
                    item = Item(**item_data)
                    resolved_items.append(item)
                except Exception as e:
                    logger.warning(f"Failed to create item from data: {e}, data: {item_data}")
                    continue
            
            # 7. Prepare response with category info
            suggested_categories = parsed_data.get("suggested_categories", [])
            requires_upload = [
                item.model_dump() for item in resolved_items
                if item.image.requires_upload
            ]
            
            # Filter out already-created categories from suggestions
            remaining_suggestions = [
                sc for sc in suggested_categories
                if sc.get("name") not in [c.name for c in existing_categories.values()]
            ]
            
            return ItemGenerationResponse(
                items=resolved_items,
                suggested_categories=remaining_suggestions,
                requires_user_action={
                    "upload_images": requires_upload,
                    "confirm_categories": remaining_suggestions
                }
            )
        except Exception as e:
            logger.error(f"Error generating items from natural language: {e}")
            raise
    
    def _build_categorization_prompt(self, user_input: str, existing_categories: Dict[str, Category]) -> str:
        """Build LLM prompt for categorization"""
        categories_summary = self._format_categories_for_prompt(existing_categories)
        
        return f"""
You are an expert menu/item categorization system. Parse the user's natural language input and generate structured item data.

USER INPUT:
"{user_input}"

EXISTING CATEGORIES STRUCTURE:
{categories_summary}

TASK:
1. Extract item details (name, description, price if mentioned)
2. Determine the BEST category and subcategory from existing structure
3. If no match exists, suggest new category/subcategory
4. Determine image type (liquor-based, custom upload, or use existing)
5. For drinks: extract liquor type and soda/mixer preference

IMAGE RESOLUTION LOGIC:
- If item is a DRINK (mixed drink, cocktail, etc.):
  → type: "liquor"
  → Extract liquor_name (vodka, rum, tequila, etc.)
  → Extract mixer_name (soda, coke, juice, etc.)
  → image_path: Will be resolved from liquor library
  
- If item is a SHOT:
  → type: "liquor" 
  → Extract liquor_name
  → image_path: Same as drinks (uses liquor image)
  
- If item is FOOD or OTHER:
  → type: "custom"
  → image_path: null (user will upload)
  → requires_upload: true

CATEGORY MATCHING:
- Match to existing categories first
- Use fuzzy matching for similar names
- If no match: suggest new category with confidence score

OUTPUT FORMAT (JSON):
{{
    "items": [
        {{
            "name": "Vodka Soda",
            "description": "Vodka mixed with soda water",
            "price": 8.00,
            "category_id": "cat_drinks",  // Use existing ID if available, otherwise use category_name
            "category_name": "Drinks",  // REQUIRED: Category name for display
            "subcategory_id": "subcat_mixed_drinks",  // Optional: Use if exists
            "subcategory_name": "Mixed Drinks",  // REQUIRED if subcategory: Name for display
            "image": {{
                "type": "liquor",
                "liquor_name": "vodka",
                "mixer_name": "soda"
            }},
            "confidence": 0.95
        }}
    ],
    "suggested_categories": [
        {{
            "name": "New Category Name",
            "parent_category": "cat_drinks",
            "confidence": 0.7,
            "reason": "No matching subcategory found"
        }}
    ]
}}

CRITICAL: 
- If no existing categories match, use category_name (e.g., "Drinks", "Food", "Shots") and we'll create it
- Always include category_name and subcategory_name for display purposes
- For drinks/shots, use category_name: "Drinks" and subcategory_name: "Cocktails" or "Shots"

Generate the structured data now:
"""
    
    def _format_categories_for_prompt(self, categories: Dict[str, Category]) -> str:
        """Format categories for LLM prompt"""
        if not categories:
            return "No existing categories. All items will need new categories."
        
        formatted = []
        for cat_id, category in categories.items():
            cat_info = f"Category: {category.name} (ID: {cat_id})"
            if category.subcategories:
                subcats = []
                for subcat_id, subcat in category.subcategories.items():
                    subcats.append(f"  - {subcat.name} (ID: {subcat_id})")
                cat_info += "\n" + "\n".join(subcats)
            formatted.append(cat_info)
        
        return "\n".join(formatted)
    
    async def _call_llm_for_items(self, prompt: str) -> Dict[str, Any]:
        """Call LLM service to generate items"""
        try:
            # Use LLM service to generate structured response
            response = await self.llm_client.generate_message(
                prompt=prompt,
                lead_data={},
                channel_type="generic",
                agent_config={},
                dynamic_instructions="Return ONLY valid JSON. No markdown, no code blocks, just JSON.",
                model="openai/gpt-4o",
                user_input=None
            )
            
            response_text = response.get("response", "")
            
            # Extract JSON from response (handle markdown code blocks)
            if "```json" in response_text:
                start = response_text.find("```json") + 7
                end = response_text.find("```", start)
                response_text = response_text[start:end].strip()
            elif "```" in response_text:
                start = response_text.find("```") + 3
                end = response_text.find("```", start)
                response_text = response_text[start:end].strip()
            
            # Parse JSON
            try:
                return json.loads(response_text)
            except json.JSONDecodeError:
                # Try to find JSON object in text
                start = response_text.find("{")
                end = response_text.rfind("}") + 1
                if start >= 0 and end > start:
                    return json.loads(response_text[start:end])
                raise
            
        except Exception as e:
            logger.error(f"Error calling LLM for items: {e}")
            raise
    
    def _parse_llm_response(self, llm_data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse LLM response into structured data"""
        return {
            "items": llm_data.get("items", []),
            "suggested_categories": llm_data.get("suggested_categories", [])
        }
    
    async def _assign_to_category(
        self,
        business_id: str,
        item_data: Dict[str, Any],
        existing_categories: Dict[str, Category]
    ) -> Dict[str, str]:
        """Assign item to category (create if needed)"""
        category_id = item_data.get("category_id")
        category_name = item_data.get("category_name")
        subcategory_id = item_data.get("subcategory_id")
        subcategory_name = item_data.get("subcategory_name")
        
        # If category_id provided, verify it exists
        if category_id and category_id in existing_categories:
            category = existing_categories[category_id]
            
            # If subcategory_id provided, verify it exists
            if subcategory_id and subcategory_id in category.subcategories:
                return {
                    "category_id": category_id,
                    "subcategory_id": subcategory_id
                }
            elif subcategory_id or subcategory_name:
                # Subcategory doesn't exist, create it
                subcategory = await self.category_service.create_subcategory(
                    business_id,
                    category_id,
                    subcategory_name or "Default",
                    item_data.get("subcategory_description")
                )
                return {
                    "category_id": category_id,
                    "subcategory_id": subcategory.id
                }
            else:
                # No subcategory, use default
                return {
                    "category_id": category_id,
                    "subcategory_id": None
                }
        
        # Try to find category by name if ID doesn't exist
        if category_name:
            for cat_id, cat in existing_categories.items():
                if cat.name.lower() == category_name.lower():
                    # Found matching category, handle subcategory
                    if subcategory_name:
                        subcategory = await self.category_service.create_subcategory(
                            business_id,
                            cat_id,
                            subcategory_name,
                            item_data.get("subcategory_description")
                        )
                        return {
                            "category_id": cat_id,
                            "subcategory_id": subcategory.id
                        }
                    return {
                        "category_id": cat_id,
                        "subcategory_id": None
                    }
        
        # Category doesn't exist - create default "Drinks" category if item is a drink
        item_name_lower = item_data.get("name", "").lower()
        is_drink = any(keyword in item_name_lower for keyword in [
            "vodka", "rum", "tequila", "whiskey", "gin", "cocktail", "shot", 
            "beer", "wine", "champagne", "drink"
        ])
        
        if is_drink or not existing_categories:
            # Create default "Drinks" category
            default_category = await self.category_service.create_category(
                business_id,
                "Drinks",
                "Default drinks category"
            )
            existing_categories[default_category.id] = default_category
            
            # Create subcategory if specified
            if subcategory_name:
                subcategory = await self.category_service.create_subcategory(
                    business_id,
                    default_category.id,
                    subcategory_name,
                    item_data.get("subcategory_description")
                )
                return {
                    "category_id": default_category.id,
                    "subcategory_id": subcategory.id
                }
            
            return {
                "category_id": default_category.id,
                "subcategory_id": None
            }
        
        # Fallback - return None category (will be handled by frontend)
        return {
            "category_id": category_id or None,
            "subcategory_id": subcategory_id
        }
```

---

### Step 5: Create API Endpoints

**File:** `api_gateway/app/api/v1/endpoints/categories.py`

```python
"""
Category and Item management endpoints.
"""
import logging
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import (
    get_business_by_api_key,
    get_read_service_client,
    get_write_service_client
)
from shared.clients.read_data import ReadServiceClient
from shared.clients.write_data import WriteServiceClient
from shared.clients.llm.client import LLMServiceClient
from shared.database.schemas.category import (
    CategoryResponse,
    CategoryCreateRequest,
    SubcategoryCreateRequest,
    ItemCreateRequest,
    NaturalLanguageItemRequest,
    ItemGenerationResponse,
    Item,
    Category
)
from app.services.domains.business.category_service import CategoryService
from app.services.domains.business.image_resolver import ImageResolver
from app.services.domains.business.item_generation_service import CategorizedItemGenerationService

router = APIRouter()
logger = logging.getLogger(__name__)


def get_category_service(
    read_client: ReadServiceClient = Depends(get_read_service_client),
    write_client: WriteServiceClient = Depends(get_write_service_client)
) -> CategoryService:
    """Dependency to get category service"""
    return CategoryService(read_client, write_client)


def get_image_resolver() -> ImageResolver:
    """Dependency to get image resolver"""
    return ImageResolver()


def get_llm_client() -> LLMServiceClient:
    """Dependency to get LLM client"""
    return LLMServiceClient()


def get_item_generation_service(
    llm_client: LLMServiceClient = Depends(get_llm_client),
    image_resolver: ImageResolver = Depends(get_image_resolver),
    category_service: CategoryService = Depends(get_category_service)
) -> CategorizedItemGenerationService:
    """Dependency to get item generation service"""
    return CategorizedItemGenerationService(llm_client, image_resolver, category_service)


@router.get("/categories", response_model=CategoryResponse)
async def get_categories(
    current_business: Dict[str, Any] = Depends(get_business_by_api_key),
    category_service: CategoryService = Depends(get_category_service)
):
    """Get all categories for the current business"""
    try:
        business_id = current_business["id"]
        categories = await category_service.get_categories(business_id)
        config = await category_service.get_category_config(business_id)
        
        return CategoryResponse(
            categories=categories,
            config=config
        )
    except Exception as e:
        logger.error(f"Error getting categories: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get categories: {str(e)}"
        )


@router.post("/categories", status_code=status.HTTP_201_CREATED)
async def create_category(
    request: CategoryCreateRequest,
    current_business: Dict[str, Any] = Depends(get_business_by_api_key),
    category_service: CategoryService = Depends(get_category_service)
):
    """Create a new category"""
    try:
        business_id = current_business["id"]
        category = await category_service.create_category(
            business_id,
            request.name,
            request.description
        )
        return category.model_dump()
    except Exception as e:
        logger.error(f"Error creating category: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create category: {str(e)}"
        )


@router.post("/categories/{category_id}/subcategories", status_code=status.HTTP_201_CREATED)
async def create_subcategory(
    category_id: str,
    request: SubcategoryCreateRequest,
    current_business: Dict[str, Any] = Depends(get_business_by_api_key),
    category_service: CategoryService = Depends(get_category_service)
):
    """Create a new subcategory"""
    try:
        business_id = current_business["id"]
        subcategory = await category_service.create_subcategory(
            business_id,
            category_id,
            request.name,
            request.description
        )
        return subcategory.model_dump()
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error creating subcategory: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create subcategory: {str(e)}"
        )


@router.post("/categories/{category_id}/items", status_code=status.HTTP_201_CREATED)
async def create_item(
    category_id: str,
    request: ItemCreateRequest,
    current_business: Dict[str, Any] = Depends(get_business_by_api_key),
    category_service: CategoryService = Depends(get_category_service),
    image_resolver: ImageResolver = Depends(get_image_resolver)
):
    """Create a new item"""
    try:
        business_id = current_business["id"]
        
        # Resolve image if not provided
        if request.image:
            image_config = image_resolver.resolve_item_image({
                "image": request.image.model_dump()
            })
        else:
            # Default to custom image
            from shared.database.schemas.category import ItemImage, ImageType
            image_config = ItemImage(type=ImageType.CUSTOM, requires_upload=True)
        
        # Create item
        item = Item(
            name=request.name,
            description=request.description,
            price=request.price,
            category_id=category_id,
            subcategory_id=request.subcategory_id,
            image=image_config
        )
        
        # Add to category
        added_item = await category_service.add_item(
            business_id,
            category_id,
            item,
            request.subcategory_id
        )
        
        return added_item.model_dump()
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error creating item: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create item: {str(e)}"
        )


@router.post("/items/generate", response_model=ItemGenerationResponse)
async def generate_items_from_natural_language(
    request: NaturalLanguageItemRequest,
    current_business: Dict[str, Any] = Depends(get_business_by_api_key),
    item_service: CategorizedItemGenerationService = Depends(get_item_generation_service)
):
    """Generate categorized items from natural language input"""
    try:
        business_id = current_business["id"]
        result = await item_service.generate_items_from_natural_language(
            business_id,
            request.user_input
        )
        return result
    except Exception as e:
        logger.error(f"Error generating items: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate items: {str(e)}"
        )


@router.get("/items")
async def get_all_items(
    current_business: Dict[str, Any] = Depends(get_business_by_api_key),
    category_service: CategoryService = Depends(get_category_service)
):
    """Get all items across all categories"""
    try:
        business_id = current_business["id"]
        items = await category_service.get_all_items(business_id)
        return {"items": [item.model_dump() for item in items]}
    except Exception as e:
        logger.error(f"Error getting items: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get items: {str(e)}"
        )
```

**Update:** `api_gateway/app/api/v1/api.py`
```python
from .endpoints import (
    # ... existing imports ...
    categories  # Add this
)

# Add route:
api_router.include_router(categories.router, prefix="/businesses", tags=["Categories"])
```

---

## 🎨 Frontend Implementation

### Step 1: Add API Service

**File:** `src/utils/api.ts`

Add to the end (before `export { api }`):

```typescript
// Categories and Items API
export const categoriesApi = {
  // Get all categories
  getCategories: async () => {
    try {
      const response = await api.get('/businesses/categories');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching categories:', error.response?.data || error.message);
      throw error;
    }
  },

  // Create category
  createCategory: async (data: { name: string; description?: string }) => {
    try {
      const response = await api.post('/businesses/categories', data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating category:', error.response?.data || error.message);
      throw error;
    }
  },

  // Create subcategory
  createSubcategory: async (categoryId: string, data: { name: string; description?: string }) => {
    try {
      const response = await api.post(`/businesses/categories/${categoryId}/subcategories`, data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating subcategory:', error.response?.data || error.message);
      throw error;
    }
  },

  // Create item
  createItem: async (categoryId: string, data: {
    name: string;
    description?: string;
    price?: number;
    subcategory_id?: string;
    image?: any;
  }) => {
    try {
      const response = await api.post(`/businesses/categories/${categoryId}/items`, data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating item:', error.response?.data || error.message);
      throw error;
    }
  },

  // Generate items from natural language
  generateItems: async (userInput: string) => {
    try {
      const response = await api.post('/businesses/items/generate', { user_input: userInput });
      return response.data;
    } catch (error: any) {
      console.error('Error generating items:', error.response?.data || error.message);
      throw error;
    }
  },

  // Get all items
  getItems: async () => {
    try {
      const response = await api.get('/businesses/items');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching items:', error.response?.data || error.message);
      throw error;
    }
  }
};
```

---

### Step 2: Create CategoryTree Component

**File:** `src/components/categories/CategoryTree.tsx`

[See full file content - 200+ lines - copy from implementation above]

---

### Step 3: Create ItemForm Component

**File:** `src/components/categories/ItemForm.tsx`

[See full file content - 200+ lines - copy from implementation above]

---

### Step 4: Create NaturalLanguageItemGenerator Component

**File:** `src/components/categories/NaturalLanguageItemGenerator.tsx`

[See full file content - 200+ lines - copy from implementation above]

---

### Step 5: Create CategoriesPage

**File:** `src/pages/CategoriesPage.tsx`

[See full file content - 300+ lines - copy from implementation above]

---

### Step 6: Add Route

**File:** `src/App.tsx`

```typescript
import CategoriesPage from './pages/CategoriesPage';

// In routes:
<Route path="/categories" element={<MainLayout><CategoriesPage /></MainLayout>} />
```

---

## 📡 API Endpoints Summary

### Categories
- `GET /api/v1/businesses/categories` - Get all categories
- `POST /api/v1/businesses/categories` - Create category
- `POST /api/v1/businesses/categories/{id}/subcategories` - Create subcategory
- `POST /api/v1/businesses/categories/{id}/items` - Create item

### Items
- `POST /api/v1/businesses/items/generate` - Generate from natural language
- `GET /api/v1/businesses/items` - Get all items

---

## 🔑 Key Features

1. **Natural Language Processing**
   - Input: "Vodka soda $8, Rum and coke $7.50, Chicken wings $12"
   - Output: Structured items with categories, prices, images

2. **Smart Image Resolution**
   - Drinks/Shots → Auto-assign liquor images from library
   - Food/Other → Requires user upload

3. **Auto-Categorization**
   - Creates categories if they don't exist
   - Assigns items to appropriate categories/subcategories
   - Includes category names in response for display

4. **Hierarchical Structure**
   - Categories → Subcategories → Items
   - Stored in `Business.meta.category_config`

---

## ✅ Testing Checklist

- [ ] Create category via API
- [ ] Create subcategory via API
- [ ] Generate items from natural language
- [ ] Verify category names appear in response
- [ ] Verify image paths resolved for drinks
- [ ] Test frontend UI components
- [ ] Test category tree display
- [ ] Test item form with liquor selection

---

## 🚀 Next Steps

1. Add category templates (club default, restaurant, etc.)
2. Add image upload functionality for custom items
3. Add item editing/deletion
4. Add category editing/deletion
5. Add bulk operations
6. Add category analytics

---

**Note:** All files should be created in the correct project structure. Make sure to:
- Update imports to match your project structure
- Verify API endpoint paths match your routing
- Test each component individually before full integration

