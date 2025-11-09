'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface ImageCropperProps {
  open: boolean
  onClose: () => void
  onCrop: (croppedImageFile: File) => void
  imageFile: File | null
  isUploading?: boolean
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 80,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  )
}

export function ImageCropper({
  open,
  onClose,
  onCrop,
  imageFile,
  isUploading = false,
}: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [imageSrc, setImageSrc] = useState<string>('')
  const imgRef = useRef<HTMLImageElement>(null)

  // Load image when file changes
  useEffect(() => {
    if (imageFile) {
      const reader = new FileReader()
      reader.onload = () => {
        setImageSrc(reader.result as string)
      }
      reader.readAsDataURL(imageFile)
    } else {
      setImageSrc('')
    }
  }, [imageFile])

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    
    // Set initial crop to center with good aspect ratio for logos (square-ish)
    const aspect = 1 // Square crop for consistent logos
    const crop = centerAspectCrop(width, height, aspect)
    setCrop(crop)
  }, [])

  const getCroppedImg = useCallback(
    (image: HTMLImageElement, crop: PixelCrop): Promise<File> => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        throw new Error('No 2d context')
      }

      const scaleX = image.naturalWidth / image.width
      const scaleY = image.naturalHeight / image.height

      canvas.width = crop.width
      canvas.height = crop.height

      ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        crop.width,
        crop.height,
      )

      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Canvas is empty'))
            return
          }
          const file = new File([blob], imageFile?.name || 'cropped-logo.png', {
            type: 'image/png',
          })
          resolve(file)
        }, 'image/png', 0.95)
      })
    },
    [imageFile],
  )

  const handleCrop = useCallback(async () => {
    if (completedCrop && imgRef.current) {
      try {
        const croppedImageFile = await getCroppedImg(imgRef.current, completedCrop)
        onCrop(croppedImageFile)
      } catch (error) {
        console.error('Error cropping image:', error)
      }
    }
  }, [completedCrop, getCroppedImg, onCrop])

  const handleClose = () => {
    setImageSrc('')
    setCrop(undefined)
    setCompletedCrop(undefined)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader>
          <DialogTitle>Crop Your Logo</DialogTitle>
          <DialogDescription>
            Drag and resize the crop area to select the part of your image you want to use as your logo.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-4 pb-2">
          {imageSrc && (
            <div className="flex justify-center my-4">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1} // Square crop for consistent logos
                minWidth={50}
                minHeight={50}
                className="max-w-full"
              >
                <img
                  ref={imgRef}
                  alt="Crop preview"
                  src={imageSrc}
                  onLoad={onImageLoad}
                  className="max-w-full max-h-[400px] object-contain"
                />
              </ReactCrop>
            </div>
          )}
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
            onClick={handleCrop}
            disabled={!completedCrop || isUploading}
            className="gap-1.5"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Uploading...
              </>
            ) : (
              'Crop & Upload'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

