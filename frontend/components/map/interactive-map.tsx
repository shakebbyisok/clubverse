'use client'

import { useMemo, useCallback, useState, useEffect, useRef } from 'react'
import { APIProvider, Map, Marker, useMap } from '@vis.gl/react-google-maps'
import { Club } from '@/types'
import { CustomClubMarker } from './custom-club-marker'
import { ClubInfoBadge } from './club-info-badge'
import { Navigation } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { calculateSpiralOffsets } from '@/lib/utils/marker-spacing'

interface InteractiveMapProps {
  clubs: Club[]
  userLocation: { lat: number; lng: number } | null
  selectedClub: Club | null
  onClubSelect: (club: Club | null) => void
  onViewMenu: (clubId: string) => void
  onUserLocationRequest?: () => void
}

// Elegant minimalist map style - dark with essential labels
const mapStyles: google.maps.MapTypeStyle[] = [
  // Base map - very dark
  {
    featureType: 'all',
    elementType: 'geometry',
    stylers: [{ color: '#0a0a0a' }],
  },
  // City names - visible
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ visibility: 'on' }, { color: '#ffffff' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.stroke',
    stylers: [{ visibility: 'on' }, { color: '#000000' }, { width: 2 }],
  },
  // Water - slightly lighter
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0d0d0d' }],
  },
  // Roads - subtle but visible
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#1a1a1a' }],
  },
  // Road labels - show main streets only
  {
    featureType: 'road.arterial',
    elementType: 'labels.text.fill',
    stylers: [{ visibility: 'on' }, { color: '#666666' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'labels.text.stroke',
    stylers: [{ visibility: 'on' }, { color: '#000000' }, { width: 2 }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ visibility: 'on' }, { color: '#888888' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.stroke',
    stylers: [{ visibility: 'on' }, { color: '#000000' }, { width: 2 }],
  },
  // Hide local street labels (too cluttered)
  {
    featureType: 'road.local',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  // Hide ALL POIs (businesses, parks, etc)
  {
    featureType: 'poi',
    stylers: [{ visibility: 'off' }],
  },
  // Hide transit
  {
    featureType: 'transit',
    stylers: [{ visibility: 'off' }],
  },
  // Minimal administrative boundaries
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ color: '#1a1a1a' }],
  },
  // Hide other administrative labels
  {
    featureType: 'administrative.neighborhood',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
]

export function InteractiveMap({
  clubs,
  userLocation,
  selectedClub,
  onClubSelect,
  onViewMenu,
  onUserLocationRequest,
}: InteractiveMapProps) {
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null)
  const [showingDirections, setShowingDirections] = useState(false)
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null)

  // Initialize Directions Service
  useEffect(() => {
    if (typeof window !== 'undefined' && window.google?.maps && !directionsServiceRef.current) {
      directionsServiceRef.current = new window.google.maps.DirectionsService()
    }
  }, [])

  // Initialize Directions Renderer with minimalist styling
  useEffect(() => {
    if (mapInstance && typeof window !== 'undefined' && window.google?.maps && !directionsRenderer) {
      const renderer = new window.google.maps.DirectionsRenderer({
        map: mapInstance,
        suppressMarkers: true, // Hide default markers
        preserveViewport: false, // Allow map to adjust to show route
        polylineOptions: {
          strokeColor: '#8B5CF6', // Primary color
          strokeWeight: 4,
          strokeOpacity: 0.8,
          zIndex: 1,
        },
      })
      setDirectionsRenderer(renderer)
    }
  }, [mapInstance, directionsRenderer])

  // Clear directions when club is deselected
  useEffect(() => {
    if (!selectedClub && directionsRenderer) {
      directionsRenderer.setMap(null)
      setShowingDirections(false)
    }
  }, [selectedClub, directionsRenderer])

  // Center map on selected club (only if not showing directions)
  useEffect(() => {
    if (selectedClub && selectedClub.latitude && selectedClub.longitude && mapInstance && !showingDirections) {
      mapInstance.panTo({
        lat: Number(selectedClub.latitude),
        lng: Number(selectedClub.longitude),
      })
      mapInstance.setZoom(15)
    }
  }, [selectedClub, mapInstance, showingDirections])

  // Filter clubs with valid coordinates
  const clubsWithLocation = useMemo(
    () =>
      clubs.filter(
        (club) =>
          club.latitude != null &&
          club.longitude != null &&
          !isNaN(Number(club.latitude)) &&
          !isNaN(Number(club.longitude))
      ),
    [clubs]
  )

  // Calculate marker offsets to prevent overlap
  const spacedMarkers = useMemo(() => {
    if (clubsWithLocation.length === 0) return []
    
    const markers = clubsWithLocation.map(club => ({
      lat: Number(club.latitude!),
      lng: Number(club.longitude!),
      id: club.id,
    }))
    
    return calculateSpiralOffsets(markers, 80) // 80 meters minimum distance - balanced spacing
  }, [clubsWithLocation])

  // Calculate optimal bounds for fast loading
  const mapConfig = useMemo(() => {
    if (clubsWithLocation.length === 0) {
      return {
        center: { lat: 40.7128, lng: -74.006 },
        zoom: 12,
        restriction: null,
      }
    }

    // Calculate bounds of all clubs
    const lats = clubsWithLocation.map(club => Number(club.latitude))
    const lngs = clubsWithLocation.map(club => Number(club.longitude))
    
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)

    // Calculate differences
    const latDiff = maxLat - minLat
    const lngDiff = maxLng - minLng
    const maxDiff = Math.max(latDiff, lngDiff)

    // Add massive padding to allow extensive panning (50x larger, minimum 5 degrees = ~550km)
    const latPadding = Math.max((maxLat - minLat) * 50, 5.0) // Very large padding - allows panning far away
    const lngPadding = Math.max((maxLng - minLng) * 50, 5.0) // Very large padding - allows panning far away

    const bounds = {
      north: maxLat + latPadding,
      south: minLat - latPadding,
      east: maxLng + lngPadding,
      west: minLng - lngPadding,
    }

    // Validate bounds
    const isValidBounds = bounds.north > bounds.south && bounds.east > bounds.west

    // Calculate center
    const center = {
      lat: userLocation ? userLocation.lat : (minLat + maxLat) / 2,
      lng: userLocation ? userLocation.lng : (minLng + maxLng) / 2,
    }

    // Calculate appropriate zoom level
    let zoom = 12
    if (maxDiff < 0.01) zoom = 15
    else if (maxDiff < 0.05) zoom = 13
    else if (maxDiff < 0.1) zoom = 12
    else if (maxDiff < 0.5) zoom = 10
    else zoom = 9

    return {
      center,
      zoom: userLocation ? 13 : zoom,
      restriction: isValidBounds ? bounds : null, // Only restrict if bounds are valid
    }
  }, [clubsWithLocation, userLocation])

  // Map load handler component
  function MapLoadHandler({ 
    onMapLoad, 
    userLocation, 
    clubsWithLocation 
  }: { 
    onMapLoad: (map: google.maps.Map) => void
    userLocation: { lat: number; lng: number } | null
    clubsWithLocation: Club[]
  }) {
    const map = useMap()
    
    useEffect(() => {
      if (map) {
        onMapLoad(map)
    
    // Fit bounds to show all clubs if no user location
    if (!userLocation && clubsWithLocation.length > 0 && typeof window !== 'undefined' && window.google?.maps) {
      const bounds = new window.google.maps.LatLngBounds()
      // Use original positions for bounds calculation (not spaced positions)
      clubsWithLocation.forEach((club) => {
        bounds.extend({
          lat: Number(club.latitude),
          lng: Number(club.longitude),
        })
      })
      // Fit with padding to account for marker spacing
      map.fitBounds(bounds, 60)
        }
    }
    }, [map, onMapLoad, userLocation, clubsWithLocation])
    
    return null
  }
  
  const handleMapLoad = useCallback((map: google.maps.Map) => {
    setMapInstance(map)
  }, [])

  const handleMapIdle = useCallback(() => {
    // Map is fully loaded and idle - hide loading overlay
    setIsMapLoaded(true)
  }, [])

  const handleCenterOnUser = useCallback(() => {
    if (userLocation && mapInstance) {
      mapInstance.setCenter(userLocation)
      mapInstance.setZoom(15)
    } else if (onUserLocationRequest) {
      onUserLocationRequest()
    }
  }, [userLocation, mapInstance, onUserLocationRequest])

  const handleShowDirections = useCallback((club: Club) => {
    if (!userLocation || !club.latitude || !club.longitude || !directionsRenderer || !directionsServiceRef.current || !mapInstance) {
      return
    }

    // Toggle directions if already showing for this club
    if (showingDirections && selectedClub?.id === club.id) {
      directionsRenderer.setMap(null)
      setShowingDirections(false)
      // Recenter on club
      mapInstance.panTo({
        lat: Number(club.latitude),
        lng: Number(club.longitude),
      })
      mapInstance.setZoom(15)
      return
    }
    
    // Re-attach renderer to map if it was detached
    if (directionsRenderer.getMap() === null) {
      directionsRenderer.setMap(mapInstance)
    }

    const origin = userLocation
    const destination = {
      lat: Number(club.latitude),
      lng: Number(club.longitude),
    }

    directionsServiceRef.current.route(
      {
        origin,
        destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK && result) {
          directionsRenderer.setDirections(result)
          setShowingDirections(true)
          
          // Adjust map bounds to show entire route
          const bounds = result.routes[0].bounds
          mapInstance.fitBounds(bounds, 60) // Add padding around route (60px)
        }
      }
    )
  }, [userLocation, directionsRenderer, mapInstance, showingDirections, selectedClub])

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
        <div className="text-center p-6">
          <p className="text-muted-foreground mb-2">Google Maps API key not configured</p>
          <p className="text-sm text-muted-foreground">
            Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local
          </p>
        </div>
      </div>
    )
  }

  return (
    <APIProvider apiKey={apiKey}>
      <div className="relative w-full h-full">
        {/* Loading placeholder */}
        {!isMapLoaded && (
          <div className="absolute inset-0 bg-background flex items-center justify-center z-50">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary animate-pulse mx-auto" />
              <p className="text-sm text-muted-foreground">Loading map...</p>
            </div>
          </div>
        )}
        
        <Map
          defaultCenter={mapConfig.center}
          defaultZoom={mapConfig.zoom}
          gestureHandling="greedy"
          disableDefaultUI={true}
          zoomControl={false}
          mapTypeControl={false}
          fullscreenControl={false}
          streetViewControl={false}
          clickableIcons={false}
          styles={mapStyles}
          onIdle={handleMapIdle}
          className="w-full h-full"
          restriction={
            mapConfig.restriction
              ? {
                  latLngBounds: mapConfig.restriction,
                  strictBounds: false, // Allow panning outside bounds
                }
              : undefined
          }
          draggable={true}
          scrollwheel={true}
          minZoom={mapConfig.restriction ? 9 : undefined}
          maxZoom={17}
        >
          <MapLoadHandler 
            onMapLoad={handleMapLoad}
            userLocation={userLocation}
            clubsWithLocation={clubsWithLocation}
          />
          {/* User location marker */}
          {userLocation && isMapLoaded && typeof window !== 'undefined' && window.google?.maps && (
            <Marker
              position={userLocation}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: '#06B6D4',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
              }}
              zIndex={1000}
            />
          )}

          {/* Club markers with logos */}
          {spacedMarkers.map((spacedMarker) => {
            const club = clubsWithLocation.find(c => c.id === spacedMarker.id)!
            return (
            <CustomClubMarker
              key={club.id}
              club={club}
              position={{
                  lat: spacedMarker.lat + spacedMarker.offsetLat,
                  lng: spacedMarker.lng + spacedMarker.offsetLng,
              }}
              isSelected={selectedClub?.id === club.id}
              onClick={() => onClubSelect(club)}
            />
            )
          })}
        </Map>

        {/* Club Info Badge - appears when club is selected */}
        {selectedClub && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
            <ClubInfoBadge
              club={selectedClub}
              userLocation={userLocation}
              onClose={() => onClubSelect(null)}
              onViewMenu={onViewMenu}
              onShowDirections={handleShowDirections}
            />
          </div>
        )}

        {/* Minimal controls - bottom right */}
        <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-2">
          {/* Center on user button - only if user location exists */}
          {userLocation && (
            <Button
              onClick={handleCenterOnUser}
              size="icon"
              className={cn(
                'h-10 w-10 rounded-full shadow-xl',
                'bg-card/80 hover:bg-card backdrop-blur-sm',
                'border border-border/40'
              )}
              aria-label="Center on my location"
            >
              <Navigation className="h-4 w-4 text-primary" />
            </Button>
          )}
        </div>
      </div>
    </APIProvider>
  )
}

