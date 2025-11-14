'use client'

import { Club } from '@/types'
import { Button } from '@/components/ui/button'
import { ClubLogo } from '@/components/common/club-logo'
import { X, MapPin, Navigation, Route } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMemo } from 'react'

interface ClubInfoBadgeProps {
  club: Club
  userLocation: { lat: number; lng: number } | null
  onClose: () => void
  onViewMenu: (clubId: string) => void
  onShowDirections?: (club: Club) => void
  className?: string
}

export function ClubInfoBadge({
  club,
  userLocation,
  onClose,
  onViewMenu,
  onShowDirections,
  className,
}: ClubInfoBadgeProps) {
  // Calculate distance if we have user location
  const distance = useMemo(() => {
    if (!userLocation || !club.latitude || !club.longitude) return null

    const R = 6371 // Earth's radius in km
    const dLat = ((Number(club.latitude) - userLocation.lat) * Math.PI) / 180
    const dLon = ((Number(club.longitude) - userLocation.lng) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((userLocation.lat * Math.PI) / 180) *
        Math.cos((Number(club.latitude) * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distanceKm = R * c

    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)}m`
    }
    return `${distanceKm.toFixed(1)}km`
  }, [club, userLocation])

  return (
    <div
      className={cn(
        'bg-card/95 backdrop-blur-xl border border-border/40 rounded-lg shadow-2xl',
        'p-3 min-w-[280px] max-w-[320px]',
        'animate-in fade-in slide-in-from-top-2 duration-200',
        className
      )}
    >
      {/* Header with Logo */}
      <div className="flex items-start gap-3 mb-3">
        {/* Club Logo */}
        <ClubLogo
          logoUrl={club.logo_url}
          logoSettings={club.logo_settings}
          alt={club.name}
          size={48}
          containerClassName="flex-shrink-0"
        />
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base mb-0.5 truncate">{club.name}</h3>
          {club.city && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span>{club.city}</span>
              {distance && (
                <>
                  <span className="text-muted-foreground/50">•</span>
                  <Navigation className="h-3 w-3 flex-shrink-0" />
                  <span>{distance}</span>
                </>
              )}
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-6 w-6 flex-shrink-0 -mt-0.5 -mr-0.5"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {userLocation && onShowDirections && (
          <Button
            onClick={() => onShowDirections(club)}
            variant="outline"
            className="flex-1 h-8 text-xs"
            size="sm"
          >
            <Route className="h-3.5 w-3.5 mr-1.5" />
            How to Arrive
          </Button>
        )}
        <Button
          onClick={() => onViewMenu(club.id)}
          className="flex-1 h-8"
          size="sm"
        >
          View Menu
        </Button>
      </div>
    </div>
  )
}

