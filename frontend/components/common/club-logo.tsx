'use client'

import { Building2 } from 'lucide-react'
import { LogoSettings } from '@/types'
import { cn } from '@/lib/utils'

interface ClubLogoProps {
  logoUrl?: string | null
  logoSettings?: LogoSettings | null
  alt?: string
  className?: string
  size?: number // Size in pixels (default: 64)
  containerClassName?: string
}

export function ClubLogo({
  logoUrl,
  logoSettings,
  alt = 'Club logo',
  className,
  size = 64,
  containerClassName,
}: ClubLogoProps) {
  if (!logoUrl) {
    return (
      <div
        className={cn(
          'rounded-[var(--radius)] border border-border/40 flex items-center justify-center bg-muted/20',
          containerClassName
        )}
        style={{ width: size, height: size }}
      >
        <Building2 className="text-muted-foreground/50" style={{ width: size * 0.5, height: size * 0.5 }} />
      </div>
    )
  }

  // Settings are stored for 64x64 container, scale proportionally for different sizes
  const BASE_SIZE = 64
  const scale = size / BASE_SIZE

  // Calculate logo dimensions and position from settings
  // If no settings, center the logo
  const logoWidth = logoSettings?.width ? logoSettings.width * scale : size * 0.75
  const logoHeight = logoSettings?.height ? logoSettings.height * scale : size * 0.75
  const logoX = logoSettings?.x ? logoSettings.x * scale : (size - logoWidth) / 2
  const logoY = logoSettings?.y ? logoSettings.y * scale : (size - logoHeight) / 2

  return (
    <div
      className={cn(
        'rounded-[var(--radius)] border border-border/40 bg-background overflow-hidden relative',
        containerClassName
      )}
      style={{ width: size, height: size }}
    >
      <img
        src={logoUrl}
        alt={alt}
        className={cn('absolute object-contain', className)}
        style={{
          left: `${logoX}px`,
          top: `${logoY}px`,
          width: `${Math.min(logoWidth, size)}px`,
          height: `${Math.min(logoHeight, size)}px`,
        }}
      />
    </div>
  )
}

