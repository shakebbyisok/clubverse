'use client'

import { useMemo } from 'react'
import { useClubs } from '@/lib/queries/use-clubs'
import { useUserClubs } from '@/lib/queries/use-user-clubs'
import { useGeolocation } from '@/hooks/use-geolocation'
import { AlertCircle, MapPin, ChevronRight, Sparkles } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useRouter } from 'next/navigation'
import { ClubLogo } from '@/components/common/club-logo'
import { cn } from '@/lib/utils'
import { Club } from '@/types'
import Image from 'next/image'
import { ClubverseLoader } from '@/components/common/clubverse-loader'

// Calculate distance between two points using Haversine formula
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Format distance for display
function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`
  }
  return `${km.toFixed(1)}km`
}

interface ClubWithExtras extends Club {
  distance?: number
  points?: number
}

export default function ClubsPage() {
  const router = useRouter()
  const { data: clubs, isLoading: isLoadingClubs, error } = useClubs()
  const { data: userClubs } = useUserClubs()
  const { latitude, longitude } = useGeolocation()

  const userLocation = latitude && longitude ? { lat: latitude, lng: longitude } : null

  // Enrich clubs with distance and points, then sort by distance
  const enrichedClubs = useMemo((): ClubWithExtras[] => {
    if (!clubs) return []

    const enriched = clubs.map((club) => {
      // Calculate distance if we have user location and club coordinates
      let distance: number | undefined
      if (userLocation && club.latitude && club.longitude) {
        distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          Number(club.latitude),
          Number(club.longitude)
        )
      }

      // Get user's points for this club
      const userClub = userClubs?.find((uc) => uc.club_id === club.id)
      const points = userClub?.points ?? 0

      return {
        ...club,
        distance,
        points,
      }
    })

    // Sort by distance (closest first), then by name for clubs without distance
    return enriched.sort((a, b) => {
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance
      }
      if (a.distance !== undefined) return -1
      if (b.distance !== undefined) return 1
      return a.name.localeCompare(b.name)
    })
  }, [clubs, userClubs, userLocation])

  // Loading state
  if (isLoadingClubs) {
    return <ClubverseLoader fullScreen />
  }

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 pb-16 flex items-center justify-center bg-background p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error instanceof Error ? error.message : 'Failed to load clubs'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // No clubs
  if (!enrichedClubs || enrichedClubs.length === 0) {
    return (
      <div className="fixed inset-0 pb-16 flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-3">
          <MapPin className="h-8 w-8 text-muted-foreground/50 mx-auto" />
          <p className="text-sm text-muted-foreground">No venues available yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-16 bg-background">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image 
              src="/assets/whiteicon.svg"
              alt="Clubverse"
              width={20}
              height={20}
              className="opacity-70"
              unoptimized
            />
            <h1 className="text-2xl font-semibold tracking-tight">Venues</h1>
          </div>
          {userLocation && (
            <span className="text-[11px] text-white/30">
              by distance
            </span>
          )}
        </div>
      </div>

      {/* Clubs List */}
      <div className="px-4">
        <div className="divide-y divide-border/30">
          {enrichedClubs.map((club) => (
            <button
              key={club.id}
              onClick={() => router.push(`/clubs/${club.id}`)}
              className={cn(
                'w-full flex items-center gap-3.5 py-3.5 px-1',
                'text-left transition-colors',
                'hover:bg-accent/50 active:bg-accent/70',
                '-mx-1 rounded-lg'
              )}
            >
              {/* Club Logo */}
              <div className="flex-shrink-0">
                <div className="w-11 h-11 rounded-xl bg-card/80 flex items-center justify-center overflow-hidden border border-border/20">
                  <ClubLogo
                    logoUrl={club.logo_url}
                    logoSettings={club.logo_settings}
                    alt={club.name}
                    size={32}
                    containerClassName="w-8 h-8"
                  />
                </div>
              </div>

              {/* Club Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-medium text-foreground truncate leading-tight">
                    {club.name}
                  </h3>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {(club.city || club.formatted_address) && (
                    <span className="text-[12px] text-muted-foreground truncate">
                      {club.city || club.formatted_address}
                    </span>
                  )}
                </div>
              </div>

              {/* Right side: Distance & Points */}
              <div className="flex-shrink-0 flex items-center gap-3">
                {/* Points badge */}
                {club.points !== undefined && club.points > 0 && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10">
                    <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                    <span className="text-[11px] font-medium text-amber-500 tabular-nums">
                      {club.points}
                    </span>
                  </div>
                )}

                {/* Distance */}
                {club.distance !== undefined && (
                  <div className="flex items-center gap-1 text-muted-foreground/60">
                    <MapPin className="h-3 w-3" />
                    <span className="text-[11px] font-medium tabular-nums">
                      {formatDistance(club.distance)}
                    </span>
                  </div>
                )}

                {/* Chevron */}
                <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer count */}
      <div className="px-5 pt-6 pb-4">
        <p className="text-[11px] text-muted-foreground/40 text-center">
          {enrichedClubs.length} {enrichedClubs.length === 1 ? 'venue' : 'venues'}
        </p>
      </div>
    </div>
  )
}
