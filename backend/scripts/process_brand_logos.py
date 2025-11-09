"""
Script to process brand logo images through remove.bg API to remove backgrounds.
Run this once to process all images and get transparent versions.

Usage:
    python scripts/process_brand_logos.py

Requirements:
    - REMOVEBG_API_KEY in .env
    - httpx installed: pip install httpx
"""
import os
import sys
import asyncio
import httpx
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.config import settings

REMOVEBG_API_URL = "https://api.remove.bg/v1.0/removebg"
REMOVEBG_API_KEY = os.getenv("REMOVEBG_API_KEY") or settings.REMOVEBG_API_KEY if hasattr(settings, 'REMOVEBG_API_KEY') else None

# All brand logo URLs to process
BRAND_LOGOS_TO_PROCESS = {
    # Vodkas
    "eristoff": "https://vinosonline.es/9650-thickbox_default/eristoff-vodka-70-cl.jpg",
    "absolut": "https://telebotella.es/wp-content/uploads/2015/04/absolut.webp",
    "belvedere": "https://www.campoluzenoteca.com/4060-large_default/belvedere-175l.jpg",
    
    # Gins
    "beefeater": "https://vinosonline.es/8531-large_default/beefeater-70-cl.jpg",
    "seagram's": "https://www.campoluzenoteca.com/11507-large_default/seagrams.jpg",
    "seagrams": "https://www.campoluzenoteca.com/11507-large_default/seagrams.jpg",
    "puerto de indias": "https://www.1898drinksboutique.com/wp-content/uploads/011162.png?v=1744841824",
    "puerto indias": "https://www.1898drinksboutique.com/wp-content/uploads/011162.png?v=1744841824",
    "bombay sapphire": "https://cestashop.com/3723-product_zoom/ginebra-bombay-sapphire.jpg",
    "hendrick's": "https://www.topdrinks.es/pub/media/catalog/product/g/i/gin-hendricks-44-r2-3771_3.jpg",
    "hendricks": "https://www.topdrinks.es/pub/media/catalog/product/g/i/gin-hendricks-44-r2-3771_3.jpg",
    
    # Rums
    "cacique": "https://vinosonline.es/10115-large_default/cacique-anejo-70-cl.jpg",
    "brugal": "https://www.topdrinks.es/pub/media/catalog/product/b/r/brugal_a_ejo.jpg",
    "barcelo": "https://vinosonline.es/10116-thickbox_default/barcelo-anejo-70-cl.jpg",
    "barceló": "https://vinosonline.es/10116-thickbox_default/barcelo-anejo-70-cl.jpg",
    "havana club": "https://sgfm.elcorteingles.es/SGFM/dctm/MEDIA03/202404/25/00118721300343____7__600x600.jpg",
    "havanna club": "https://sgfm.elcorteingles.es/SGFM/dctm/MEDIA03/202404/25/00118721300343____7__600x600.jpg",
    "havana 7": "https://sgfm.elcorteingles.es/SGFM/dctm/MEDIA03/202404/25/00118721300343____7__600x600.jpg",
    "havanna7": "https://sgfm.elcorteingles.es/SGFM/dctm/MEDIA03/202404/25/00118721300343____7__600x600.jpg",
    
    # Whisky
    "ballantine's": "https://static.carrefour.es/hd_510x_/img_pim_food/000312_00_1.jpg",
    "ballantines": "https://static.carrefour.es/hd_510x_/img_pim_food/000312_00_1.jpg",
    "red label": "https://static.carrefour.es/hd_510x_/img_pim_food/000303_00_1.jpg",
    "jack daniel's": "https://www.topdrinks.es/media/catalog/product/w/h/whisky-jack-daniels-40-i-estuche1-1654_2.jpg",
    "jack daniels": "https://www.topdrinks.es/media/catalog/product/w/h/whisky-jack-daniels-40-i-estuche1-1654_2.jpg",
    "black label": "https://sgfm.elcorteingles.es/SGFM/dctm/MEDIA03/202011/09/00118720400730____7__600x600.jpg",
    
    # Others
    "jagermeister": "https://monlacata.es/wp-content/uploads/2017/03/jagermeister-70cl.jpg.png",
    "jagger": "https://monlacata.es/wp-content/uploads/2017/03/jagermeister-70cl.jpg.png",
    "fireball": "https://www.campoluzenoteca.com/15908-large_default/fireball-bourbon-70cl.jpg",
    "ratafia": "https://m.media-amazon.com/images/I/71D-DMyHZwL.jpg",
    "ratafía": "https://m.media-amazon.com/images/I/71D-DMyHZwL.jpg",
    "licor 43": "https://bottegaalcolica.com/12020-thickbox_default/liquore-licor-43.jpg",
    "licor43": "https://bottegaalcolica.com/12020-thickbox_default/liquore-licor-43.jpg",
    "malibu": "https://www.1898drinksboutique.com/wp-content/uploads/157004.png",
}


async def process_image(brand_name: str, image_url: str, output_dir: Path) -> str | None:
    """
    Process a single image through remove.bg API.
    
    Args:
        brand_name: Brand name (for filename)
        image_url: URL of the image to process
        output_dir: Directory to save processed images
        
    Returns:
        Path to saved image or None if failed
    """
    if not REMOVEBG_API_KEY:
        print(f"ERROR: REMOVEBG_API_KEY not configured")
        return None
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            print(f"Processing {brand_name}...")
            
            # Call remove.bg API with image URL
            response = await client.post(
                REMOVEBG_API_URL,
                headers={"X-Api-Key": REMOVEBG_API_KEY},
                data={
                    "image_url": image_url,
                    "size": "auto",  # Auto-detect size
                    "format": "png",  # PNG for transparency
                }
            )
            
            if response.status_code == 200:
                # Save the processed image
                safe_filename = brand_name.lower().replace(" ", "-").replace("'", "").replace("ó", "o")
                output_path = output_dir / f"{safe_filename}.png"
                
                with open(output_path, "wb") as f:
                    f.write(response.content)
                
                print(f"  ✓ Saved to {output_path}")
                return str(output_path)
            else:
                print(f"  ✗ Error {response.status_code}: {response.text[:200]}")
                return None
                
    except Exception as e:
        print(f"  ✗ Exception: {str(e)}")
        return None


async def main():
    """Process all brand logos through remove.bg."""
    if not REMOVEBG_API_KEY:
        print("ERROR: REMOVEBG_API_KEY not found in environment variables")
        print("Please add REMOVEBG_API_KEY to your .env file")
        return
    
    # Create output directory
    output_dir = Path(__file__).parent.parent / "processed_logos"
    output_dir.mkdir(exist_ok=True)
    
    print(f"Processing {len(BRAND_LOGOS_TO_PROCESS)} brand logos...")
    print(f"Output directory: {output_dir}\n")
    
    # Process unique URLs only (some brands share the same image)
    unique_urls = {}
    for brand_name, url in BRAND_LOGOS_TO_PROCESS.items():
        if url not in unique_urls:
            unique_urls[url] = brand_name
    
    print(f"Found {len(unique_urls)} unique images to process\n")
    
    # Process all images
    results = {}
    for url, brand_name in unique_urls.items():
        result_path = await process_image(brand_name, url, output_dir)
        if result_path:
            results[url] = result_path
        # Small delay to avoid rate limits
        await asyncio.sleep(0.5)
    
    print(f"\n✓ Processed {len(results)}/{len(unique_urls)} images successfully")
    
    # Generate updated brand_logos.py content
    print("\nGenerating updated brand_logos.py mapping...")
    print("\n# Updated BRAND_LOGOS mapping with processed images:")
    print("# NOTE: You'll need to upload these images to a CDN/storage and update URLs")
    print("BRAND_LOGOS = {")
    
    for brand_name, original_url in BRAND_LOGOS_TO_PROCESS.items():
        # Find the processed image for this URL
        processed_path = results.get(original_url)
        if processed_path:
            # For now, we'll use a placeholder - you'll need to upload to storage
            print(f'    "{brand_name}": "UPLOAD_TO_STORAGE_AND_UPDATE_URL",  # Processed: {processed_path}')
        else:
            # Fallback to original URL if processing failed
            print(f'    "{brand_name}": "{original_url}",  # Processing failed, using original')
    
    print("}")
    print("\nNext steps:")
    print("1. Upload processed images from 'processed_logos/' to your storage/CDN")
    print("2. Update the URLs in brand_logos.py with the new CDN URLs")
    print("3. Test the logo display in the UI")


if __name__ == "__main__":
    asyncio.run(main())

