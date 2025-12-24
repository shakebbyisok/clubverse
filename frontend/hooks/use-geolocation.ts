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
    const geo = navigator.geolocation
    if (!geo) {
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
      enableHighAccuracy: false, // Changed to false - high accuracy can cause permission issues
      timeout: 15000, // Increased timeout
      maximumAge: 300000, // Allow cached position up to 5 minutes
    }

    // Check permission status first
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((result) => {
        if (result.state === 'denied') {
          setState((prev) => ({
            ...prev,
            error: {
              code: 1, // PERMISSION_DENIED
              message: 'Location access denied',
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3,
            } as GeolocationPositionError,
            loading: false,
          }))
          return
        }

        // Permission granted or prompt - try to get position
        geo.getCurrentPosition(
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
            // Only set error if it's actually a permission denial
            // Timeout and unavailable errors shouldn't show "permission denied"
            if (error.code === error.PERMISSION_DENIED) {
              setState((prev) => ({
                ...prev,
                error,
                loading: false,
              }))
            } else {
              // For timeout or unavailable, don't show error - just no location
              setState((prev) => ({
                ...prev,
                error: null, // Clear error for timeout/unavailable
                loading: false,
              }))
            }
          },
          options
        )
      }).catch(() => {
        // Permissions API not supported, fall back to direct geolocation
        geo.getCurrentPosition(
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
            // Only show error for actual permission denial
            if (error.code === error.PERMISSION_DENIED) {
              setState((prev) => ({
                ...prev,
                error,
                loading: false,
              }))
            } else {
              setState((prev) => ({
                ...prev,
                error: null,
                loading: false,
              }))
            }
          },
          options
        )
      })
    } else {
      // Permissions API not available, use direct geolocation
      geo.getCurrentPosition(
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
          // Only show error for actual permission denial
          if (error.code === error.PERMISSION_DENIED) {
            setState((prev) => ({
              ...prev,
              error,
              loading: false,
            }))
          } else {
            setState((prev) => ({
              ...prev,
              error: null,
              loading: false,
            }))
          }
        },
        options
      )
    }
  }, [])

  return state
}

