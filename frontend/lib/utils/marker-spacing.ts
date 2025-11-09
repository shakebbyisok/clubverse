/**
 * Utility functions for spacing markers on a map to prevent overlap
 */

interface MarkerPosition {
  lat: number
  lng: number
  id: string
}

interface SpacedMarker extends MarkerPosition {
  offsetLat: number
  offsetLng: number
}

/**
 * Calculate distance between two coordinates in degrees
 */
function distanceDegrees(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = lat2 - lat1
  const dLng = lng2 - lng1
  return Math.sqrt(dLat * dLat + dLng * dLng)
}

/**
 * Calculate distance in meters (approximate)
 */
function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000 // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Calculate offsets for markers to prevent overlap
 * Uses a force-directed approach: markers repel each other when too close
 */
export function calculateMarkerOffsets(
  markers: MarkerPosition[],
  minDistanceMeters: number = 50, // Minimum distance between markers in meters
  maxIterations: number = 10
): SpacedMarker[] {
  if (markers.length <= 1) {
    return markers.map(m => ({ ...m, offsetLat: 0, offsetLng: 0 }))
  }

  // Initialize offsets
  const spaced: SpacedMarker[] = markers.map(m => ({
    ...m,
    offsetLat: 0,
    offsetLng: 0,
  }))

  // Convert min distance from meters to approximate degrees
  // At equator: 1 degree ≈ 111km, so 50m ≈ 0.00045 degrees
  // Adjust based on average latitude
  const avgLat = markers.reduce((sum, m) => sum + m.lat, 0) / markers.length
  const metersPerDegreeLat = 111000
  const metersPerDegreeLng = 111000 * Math.cos((avgLat * Math.PI) / 180)
  const minDistanceDegreesLat = minDistanceMeters / metersPerDegreeLat
  const minDistanceDegreesLng = minDistanceMeters / metersPerDegreeLng

  // Iterative force-directed layout
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let moved = false

    for (let i = 0; i < spaced.length; i++) {
      let forceLat = 0
      let forceLng = 0

      for (let j = 0; j < spaced.length; j++) {
        if (i === j) continue

        const lat1 = spaced[i].lat + spaced[i].offsetLat
        const lng1 = spaced[i].lng + spaced[i].offsetLng
        const lat2 = spaced[j].lat + spaced[j].offsetLat
        const lng2 = spaced[j].lng + spaced[j].offsetLng

        const distLat = Math.abs(lat2 - lat1)
        const distLng = Math.abs(lng2 - lng1)
        const distMeters = distanceMeters(lat1, lng1, lat2, lng2)

        // If too close, apply repulsion force
        if (distMeters < minDistanceMeters) {
          const force = (minDistanceMeters - distMeters) / minDistanceMeters
          
          // Calculate direction (away from other marker)
          const dirLat = lat1 < lat2 ? -1 : 1
          const dirLng = lng1 < lng2 ? -1 : 1

          // Apply force (scaled by distance to avoid oscillation)
          forceLat += dirLat * force * minDistanceDegreesLat * 0.1
          forceLng += dirLng * force * minDistanceDegreesLng * 0.1
          moved = true
        }
      }

      // Apply forces with damping
      spaced[i].offsetLat += forceLat * 0.5
      spaced[i].offsetLng += forceLng * 0.5

      // Limit maximum offset (don't move too far from original position)
      const maxOffsetDegrees = minDistanceDegreesLat * 2
      spaced[i].offsetLat = Math.max(
        -maxOffsetDegrees,
        Math.min(maxOffsetDegrees, spaced[i].offsetLat)
      )
      spaced[i].offsetLng = Math.max(
        -maxOffsetDegrees,
        Math.min(maxOffsetDegrees, spaced[i].offsetLng)
      )
    }

    // Early exit if no movement
    if (!moved) break
  }

  return spaced
}

/**
 * Simple spiral offset for markers that are very close
 * Alternative approach: arrange markers in a small spiral pattern
 */
export function calculateSpiralOffsets(
  markers: MarkerPosition[],
  minDistanceMeters: number = 50
): SpacedMarker[] {
  if (markers.length <= 1) {
    return markers.map(m => ({ ...m, offsetLat: 0, offsetLng: 0 }))
  }

  const avgLat = markers.reduce((sum, m) => sum + m.lat, 0) / markers.length
  const metersPerDegreeLat = 111000
  const metersPerDegreeLng = 111000 * Math.cos((avgLat * Math.PI) / 180)
  const offsetDegreesLat = minDistanceMeters / metersPerDegreeLat
  const offsetDegreesLng = minDistanceMeters / metersPerDegreeLng

  // Group markers by proximity
  const groups: MarkerPosition[][] = []
  const processed = new Set<string>()

  markers.forEach(marker => {
    if (processed.has(marker.id)) return

    const group: MarkerPosition[] = [marker]
    processed.add(marker.id)

    // Find all markers within minDistanceMeters
    markers.forEach(other => {
      if (processed.has(other.id)) return
      const dist = distanceMeters(marker.lat, marker.lng, other.lat, other.lng)
      if (dist < minDistanceMeters) {
        group.push(other)
        processed.add(other.id)
      }
    })

    groups.push(group)
  })

  // Apply spiral offsets to each group
  const spaced: SpacedMarker[] = []

  groups.forEach(group => {
    if (group.length === 1) {
      spaced.push({ ...group[0], offsetLat: 0, offsetLng: 0 })
      return
    }

    // Center marker stays in place, others spiral around
    const center = group[0]
    spaced.push({ ...center, offsetLat: 0, offsetLng: 0 })

    // Arrange others in a spiral with balanced spacing
    const angleStep = (2 * Math.PI) / (group.length - 1)
    group.slice(1).forEach((marker, index) => {
      const angle = angleStep * index
      // Moderate radius increase - start at 1.2x and increase gradually
      // This keeps markers close to their actual locations while preventing overlap
      const radius = 1.2 + Math.floor(index / 6) * 0.3
      spaced.push({
        ...marker,
        offsetLat: Math.cos(angle) * radius * offsetDegreesLat,
        offsetLng: Math.sin(angle) * radius * offsetDegreesLng,
      })
    })
  })

  return spaced
}

