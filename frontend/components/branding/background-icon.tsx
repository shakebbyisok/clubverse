'use client'

import { useTheme } from '@/lib/design-system/theme-provider'

export function BackgroundIcon({ className = '' }: { className?: string }) {
  const { actualTheme } = useTheme()

  return (
    <img 
      src={actualTheme === 'dark' ? '/assets/previa/whiteprevia.svg' : '/assets/previa/blackprevia.svg'}
      alt="" 
      className={className}
    />
  )
}


