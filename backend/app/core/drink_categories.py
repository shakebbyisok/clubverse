"""
Default drink categories.
Simple constants - no over-engineering.
"""

# Default categories available to all clubs
DEFAULT_CATEGORIES = [
    "cocktail",  # Liquor + soda (cubata)
    "shot",      # Pure liquor
    "beer",      # Beer/cider
    "soda",      # Non-alcoholic
]


def get_default_categories() -> list[str]:
    """Return list of default category names."""
    return DEFAULT_CATEGORIES.copy()

