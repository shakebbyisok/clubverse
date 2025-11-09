'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { designTokens } from './tokens'
import { hexToHSL } from '../utils/color-utils'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  actualTheme: 'light' | 'dark'  // Resolved theme (system → light/dark)
  setTheme: (theme: Theme) => void
  tokens: typeof designTokens
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({
  children,
  defaultTheme = 'dark',  // Dark by default
}: {
  children: ReactNode
  defaultTheme?: Theme
}) {
  const [theme, setTheme] = useState<Theme>(defaultTheme)
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('dark')

  // Resolve system theme
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const resolveTheme = () => {
      if (theme === 'system') {
        return mediaQuery.matches ? 'dark' : 'light'
      }
      return theme as 'light' | 'dark'
    }

    setActualTheme(resolveTheme())

    const handler = () => {
      if (theme === 'system') {
        setActualTheme(mediaQuery.matches ? 'dark' : 'light')
      }
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [theme])

  // Apply theme to DOM
  useEffect(() => {
    const root = window.document.documentElement
    
    root.classList.remove('light', 'dark')
    root.classList.add(actualTheme)
  }, [actualTheme])

  // Load theme from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('clubverse-theme') as Theme | null
    if (stored) {
      setTheme(stored)
    } else {
      // Set default to dark
      setTheme('dark')
      localStorage.setItem('clubverse-theme', 'dark')
    }
  }, [])

  // Save theme to localStorage
  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme)
    localStorage.setItem('clubverse-theme', newTheme)
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        actualTheme,
        setTheme: handleSetTheme,
        tokens: designTokens,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

