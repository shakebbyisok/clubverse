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
          'rounded-lg border border-border/40 flex items-center justify-center bg-muted/20',
          containerClassName
        )}
        style={{ width: size, height: size }}
      >
        <Building2 className="text-muted-foreground/50" style={{ width: size * 0.5, height: size * 0.5 }} />
      </div>
    )
  }

  // Simple display - just show the logo with rounded corners, no positioning magic
  // If logoSettings exist and have custom positioning, use them; otherwise just center-fill
  const hasCustomSettings = logoSettings?.width && logoSettings?.height

  if (hasCustomSettings) {
    // Settings are stored for 64x64 container, scale proportionally for different sizes
    const BASE_SIZE = 64
    const scale = size / BASE_SIZE

    const logoWidth = logoSettings.width! * scale
    const logoHeight = logoSettings.height! * scale
    const logoX = logoSettings.x ? logoSettings.x * scale : (size - logoWidth) / 2
    const logoY = logoSettings.y ? logoSettings.y * scale : (size - logoHeight) / 2

    return (
      <div
        className={cn(
          'rounded-lg overflow-hidden relative flex-shrink-0',
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

  // Default: simple rounded image that fills the container
  return (
    <img
      src={logoUrl}
      alt={alt}
      className={cn(
        'rounded-lg object-cover flex-shrink-0',
        containerClassName,
        className
      )}
      style={{ width: size, height: size }}
    />
  )
}

