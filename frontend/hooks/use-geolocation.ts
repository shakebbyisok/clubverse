'use client'

import { useState, useEffect } from 'react'

interface GeolocationState {
  latitude: number | null
  longitude: number | null
  accuracy: number | null
  error: GeolocationPositionError | null
  loading: boolean
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: true,
  })

  useEffect(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: {
          code: 0,
          message: 'Geolocation is not supported by your browser',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError,
        loading: false,
      }))
      return
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          error: null,
          loading: false,
        })
      },
      (error) => {
        setState((prev) => ({
          ...prev,
          error,
          loading: false,
        }))
      },
      options
    )
  }, [])

  return state
}

