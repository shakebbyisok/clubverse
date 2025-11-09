# Interactive Map Components

Beautiful, mobile-first interactive map interface for discovering clubs.

## Setup

### 1. Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Maps JavaScript API**
4. Create credentials (API Key)
5. Restrict the API key to your domain (recommended)

### 2. Add to Environment Variables

Create or update `.env.local`:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

### 3. Required APIs

Make sure these APIs are enabled:
- ✅ Maps JavaScript API
- ✅ Geocoding API (for address lookups)

## Components

### `InteractiveMap`
Main map component with:
- Dark nightlife-themed styling
- Custom club markers with gradient colors
- User location tracking
- Smooth animations

### `ClubMarker`
Custom markers for clubs:
- Purple-to-pink gradient
- Pulse animation when selected
- Click to view details

### `ClubBottomSheet`
Bottom sheet for club details:
- Distance calculation
- Address display
- Quick menu access
- Smooth slide animations

## Usage

```tsx
import { InteractiveMap } from '@/components/map/interactive-map'
import { useClubs } from '@/lib/queries/use-clubs'
import { useGeolocation } from '@/hooks/use-geolocation'

export default function MapPage() {
  const { data: clubs } = useClubs()
  const { latitude, longitude } = useGeolocation()
  
  const userLocation = latitude && longitude 
    ? { lat: latitude, lng: longitude } 
    : null

  return (
    <InteractiveMap
      clubs={clubs || []}
      userLocation={userLocation}
      selectedClub={selectedClub}
      onClubSelect={setSelectedClub}
    />
  )
}
```

## Features

- ✅ Geolocation permission handling
- ✅ Custom dark map theme
- ✅ Animated markers
- ✅ Distance calculation
- ✅ Mobile-optimized
- ✅ Error handling
- ✅ Loading states

## Styling

The map uses a custom dark theme optimized for nightlife:
- Dark backgrounds (#1a1a1a)
- Purple/pink gradient markers
- Cyan user location indicator
- Smooth animations

