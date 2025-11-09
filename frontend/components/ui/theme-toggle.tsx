'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/lib/design-system/theme-provider'
import { Button } from './button'

export function ThemeToggle() {
  const { theme, setTheme, actualTheme } = useTheme()

  const toggleTheme = () => {
    if (actualTheme === 'dark') {
      setTheme('light')
    } else {
      setTheme('dark')
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-9 w-9"
      aria-label="Toggle theme"
    >
      {actualTheme === 'dark' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  )
}

