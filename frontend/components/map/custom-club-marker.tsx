'use client'

import { useEffect, useRef } from 'react'
import { useMap } from '@vis.gl/react-google-maps'
import { Club } from '@/types'
import { ClubLogo } from '@/components/common/club-logo'
import { cn } from '@/lib/utils'
import { createRoot, Root } from 'react-dom/client'

interface CustomClubMarkerProps {
  club: Club
  position: { lat: number; lng: number }
  isSelected: boolean
  onClick: () => void
}

export function CustomClubMarker({ club, position, isSelected, onClick }: CustomClubMarkerProps) {
  const map = useMap()
  const overlayRef = useRef<google.maps.OverlayView | null>(null)
  const rootRef = useRef<Root | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!map || typeof window === 'undefined' || !window.google?.maps) return

    class CustomOverlay extends window.google.maps.OverlayView {
      position: google.maps.LatLng
      containerDiv: HTMLDivElement | null = null

      constructor(position: google.maps.LatLng) {
        super()
        this.position = position
      }

      onAdd() {
        this.containerDiv = document.createElement('div')
        this.containerDiv.style.position = 'absolute'
        this.containerDiv.style.cursor = 'pointer'
        
        containerRef.current = this.containerDiv
        
        // Render React component
        rootRef.current = createRoot(this.containerDiv)
        this.updateContent()

        const panes = this.getPanes()
        panes?.overlayMouseTarget.appendChild(this.containerDiv)
      }

      draw() {
        if (!this.containerDiv) return

        const overlayProjection = this.getProjection()
        const point = overlayProjection.fromLatLngToDivPixel(this.position)

        if (point) {
          this.containerDiv.style.left = point.x + 'px'
          this.containerDiv.style.top = point.y + 'px'
          this.containerDiv.style.transform = 'translate(-50%, -100%)'
        }
      }

      updateContent() {
        if (!rootRef.current) return
        
        rootRef.current.render(
          <div
            className={cn(
              'flex flex-col items-center gap-1 transition-all duration-200',
              'cursor-pointer group',
              isSelected && 'scale-110'
            )}
            onClick={onClick}
          >
            {/* Club Logo - Rectangular, Elegant */}
            <div
              className={cn(
                'relative',
                isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background rounded-[var(--radius)]'
              )}
            >
              <ClubLogo
                logoUrl={club.logo_url}
                logoSettings={club.logo_settings}
                alt={club.name}
                size={isSelected ? 56 : 48}
                containerClassName={cn(
                  'shadow-lg transition-all',
                  'group-hover:shadow-xl group-hover:scale-105',
                  isSelected && 'shadow-2xl'
                )}
              />
              
              {/* Pulse animation when selected */}
              {isSelected && (
                <div className="absolute inset-0 rounded-[var(--radius)] bg-primary/20 animate-ping" />
              )}
            </div>

            {/* Club Name - Compact */}
            <div
              className={cn(
                'bg-card/95 backdrop-blur-sm border border-border/40 rounded-md px-2 py-1',
                'shadow-lg max-w-[120px]',
                'transition-all duration-200',
                isSelected && 'bg-primary/10 border-primary/40'
              )}
            >
              <p className="text-[11px] font-medium text-foreground truncate text-center">
                {club.name}
              </p>
            </div>
          </div>
        )
      }

      onRemove() {
        if (this.containerDiv && this.containerDiv.parentElement) {
          // Defer unmount to avoid React render cycle conflicts
          const rootToUnmount = rootRef.current
          if (rootToUnmount) {
            // Use setTimeout to defer unmount until after current render cycle
            setTimeout(() => {
              try {
                rootToUnmount.unmount()
              } catch (error) {
                // Ignore errors if already unmounted
              }
            }, 0)
            rootRef.current = null
          }
          this.containerDiv.parentElement.removeChild(this.containerDiv)
          this.containerDiv = null
        }
      }
    }

    const overlay = new CustomOverlay(
      new window.google.maps.LatLng(position.lat, position.lng)
    )
    overlay.setMap(map)
    overlayRef.current = overlay

    return () => {
      if (overlayRef.current) {
        overlayRef.current.setMap(null)
        overlayRef.current = null
      }
      // Clean up root reference
      const rootToUnmount = rootRef.current
      if (rootToUnmount) {
        setTimeout(() => {
          try {
            rootToUnmount.unmount()
          } catch (error) {
            // Ignore errors if already unmounted
          }
        }, 0)
        rootRef.current = null
      }
    }
  }, [map, position.lat, position.lng])

  // Update content when selection changes
  useEffect(() => {
    if (overlayRef.current && 'updateContent' in overlayRef.current) {
      ;(overlayRef.current as any).updateContent()
    }
  }, [isSelected, club, onClick])

  return null
}

