'use client'

import { useEffect, useState } from 'react'
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps'
import { Club } from '@/types'

// Ultra-minimal dark map style - very clean, no labels
const mapStyles: google.maps.MapTypeStyle[] = [
  // Base map - very dark
  {
    featureType: 'all',
    elementType: 'geometry',
    stylers: [{ color: '#0a0a0a' }],
  },
  // Hide ALL labels
  {
    featureType: 'all',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  // Water - slightly lighter
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0d0d0d' }],
  },
  // Roads - very subtle
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#1a1a1a' }],
  },
  // Hide all POIs
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
]

interface StaticMapBackgroundProps {
  club: Club
  className?: string
}

export function StaticMapBackground({ club, className }: StaticMapBackgroundProps) {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Set loaded after a short delay to ensure map is rendered
    const timer = setTimeout(() => {
      setIsLoaded(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  if (!club.latitude || !club.longitude) {
    return null
  }

  const center = {
    lat: Number(club.latitude),
    lng: Number(club.longitude),
  }

  return (
    <div className={className}>
      <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
        <Map
          defaultCenter={center}
          defaultZoom={14}
          gestureHandling="none"
          disableDefaultUI={true}
          zoomControl={false}
          mapTypeControl={false}
          fullscreenControl={false}
          streetViewControl={false}
          clickableIcons={false}
          styles={mapStyles}
          className="w-full h-full"
          draggable={false}
          scrollwheel={false}
        >
          {isLoaded && typeof window !== 'undefined' && window.google?.maps && (
            <Marker
              position={center}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: '#8B5CF6',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 3,
              }}
            />
          )}
        </Map>
      </APIProvider>
    </div>
  )
}

