'use client'

import { Club } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X, MapPin, Navigation, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import Image from 'next/image'

interface ClubBottomSheetProps {
  club: Club | null
  userLocation: { lat: number; lng: number } | null
  onClose: () => void
  onViewMenu: (clubId: string) => void
}

export function ClubBottomSheet({
  club,
  userLocation,
  onClose,
  onViewMenu,
}: ClubBottomSheetProps) {
  const router = useRouter()

  // Calculate distance if we have user location
  const distance = useMemo(() => {
    if (!club || !userLocation || !club.latitude || !club.longitude) return null

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
      return `${Math.round(distanceKm * 1000)}m away`
    }
    return `${distanceKm.toFixed(1)}km away`
  }, [club, userLocation])

  if (!club) return null

  const handleViewMenu = () => {
    onViewMenu(club.id)
    router.push(`/clubs/${club.id}`)
  }

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-50',
        'bg-card/95 backdrop-blur-xl border-t border-border/40',
        'shadow-2xl rounded-t-2xl',
        'transition-all duration-300 ease-out',
        'max-h-[85vh] overflow-hidden',
        'flex flex-col'
      )}
    >
      {/* Drag handle */}
      <div className="flex justify-center pt-2 pb-1">
        <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-2 pb-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold mb-1 truncate">{club.name}</h2>
          {club.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{club.description}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 flex-shrink-0 ml-2"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
        {/* Address */}
        {club.formatted_address && (
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-muted-foreground mb-1">Address</p>
              <p className="text-sm text-foreground">{club.formatted_address}</p>
            </div>
          </div>
        )}

        {/* Distance */}
        {distance && (
          <div className="flex items-start gap-3">
            <Navigation className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-muted-foreground mb-1">Distance</p>
              <p className="text-sm text-foreground font-medium">{distance}</p>
            </div>
          </div>
        )}

        {/* Cover image */}
        {club.cover_image_url && (
          <div className="rounded-lg overflow-hidden aspect-video bg-muted relative">
            <Image
              src={club.cover_image_url}
              alt={club.name}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-4 pb-4 pt-2 border-t border-border/40 space-y-2">
        <Button onClick={handleViewMenu} className="w-full" size="lg">
          View Menu & Order
        </Button>
        <Button
          variant="outline"
          onClick={onClose}
          className="w-full"
          size="sm"
        >
          Close
        </Button>
      </div>
    </div>
  )
}

