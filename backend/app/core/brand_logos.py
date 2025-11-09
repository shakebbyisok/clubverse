"""
Brand logo URL mappings.
Maps normalized brand names to their logo URLs.
All logos are stored in frontend/public/assets/logos/ as transparent PNGs.
"""
BRAND_LOGOS = {
    # Vodkas
    "eristoff": "/assets/logos/eristoff.png",
    "absolut": "/assets/logos/absolut.png",
    "belvedere": "/assets/logos/belvedere.png",
    
    # Gins
    "beefeater": "/assets/logos/beefeater.png",
    "seagram's": "/assets/logos/seagrams.png",
    "seagrams": "/assets/logos/seagrams.png",
    "puerto de indias": "/assets/logos/puerto-de-indias.png",
    "puerto indias": "/assets/logos/puerto-de-indias.png",
    "bombay sapphire": "/assets/logos/bombay-sapphire.png",
    "hendrick's": "/assets/logos/hendricks.png",
    "hendricks": "/assets/logos/hendricks.png",
    
    # Rums
    "cacique": "/assets/logos/cacique.png",
    "brugal": "/assets/logos/brugal.png",
    "barcelo": "/assets/logos/barcelo.png",
    "barceló": "/assets/logos/barcelo.png",
    "havana club": "/assets/logos/havana-club.png",
    "havanna club": "/assets/logos/havana-club.png",
    "havana club 7": "/assets/logos/havana-club.png",
    "havana 7": "/assets/logos/havana-club.png",
    "havanna7": "/assets/logos/havana-club.png",
    
    # Whisky
    "ballantine's": "/assets/logos/ballantines.png",
    "ballantines": "/assets/logos/ballantines.png",
    "red label": "/assets/logos/red-label.png",
    "johnnie walker red label": "/assets/logos/red-label.png",
    "jack daniel's": "/assets/logos/jack-daniels.png",
    "jack daniels": "/assets/logos/jack-daniels.png",
    "jack daniel's manzana": "/assets/logos/jack-daniels.png",
    "black label": "/assets/logos/black-label.png",
    "johnnie walker black label": "/assets/logos/black-label.png",
    
    # Others
    "jagermeister": "/assets/logos/jagermeister.png",
    "jagger": "/assets/logos/jagermeister.png",
    "fireball": "/assets/logos/fireball.png",
    "ratafia": "/assets/logos/ratafia.png",
    "ratafía": "/assets/logos/ratafia.png",
    "licor 43": "/assets/logos/licor-43.png",
    "licor43": "/assets/logos/licor-43.png",
    "malibu": "/assets/logos/malibu.png",
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

