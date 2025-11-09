'use client'

import { useState } from 'react'
import { useClubs } from '@/lib/queries/use-clubs'
import { useGeolocation } from '@/hooks/use-geolocation'
import { InteractiveMap } from '@/components/map/interactive-map'
import { Club } from '@/types'
import { Loader2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useRouter } from 'next/navigation'

export default function MapPage() {
  const router = useRouter()
  const { data: clubs, isLoading, error } = useClubs()
  const { latitude, longitude, error: geoError } = useGeolocation()
  const [selectedClub, setSelectedClub] = useState<Club | null>(null)

  const userLocation =
    latitude && longitude ? { lat: latitude, lng: longitude } : null

  const handleClubSelect = (club: Club | null) => {
    setSelectedClub(club)
  }

  const handleViewMenu = (clubId: string) => {
    router.push(`/clubs/${clubId}`)
  }

  // Loading state - only wait for clubs, not geolocation
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
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
      <div className="fixed inset-0 flex items-center justify-center bg-background p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Failed to load clubs'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 pb-16 bg-background">
      {/* Geolocation error banner */}
      {geoError && (
        <div className="absolute top-4 left-4 right-4 z-10">
          <Alert className="bg-card/95 backdrop-blur-sm border-border/40 shadow-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-sm">Location access denied</AlertTitle>
            <AlertDescription className="text-xs">
              Enable location to see nearby clubs
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Full screen map */}
      <div className="w-full h-full">
        <InteractiveMap
          clubs={clubs || []}
          userLocation={userLocation}
          selectedClub={selectedClub}
          onClubSelect={handleClubSelect}
          onViewMenu={handleViewMenu}
        />
      </div>
    </div>
  )
}

