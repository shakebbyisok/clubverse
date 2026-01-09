/**
 * Utility functions for handling drink image paths.
 * Migrates old paths to new folder structure.
 */

// Backend URL for uploaded images
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

/**
 * Resolves image URLs to their full path.
 * - Backend uploads (/uploads/...) -> prepends backend URL
 * - Local assets (/assets/...) -> returns as-is
 * - External URLs (http/https) -> returns as-is
 * - Base64 data URLs -> returns as-is
 */
export function resolveImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null
  
  // Base64 data URLs - return as-is
  if (imageUrl.startsWith('data:')) {
    return imageUrl
  }
  
  // External URLs - return as-is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }
  
  // Backend uploads - prepend backend URL
  if (imageUrl.startsWith('/uploads/')) {
    return `${BACKEND_URL}${imageUrl}`
  }
  
  // Local assets or other relative paths - return as-is (Next.js will handle)
  return imageUrl
}

/**
 * Maps old logo filenames to their new category folders
 */
const LOGO_CATEGORY_MAP: Record<string, 'liquors' | 'beers' | 'sodas'> = {
  // Vodkas
  'eristoff.png': 'liquors',
  'absolut.png': 'liquors',
  'belvedere.png': 'liquors',
  
  // Gins
  'beefeater.png': 'liquors',
  'seagrams.png': 'liquors',
  'puerto-de-indias.png': 'liquors',
  'bombay-sapphire.png': 'liquors',
  'hendricks.png': 'liquors',
  
  // Rums
  'cacique.png': 'liquors',
  'brugal.png': 'liquors',
  'barcelo.png': 'liquors',
  'havana-club.png': 'liquors',
  
  // Whisky
  'ballantines.png': 'liquors',
  'red-label.png': 'liquors',
  'jack-daniels.png': 'liquors',
  'black-label.png': 'liquors',
  
  // Other Liquors
  'jagermeister.png': 'liquors',
  'fireball.png': 'liquors',
  'ratafia.png': 'liquors',
  'licor-43.png': 'liquors',
  'malibu.png': 'liquors',
  
  // Beers
  'estrella.png': 'beers',
  
  // Sodas
  '7up.png': 'sodas',
  'fanta.png': 'sodas',
  'pepsi.png': 'sodas',
  'redbull.png': 'sodas',
  'schweppes.png': 'sodas',
  'schweppess.png': 'sodas',
}

/**
 * Migrates old image paths to new folder structure.
 * Handles paths like:
 * - /assets/logos/absolut.png -> /assets/logos/liquors/absolut.png
 * - /assets/logos/estrella.png -> /assets/logos/beers/estrella.png
 */
export function migrateImagePath(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null
  
  // If already in new format (has category folder), return as-is
  if (imageUrl.includes('/liquors/') || imageUrl.includes('/beers/') || imageUrl.includes('/sodas/')) {
    return imageUrl
  }
  
  // Check if it's an old logo path
  if (imageUrl.startsWith('/assets/logos/')) {
    const filename = imageUrl.replace('/assets/logos/', '')
    const category = LOGO_CATEGORY_MAP[filename]
    
    if (category) {
      return `/assets/logos/${category}/${filename}`
    }
    
    // If not in map but is a logo path, assume liquors (backward compatibility)
    if (filename.endsWith('.png')) {
      return `/assets/logos/liquors/${filename}`
    }
  }
  
  // Return as-is if not a logo path or can't be migrated
  return imageUrl
}

