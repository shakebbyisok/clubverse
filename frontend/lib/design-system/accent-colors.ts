/**
 * Accent Color Presets
 * 
 * To change the accent color:
 * 1. Choose a preset from below
 * 2. Update LA_PREVIA_BRAND.accent in tokens.ts
 * 3. Update --primary and --ring in globals.css
 * 
 * Format: HSL values for Tailwind CSS variables
 */

export const accentColorPresets = {
  // Purple (default)
  purple: {
    name: 'Purple',
    hex: '#8B5CF6',
    hsl: '262 83% 58%',
    description: 'Vibrant and energetic',
  },
  
  // Pink
  pink: {
    name: 'Pink',
    hex: '#EC4899',
    hsl: '330 81% 60%',
    description: 'Bold and playful',
  },
  
  // Blue
  blue: {
    name: 'Blue',
    hex: '#3B82F6',
    hsl: '217 91% 60%',
    description: 'Professional and trustworthy',
  },
  
  // Cyan
  cyan: {
    name: 'Cyan',
    hex: '#06B6D4',
    hsl: '189 94% 43%',
    description: 'Modern and fresh',
  },
  
  // Green
  green: {
    name: 'Green',
    hex: '#10B981',
    hsl: '158 64% 52%',
    description: 'Natural and calming',
  },
  
  // Orange
  orange: {
    name: 'Orange',
    hex: '#F97316',
    hsl: '25 95% 53%',
    description: 'Warm and inviting',
  },
  
  // Red
  red: {
    name: 'Red',
    hex: '#EF4444',
    hsl: '0 72% 51%',
    description: 'Bold and attention-grabbing',
  },
  
  // Indigo
  indigo: {
    name: 'Indigo',
    hex: '#6366F1',
    hsl: '239 84% 67%',
    description: 'Deep and sophisticated',
  },
  
  // Teal
  teal: {
    name: 'Teal',
    hex: '#14B8A6',
    hsl: '173 80% 40%',
    description: 'Balanced and elegant',
  },
  
  // Amber
  amber: {
    name: 'Amber',
    hex: '#F59E0B',
    hsl: '43 96% 56%',
    description: 'Warm and luxurious',
  },
} as const

export type AccentColorPreset = keyof typeof accentColorPresets

/**
 * Current accent color
 * Change this to switch the accent globally
 */
export const CURRENT_ACCENT: AccentColorPreset = 'purple'

/**
 * Get the current accent color configuration
 */
export function getCurrentAccentColor() {
  return accentColorPresets[CURRENT_ACCENT]
}

/**
 * Instructions for changing accent color:
 * 
 * 1. Update CURRENT_ACCENT above to your chosen preset
 * 2. Update lib/design-system/tokens.ts:
 *    - LA_PREVIA_BRAND.accent = accentColorPresets[CURRENT_ACCENT].hex
 * 
 * 3. Update app/globals.css:
 *    - :root { --primary: [HSL value]; --ring: [HSL value]; }
 *    - .dark { --primary: [HSL value]; --ring: [HSL value]; }
 * 
 * Example for blue:
 *    --primary: 217 91% 60%;
 *    --ring: 217 91% 60%;
 */

