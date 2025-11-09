'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, MapPin } from 'lucide-react'
import { AddressData } from '@/types'
import { cn } from '@/lib/utils'

interface AddressAutocompleteProps {
  value?: string
  onSelect: (addressData: AddressData) => void
  label?: string
  placeholder?: string
  required?: boolean
  className?: string
  error?: string
}

interface PlacePrediction {
  description: string
  place_id: string
}

declare global {
  interface Window {
    google: typeof google
  }
}

export function AddressAutocomplete({
  value = '',
  onSelect,
  label = 'Address',
  placeholder = 'Start typing an address...',
  required = false,
  className,
  error,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null)
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isScriptLoaded, setIsScriptLoaded] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null)

  // Wait for Google Maps Places API to be available (loaded globally in layout)
  useEffect(() => {
    // Check if already loaded
    if (window.google?.maps?.places) {
      setIsScriptLoaded(true)
      return
    }

    // Poll for Places library to become available
    let attempts = 0
    const maxAttempts = 100 // 10 seconds total
    
    const checkInterval = setInterval(() => {
      attempts++
      
      if (window.google?.maps?.places) {
        setIsScriptLoaded(true)
        clearInterval(checkInterval)
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval)
        console.error('Google Maps Places library not available after waiting')
        
        // Fallback: try to load it manually if still not available
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        if (apiKey && !document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
          const script = document.createElement('script')
          script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
          script.async = true
          script.defer = true
          
          script.onload = () => {
            // Check again after script loads
            setTimeout(() => {
              if (window.google?.maps?.places) {
                setIsScriptLoaded(true)
              }
            }, 500)
          }
          
          document.head.appendChild(script)
        }
      }
    }, 100)
    
    return () => clearInterval(checkInterval)
  }, [])

  // Initialize services when script is loaded
  useEffect(() => {
    if (!isScriptLoaded) {
      console.log('AddressAutocomplete: Script not loaded yet')
      return
    }

    console.log('AddressAutocomplete: Script loaded, initializing services...')

    try {
      // Initialize AutocompleteService for getting predictions
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService()
      
      // Initialize PlacesService for getting place details
      const dummyDiv = document.createElement('div')
      placesServiceRef.current = new window.google.maps.places.PlacesService(dummyDiv)
      
      console.log('AddressAutocomplete: Services initialized successfully')
    } catch (error) {
      console.error('Failed to initialize Google Places services:', error)
    }
  }, [isScriptLoaded])

  // Sync input value when value prop changes
  useEffect(() => {
    if (inputValue !== value) {
      setInputValue(value)
    }
  }, [value])

  // Update dropdown position when input changes
  useEffect(() => {
    if (showDropdown && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      })
    } else {
      setDropdownPosition(null)
    }
  }, [showDropdown, suggestions])

  // Fetch suggestions from Google Places API
  const fetchSuggestions = (query: string) => {
    if (!autocompleteServiceRef.current || !query.trim()) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }

    setIsLoading(true)

    autocompleteServiceRef.current.getPlacePredictions(
      {
        input: query,
        types: ['address'],
      },
      (predictions, status) => {
        setIsLoading(false)
        
        console.log('Places API response:', { status, predictionsCount: predictions?.length })
        
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          const limitedPredictions = predictions.slice(0, 5)
          setSuggestions(limitedPredictions)
          setShowDropdown(true)
          setSelectedIndex(-1)
          console.log('Showing dropdown with', limitedPredictions.length, 'suggestions')
        } else {
          console.warn('Places API error:', status)
          setSuggestions([])
          setShowDropdown(false)
        }
      }
    )
  }

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setShowDropdown(false)

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Debounce API calls
    debounceTimerRef.current = setTimeout(() => {
      if (newValue.trim().length >= 3) {
        fetchSuggestions(newValue)
      } else {
        setSuggestions([])
        setShowDropdown(false)
      }
    }, 300)
  }

  // Handle selecting a place
  const handleSelectPlace = (prediction: PlacePrediction) => {
    if (!placesServiceRef.current) return

    setIsLoading(true)
    setInputValue(prediction.description)
    setShowDropdown(false)
    setSuggestions([])

    // Get place details
    placesServiceRef.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ['formatted_address', 'geometry', 'place_id', 'address_components', 'name'],
      },
      (place, status) => {
        setIsLoading(false)

        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          // Extract address components
          let city: string | undefined
          let streetNumber = ''
          let route = ''

          if (place.address_components) {
            for (const component of place.address_components) {
              const types = component.types
              if (types.includes('locality')) {
                city = component.long_name
              }
              if (types.includes('street_number')) {
                streetNumber = component.long_name
              }
              if (types.includes('route')) {
                route = component.long_name
              }
            }
          }

          // Build street address
          const formattedAddress = place.formatted_address || ''
          const parts = formattedAddress.split(',').map(p => p.trim())
          let streetAddress = parts[0] || formattedAddress
          
          // If first part doesn't have number and second part is just a number, include it
          if (parts.length > 1 && !/\d/.test(parts[0]) && /^\d+$/.test(parts[1])) {
            streetAddress = `${parts[0]}, ${parts[1]}`
          } else if (streetNumber && route) {
            streetAddress = `${streetNumber} ${route}`.trim()
          } else if (route) {
            streetAddress = route
          }

          const addressData: AddressData = {
            address: streetAddress,
            city: city,
            formatted_address: formattedAddress,
            latitude: place.geometry?.location?.lat() || 0,
            longitude: place.geometry?.location?.lng() || 0,
            place_id: place.place_id,
          }

          onSelect(addressData)
        }
      }
    )
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) {
      if (e.key === 'Enter') {
        // Try to get place from current input value
        if (inputValue.trim() && autocompleteServiceRef.current) {
          autocompleteServiceRef.current.getPlacePredictions(
            { input: inputValue, types: ['address'] },
            (predictions) => {
              if (predictions && predictions.length > 0) {
                handleSelectPlace(predictions[0])
              }
            }
          )
        }
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectPlace(suggestions[selectedIndex])
        } else if (suggestions.length > 0) {
          handleSelectPlace(suggestions[0])
        }
        break
      case 'Escape':
        setShowDropdown(false)
        break
    }
  }

  // Scroll input into view when dropdown opens
  useEffect(() => {
    if (showDropdown && inputRef.current) {
      inputRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [showDropdown])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showDropdown])

  return (
    <div className={className}>
      <Label htmlFor="address-input">{label}{required && ' *'}</Label>
      <div ref={containerRef} className="relative">
        <Input
          ref={inputRef}
          id="address-input"
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowDropdown(true)
            }
          }}
          placeholder={placeholder}
          required={required}
          disabled={!isScriptLoaded}
          className="text-[13px] pr-8"
          autoComplete="off"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : (
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>

        {/* Custom Dropdown - Render in portal to avoid modal clipping */}
        {showDropdown && suggestions.length > 0 && dropdownPosition && typeof window !== 'undefined' && createPortal(
          <div 
            className="fixed bg-background border-2 border-border rounded-md shadow-xl max-h-60 overflow-y-auto"
            style={{ 
              zIndex: 10000,
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
              backgroundColor: 'hsl(var(--background))',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            }}
            onMouseDown={(e) => e.preventDefault()} // Prevent click outside from closing
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.place_id}
                type="button"
                onClick={() => handleSelectPlace(suggestion)}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  'first:rounded-t-md last:rounded-b-md',
                  index === selectedIndex && 'bg-accent text-accent-foreground'
                )}
              >
                {suggestion.description}
              </button>
            ))}
          </div>,
          document.body
        )}
      </div>
      {error && (
        <p className="text-xs text-destructive mt-1">{error}</p>
      )}
      {!isScriptLoaded && (
        <p className="text-xs text-muted-foreground mt-1">
          Loading address suggestions...
        </p>
      )}
    </div>
  )
}
