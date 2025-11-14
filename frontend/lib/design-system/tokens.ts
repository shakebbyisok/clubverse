/**
 * La Previa Design Tokens
 * Single source of truth for colors, typography, spacing, etc.
 */

// La Previa brand colors (nightlife theme - vibrant, energetic)
export const CLUBVERSE_BRAND = {
  purple: '#8B5CF6',  // Vibrant purple (nightlife energy)
  pink: '#EC4899',    // Hot pink (party vibe)
  cyan: '#06B6D4',    // Electric cyan (neon lights)
  
  // Accent color - theme-aware (black for light, white for dark)
  accent: {
    light: '#000000',  // Black for light theme
    dark: '#FFFFFF',   // White for dark theme
  },
  
  gradient: {
    start: '#8B5CF6',  // Purple
    end: '#EC4899',    // Pink
  },
} as const

export const designTokens = {
  // Brand colors
  colors: {
    brand: {
      purple: CLUBVERSE_BRAND.purple,
      pink: CLUBVERSE_BRAND.pink,
      cyan: CLUBVERSE_BRAND.cyan,
      gradient: `linear-gradient(135deg, ${CLUBVERSE_BRAND.gradient.start} 0%, ${CLUBVERSE_BRAND.gradient.end} 100%)`,
    },
    
    // Semantic colors
    semantic: {
      success: '#10B981',  // Order completed
      warning: '#F59E0B',  // Order preparing
      error: '#EF4444',    // Order cancelled
      info: '#3B82F6',     // Order pending
    },
    
    // Light theme
    light: {
      background: '#FFFFFF',
      foreground: '#0F172A',
      card: '#FFFFFF',
      cardForeground: '#0F172A',
      muted: '#F8FAFC',
      mutedForeground: '#64748B',
      border: '#E2E8F0',
      input: '#F1F5F9',
      ring: CLUBVERSE_BRAND.accent.light, // Black for light theme
    },
    
    // Dark theme (perfect for nightlife!)
    dark: {
      background: '#0A0A0A',      // Deep black
      foreground: '#F8FAFC',
      card: '#1A1A1A',            // Dark card
      cardForeground: '#F8FAFC',
      muted: '#1A1A1A',
      mutedForeground: '#94A3B8',
      border: '#2A2A2A',
      input: '#1A1A1A',
      ring: CLUBVERSE_BRAND.accent.dark, // White for dark theme
    },
  },

  // Typography
  typography: {
    fontFamily: {
      sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
    },
    
    fontSize: {
      xs: '0.75rem',     // 12px
      sm: '0.875rem',    // 14px
      base: '1rem',      // 16px
      lg: '1.125rem',    // 18px
      xl: '1.25rem',     // 20px
      '2xl': '1.5rem',   // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem',  // 36px
      '5xl': '3rem',     // 48px
    },
    
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },

  // Spacing scale (8px base)
  spacing: {
    0: '0',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
  },

  // Border radius
  radius: {
    none: '0',
    sm: '0.375rem',   // 6px
    md: '0.5rem',     // 8px
    lg: '0.75rem',    // 12px
    xl: '1rem',       // 16px
    '2xl': '1.5rem',  // 24px
    full: '9999px',
  },
} as const

export type DesignTokens = typeof designTokens

