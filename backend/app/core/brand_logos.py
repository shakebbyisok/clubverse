"""
Brand logo URL mappings.
Maps normalized brand names to their logo URLs.
Logos are organized by category in frontend/public/assets/logos/:
- liquors/ - All liquor brands
- beers/ - Beer brands
- sodas/ - Soda/soft drink brands
"""
BRAND_LOGOS = {
    # Vodkas (liquors folder)
    "eristoff": "/assets/logos/liquors/eristoff.png",
    "absolut": "/assets/logos/liquors/absolut.png",
    "belvedere": "/assets/logos/liquors/belvedere.png",
    
    # Gins (liquors folder)
    "beefeater": "/assets/logos/liquors/beefeater.png",
    "seagram's": "/assets/logos/liquors/seagrams.png",
    "seagrams": "/assets/logos/liquors/seagrams.png",
    "puerto de indias": "/assets/logos/liquors/puerto-de-indias.png",
    "puerto indias": "/assets/logos/liquors/puerto-de-indias.png",
    "bombay sapphire": "/assets/logos/liquors/bombay-sapphire.png",
    "hendrick's": "/assets/logos/liquors/hendricks.png",
    "hendricks": "/assets/logos/liquors/hendricks.png",
    
    # Rums (liquors folder)
    "cacique": "/assets/logos/liquors/cacique.png",
    "brugal": "/assets/logos/liquors/brugal.png",
    "barcelo": "/assets/logos/liquors/barcelo.png",
    "barceló": "/assets/logos/liquors/barcelo.png",
    "havana club": "/assets/logos/liquors/havana-club.png",
    "havanna club": "/assets/logos/liquors/havana-club.png",
    "havana club 7": "/assets/logos/liquors/havana-club.png",
    "havana 7": "/assets/logos/liquors/havana-club.png",
    "havanna7": "/assets/logos/liquors/havana-club.png",
    
    # Whisky (liquors folder)
    "ballantine's": "/assets/logos/liquors/ballantines.png",
    "ballantines": "/assets/logos/liquors/ballantines.png",
    "red label": "/assets/logos/liquors/red-label.png",
    "johnnie walker red label": "/assets/logos/liquors/red-label.png",
    "jack daniel's": "/assets/logos/liquors/jack-daniels.png",
    "jack daniels": "/assets/logos/liquors/jack-daniels.png",
    "jack daniel's manzana": "/assets/logos/liquors/jack-daniels.png",
    "black label": "/assets/logos/liquors/black-label.png",
    "johnnie walker black label": "/assets/logos/liquors/black-label.png",
    
    # Other Liquors (liquors folder)
    "jagermeister": "/assets/logos/liquors/jagermeister.png",
    "jagger": "/assets/logos/liquors/jagermeister.png",
    "fireball": "/assets/logos/liquors/fireball.png",
    "ratafia": "/assets/logos/liquors/ratafia.png",
    "ratafía": "/assets/logos/liquors/ratafia.png",
    "licor 43": "/assets/logos/liquors/licor-43.png",
    "licor43": "/assets/logos/liquors/licor-43.png",
    "malibu": "/assets/logos/liquors/malibu.png",
    
    # Beers (beers folder)
    "estrella": "/assets/logos/beers/estrella.png",
    "estrella damm": "/assets/logos/beers/estrella.png",
    
    # Sodas (sodas folder)
    "7up": "/assets/logos/sodas/7up.png",
    "7-up": "/assets/logos/sodas/7up.png",
    "seven up": "/assets/logos/sodas/7up.png",
    "fanta": "/assets/logos/sodas/fanta.png",
    "pepsi": "/assets/logos/sodas/pepsi.png",
    "red bull": "/assets/logos/sodas/redbull.png",
    "redbull": "/assets/logos/sodas/redbull.png",
    "schweppes": "/assets/logos/sodas/schweppess.png",
    "schwepp's": "/assets/logos/sodas/schweppess.png",
}


def get_logo_url(brand_name: str) -> str | None:
    """
    Get logo URL for a normalized brand name.
    
    Args:
        brand_name: Brand name (will be normalized to lowercase)
        
    Returns:
        Logo URL string or None if not found
    """
    if not brand_name:
        return None
    
    normalized = brand_name.lower().strip()
    return BRAND_LOGOS.get(normalized)

