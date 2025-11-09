'use client'

import { useClubs } from '@/lib/queries/use-clubs'
import { useGeolocation } from '@/hooks/use-geolocation'
import { ElegantList, ElegantListItem } from '@/components/common/elegant-list'
import { ClubLogo } from '@/components/common/club-logo'
import { MapPin, AlertCircle, Loader2, Navigation } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'

export default function ClubsPage() {
  const router = useRouter()
  const { data: clubs, isLoading, error } = useClubs()
  const { latitude, longitude } = useGeolocation()

  const userLocation = latitude && longitude ? { lat: latitude, lng: longitude } : null

  // Calculate distance and format for elegant list
  const clubListItems = useMemo((): ElegantListItem[] => {
    if (!clubs) return []

    const clubsWithDistance = clubs.map((club) => {
      let distance: number | null = null
      
      if (userLocation && club.latitude && club.longitude) {
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
        distance = R * c
      }

      return { club, distance }
    }).sort((a, b) => {
      if (!a.distance) return 1
      if (!b.distance) return -1
      return a.distance - b.distance
    })

    return clubsWithDistance.map(({ club, distance }) => {
      const distanceText = distance
        ? distance < 1
          ? `${Math.round(distance * 1000)}m away`
          : `${distance.toFixed(1)}km away`
        : undefined

      return {
        id: club.id,
        title: club.name,
        subtitle: club.city || club.formatted_address || undefined,
        description: distanceText,
        icon: (
          <ClubLogo
            logoUrl={club.logo_url}
            logoSettings={club.logo_settings}
            alt={club.name}
            size={40}
          />
        ),
      }
    })
  }, [clubs, userLocation])

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 pb-16 flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Loading clubs...</p>
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

  return (
    <div className="min-h-screen pb-16 bg-background">
      <div className="px-4 py-4">
        <ElegantList
          items={clubListItems}
          onItemClick={(item) => router.push(`/clubs/${item.id}`)}
          emptyMessage="No clubs available"
          showChevron={true}
        />
      </div>
    </div>
  )
}
