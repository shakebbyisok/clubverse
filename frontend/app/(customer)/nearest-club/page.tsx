'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useClubs } from '@/lib/queries/use-clubs'
import { useGeolocation } from '@/hooks/use-geolocation'
import { useMyOrders } from '@/lib/queries/use-orders'
import { PartnerClubCard } from '@/components/common/partner-club-card'
import { StaticMapBackground } from '@/components/map/static-map-background'
import { Loader2, AlertCircle, MapPin, Wine } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Club } from '@/types'

export default function NearestClubPage() {
  const router = useRouter()
  const { data: clubs, isLoading, error } = useClubs()
  const { latitude, longitude, error: geoError } = useGeolocation()
  const { data: orders } = useMyOrders(0, 1) // Get most recent order

  const userLocation = latitude && longitude ? { lat: latitude, lng: longitude } : null

  // Calculate nearest club or fallback to last ordered club
  const nearestClub = useMemo((): { club: Club; distance: number } | null => {
    if (!clubs || clubs.length === 0) return null

    // Try to find nearest club by location
    if (userLocation) {
      const clubsWithDistance = clubs
        .map((club) => {
          if (!club.latitude || !club.longitude) return null

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
          const distance = R * c

          return { club, distance }
        })
        .filter((item): item is { club: Club; distance: number } => item !== null)
        .sort((a, b) => a.distance - b.distance)

      if (clubsWithDistance.length > 0) {
        return clubsWithDistance[0]
      }
    }

    // Fallback: Use last ordered club
    if (orders && orders.length > 0 && orders[0].club_id) {
      const lastOrderClub = clubs.find((c) => c.id === orders[0].club_id)
      if (lastOrderClub) {
        return { club: lastOrderClub, distance: 0 }
      }
    }

    // Final fallback: First club
    return { club: clubs[0], distance: 0 }
  }, [clubs, userLocation, orders])

  const handleOrder = () => {
    if (nearestClub) {
      router.push(`/clubs/${nearestClub.club.id}`)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 pb-16 flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Finding nearest club...</p>
        </div>
      </div>
    )
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
  if (!clubs || clubs.length === 0) {
    return (
      <div className="fixed inset-0 pb-16 flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-md">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-lg font-semibold">No clubs available</h2>
          <p className="text-sm text-muted-foreground">
            Check back soon for new venues
          </p>
        </div>
      </div>
    )
  }

  // No nearest club (shouldn't happen, but handle it)
  if (!nearestClub) {
    return (
      <div className="fixed inset-0 pb-16 flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-md">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-lg font-semibold">Unable to find nearby clubs</h2>
          <p className="text-sm text-muted-foreground">
            Please enable location services or try again later
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 pb-16 bg-background">
      {/* Static Map Background */}
      {nearestClub.club.latitude && nearestClub.club.longitude && (
        <div className="absolute inset-0">
          <StaticMapBackground club={nearestClub.club} className="w-full h-full" />
        </div>
      )}

      {/* Content Overlay */}
      <div className="relative z-10 min-h-full flex items-center justify-center">
        <div className="w-full max-w-sm px-4">
          {/* Geolocation error banner */}
          {geoError && (
            <Alert className="bg-card/95 backdrop-blur-sm border-border/40 mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Location access denied. Showing last ordered club.
              </AlertDescription>
            </Alert>
          )}

          {/* Partner Club Card */}
          <div className="mb-8">
            <PartnerClubCard
              club={nearestClub.club}
              distance={nearestClub.distance}
            />
          </div>

          {/* Order Button - Centered */}
          <div className="flex justify-center">
            <button
              onClick={handleOrder}
              className="flex items-center gap-3 px-10 py-4 rounded-2xl bg-foreground text-background border-2 border-background/20 transition-all active:scale-95 shadow-lg hover:border-background/30"
            >
              <Wine className="h-5 w-5" />
              <span className="text-[17px] font-light tracking-[0.1em] uppercase">Order</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

