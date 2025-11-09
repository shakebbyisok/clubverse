'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, Move, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

interface LogoSettings {
  width: number
  height: number
  x: number
  y: number
}

interface LogoPositionerProps {
  open: boolean
  onClose: () => void
  onSave: (settings: LogoSettings) => void
  logoUrl: string
  currentSettings?: LogoSettings | null
  isUploading?: boolean
  onPreviewChange?: (settings: LogoSettings) => void
}

// Container dimensions for club logos (matches club selector display)
const CONTAINER_WIDTH = 64
const CONTAINER_HEIGHT = 64

// Default settings - centered logo
const defaultSettings: LogoSettings = {
  width: 48,
  height: 48,
  x: (CONTAINER_WIDTH - 48) / 2, // Center horizontally
  y: (CONTAINER_HEIGHT - 48) / 2, // Center vertically
}

// Preview container size (larger for easier manipulation)
const PREVIEW_SIZE = 300

export function LogoPositioner({
  open,
  onClose,
  onSave,
  logoUrl,
  currentSettings,
  isUploading = false,
  onPreviewChange,
}: LogoPositionerProps) {
  const [settings, setSettings] = useState<LogoSettings>(defaultSettings)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Update settings when modal opens or currentSettings changes
  useEffect(() => {
    if (open) {
      if (currentSettings) {
        // Constrain settings to valid ranges
        const constrainedSettings: LogoSettings = {
          width: Math.max(20, Math.min(64, currentSettings.width)),
          height: Math.max(20, Math.min(64, currentSettings.height)),
          x: Math.max(0, Math.min(CONTAINER_WIDTH - 20, currentSettings.x)),
          y: Math.max(0, Math.min(CONTAINER_HEIGHT - 20, currentSettings.y)),
        }
        setSettings(constrainedSettings)
      } else {
        setSettings(defaultSettings)
      }
    }
  }, [open, currentSettings])

  // Calculate scale factor from preview size to actual size
  const scale = CONTAINER_WIDTH / PREVIEW_SIZE

  // Convert preview coordinates to actual settings
  const previewToSettings = useCallback((previewX: number, previewY: number, previewWidth: number, previewHeight: number): LogoSettings => {
    return {
      x: Math.max(0, Math.min(CONTAINER_WIDTH - 20, previewX * scale)),
      y: Math.max(0, Math.min(CONTAINER_HEIGHT - 20, previewY * scale)),
      width: Math.max(20, Math.min(64, previewWidth * scale)),
      height: Math.max(20, Math.min(64, previewHeight * scale)),
    }
  }, [scale])


  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return
    e.preventDefault()
    setIsDragging(true)
    const rect = containerRef.current.getBoundingClientRect()
    const currentPreviewX = settings.x / scale
    const currentPreviewY = settings.y / scale
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    
    // Calculate offset from mouse position to image center
    setDragStart({
      x: mouseX - currentPreviewX - (settings.width / scale / 2),
      y: mouseY - currentPreviewY - (settings.height / scale / 2),
    })
  }, [settings, scale])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    
    // Calculate new position (center of image)
    const imageCenterX = mouseX - dragStart.x
    const imageCenterY = mouseY - dragStart.y
    
    // Calculate top-left corner from center
    const currentPreviewWidth = settings.width / scale
    const currentPreviewHeight = settings.height / scale
    let newX = imageCenterX - currentPreviewWidth / 2
    let newY = imageCenterY - currentPreviewHeight / 2
    
    // Constrain to container bounds
    newX = Math.max(0, Math.min(PREVIEW_SIZE - currentPreviewWidth, newX))
    newY = Math.max(0, Math.min(PREVIEW_SIZE - currentPreviewHeight, newY))
    
    const newSettings = previewToSettings(newX, newY, currentPreviewWidth, currentPreviewHeight)
    setSettings(newSettings)
    
    if (onPreviewChange) {
      onPreviewChange(newSettings)
    }
  }, [isDragging, dragStart, settings, scale, previewToSettings, onPreviewChange])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const handleZoom = useCallback((delta: number) => {
    const zoomFactor = 1.1
    const newWidth = delta > 0 
      ? Math.min(PREVIEW_SIZE * 0.9, (settings.width / scale) * zoomFactor)
      : Math.max(PREVIEW_SIZE * 0.2, (settings.width / scale) / zoomFactor)
    const newHeight = newWidth // Keep square
    
    // Center the zoom
    const newX = Math.max(0, Math.min(PREVIEW_SIZE - newWidth, (settings.x / scale) + ((settings.width / scale - newWidth) / 2)))
    const newY = Math.max(0, Math.min(PREVIEW_SIZE - newHeight, (settings.y / scale) + ((settings.height / scale - newHeight) / 2)))
    
    const newSettings = previewToSettings(newX, newY, newWidth, newHeight)
    setSettings(newSettings)
    
    if (onPreviewChange) {
      onPreviewChange(newSettings)
    }
  }, [settings, scale, previewToSettings, onPreviewChange])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    handleZoom(e.deltaY > 0 ? -1 : 1)
  }, [handleZoom])

  // Touch support for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!containerRef.current || e.touches.length !== 1) return
    e.preventDefault()
    setIsDragging(true)
    const rect = containerRef.current.getBoundingClientRect()
    const touch = e.touches[0]
    const currentPreviewX = settings.x / scale
    const currentPreviewY = settings.y / scale
    const touchX = touch.clientX - rect.left
    const touchY = touch.clientY - rect.top
    
    setDragStart({
      x: touchX - currentPreviewX - (settings.width / scale / 2),
      y: touchY - currentPreviewY - (settings.height / scale / 2),
    })
  }, [settings, scale])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !containerRef.current || e.touches.length !== 1) return
    e.preventDefault()
    
    const rect = containerRef.current.getBoundingClientRect()
    const touch = e.touches[0]
    const touchX = touch.clientX - rect.left
    const touchY = touch.clientY - rect.top
    
    const imageCenterX = touchX - dragStart.x
    const imageCenterY = touchY - dragStart.y
    
    const currentPreviewWidth = settings.width / scale
    const currentPreviewHeight = settings.height / scale
    let newX = imageCenterX - currentPreviewWidth / 2
    let newY = imageCenterY - currentPreviewHeight / 2
    
    newX = Math.max(0, Math.min(PREVIEW_SIZE - currentPreviewWidth, newX))
    newY = Math.max(0, Math.min(PREVIEW_SIZE - currentPreviewHeight, newY))
    
    const newSettings = previewToSettings(newX, newY, currentPreviewWidth, currentPreviewHeight)
    setSettings(newSettings)
    
    if (onPreviewChange) {
      onPreviewChange(newSettings)
    }
  }, [isDragging, dragStart, settings, scale, previewToSettings, onPreviewChange])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleTouchEnd)
      return () => {
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [isDragging, handleTouchMove, handleTouchEnd])

  const handleSave = () => {
    onSave(settings)
  }

  const handleReset = () => {
    setSettings(defaultSettings)
  }

  const handleClose = () => {
    // Reset to current settings when closing without saving
    if (currentSettings) {
      setSettings(currentSettings)
    } else {
      setSettings(defaultSettings)
    }
    onClose()
  }

  if (!open) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        handleClose()
      }
    }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Move className="h-4 w-4" />
            Logo Position & Size
          </DialogTitle>
          <DialogDescription>
            Adjust your logo position and size for consistent display across the app and map.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-4">
          {/* Instructions */}
          <div className="text-center space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Drag to move • Scroll to zoom
            </p>
            <p className="text-xs text-muted-foreground/70">
              Preview ({CONTAINER_WIDTH}px × {CONTAINER_HEIGHT}px)
            </p>
          </div>

          {/* Interactive Preview Container */}
          <div className="flex flex-col items-center gap-4">
            {/* Large draggable preview */}
            <div
              ref={containerRef}
              className="relative border-2 border-border/40 rounded-[var(--radius)] bg-background overflow-hidden cursor-move select-none touch-none"
              style={{
                width: PREVIEW_SIZE,
                height: PREVIEW_SIZE,
              }}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onWheel={handleWheel}
            >
              <img
                src={logoUrl}
                alt="Logo Preview"
                className="absolute object-contain select-none pointer-events-none"
                draggable={false}
                style={{
                  left: `${settings.x / scale}px`,
                  top: `${settings.y / scale}px`,
                  width: `${settings.width / scale}px`,
                  height: `${settings.height / scale}px`,
                }}
              />
              {/* Grid overlay for positioning guidance */}
              <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
                    linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
                  `,
                  backgroundSize: '20px 20px',
                }}
              />
            </div>

            {/* Actual size preview */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground text-center">Actual Size</p>
              <div
                className="relative border border-border/40 rounded-[var(--radius)] bg-background overflow-hidden mx-auto"
                style={{
                  width: CONTAINER_WIDTH,
                  height: CONTAINER_HEIGHT,
                }}
              >
                <img
                  src={logoUrl}
                  alt="Logo Preview"
                  className="absolute object-contain"
                  style={{
                    left: `${settings.x}px`,
                    top: `${settings.y}px`,
                    width: `${settings.width}px`,
                    height: `${settings.height}px`,
                  }}
                />
              </div>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-2 w-full justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleZoom(-1)}
                className="gap-1.5"
              >
                <ZoomOut className="h-3.5 w-3.5" />
                Zoom Out
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleZoom(1)}
                className="gap-1.5"
              >
                <ZoomIn className="h-3.5 w-3.5" />
                Zoom In
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isUploading}
            className="gap-1.5"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Position'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

