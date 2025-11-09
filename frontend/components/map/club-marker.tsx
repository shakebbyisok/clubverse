'use client'

import { useMemo, useRef, useEffect } from 'react'
import { Marker } from '@vis.gl/react-google-maps'
import { Club } from '@/types'
import { ClubLogo } from '@/components/common/club-logo'
import { cn } from '@/lib/utils'
import { createRoot } from 'react-dom/client'

interface ClubMarkerProps {
  club: Club
  position: { lat: number; lng: number }
  isSelected: boolean
  onClick: () => void
}

export function ClubMarker({ club, position, isSelected, onClick }: ClubMarkerProps) {
  // Create custom HTML marker content
  const markerContent = useMemo(() => {
    if (typeof document === 'undefined') return null

    const container = document.createElement('div')
    container.className = 'club-marker-container'
    
    // Render React component into the container
    const root = createRoot(container)
    root.render(
      <div
        className={cn(
          'flex flex-col items-center gap-1 transition-all duration-200',
          'cursor-pointer group',
          isSelected && 'scale-110'
        )}
        onClick={onClick}
      >
        {/* Club Logo - Rectangular, Elegant */}
        <div
          className={cn(
            'relative',
            isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background rounded-[var(--radius)]'
          )}
        >
          <ClubLogo
            logoUrl={club.logo_url}
            logoSettings={club.logo_settings}
            alt={club.name}
            size={isSelected ? 56 : 48}
            containerClassName={cn(
              'shadow-lg transition-all',
              'group-hover:shadow-xl group-hover:scale-105',
              isSelected && 'shadow-2xl'
            )}
          />
          
          {/* Pulse animation when selected */}
          {isSelected && (
            <div className="absolute inset-0 rounded-[var(--radius)] bg-primary/20 animate-ping" />
          )}
        </div>

        {/* Club Name - Compact */}
        <div
          className={cn(
            'bg-card/95 backdrop-blur-sm border border-border/40 rounded-md px-2 py-1',
            'shadow-lg max-w-[120px]',
            'transition-all duration-200',
            isSelected && 'bg-primary/10 border-primary/40'
          )}
        >
          <p className="text-[11px] font-medium text-foreground truncate text-center">
            {club.name}
          </p>
        </div>
      </div>
    )

    return container
  }, [club, isSelected, onClick])

  // Use overlay to render custom HTML on map
  return (
    <Marker
      position={position}
      onClick={onClick}
      zIndex={isSelected ? 1000 : 100}
    >
      {markerContent}
    </Marker>
  )
}

