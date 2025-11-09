'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Upload, X, Building2, Save, Move } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Club, LogoSettings, AddressData } from '@/types'
import { ModalActionButton } from './modal-action-button'
import { ImageCropper } from './image-cropper'
import { LogoPositioner } from './logo-positioner'
import { ClubLogo } from './club-logo'
import { AddressAutocomplete } from './address-autocomplete'

interface ClubFormData {
  name: string
  description: string
  address: string
  city: string
  formatted_address: string | null
  latitude: number | null
  longitude: number | null
  place_id: string | null
  logo_base64: string | null
}

interface ClubFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  club?: Club | null
  onSuccess?: () => void
}

export function ClubFormModal({
  open,
  onOpenChange,
  club,
  onSuccess,
}: ClubFormModalProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const addressInputRef = useRef<HTMLInputElement>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [formData, setFormData] = useState<ClubFormData>({
    name: '',
    description: '',
    address: '',
    city: '',
    formatted_address: null,
    latitude: null,
    longitude: null,
    place_id: null,
    logo_base64: null,
  })
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoSettings, setLogoSettings] = useState<LogoSettings | null>(null)
  const [isCropperOpen, setIsCropperOpen] = useState(false)
  const [isPositionerOpen, setIsPositionerOpen] = useState(false)
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)

  // Auto-scroll to address field when modal opens
  useEffect(() => {
    if (open && formRef.current) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        if (addressInputRef.current) {
          addressInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
        } else if (formRef.current) {
          // Fallback: scroll form container down
          formRef.current.scrollTop = formRef.current.scrollHeight / 2
        }
      }, 100)
    }
  }, [open])

  // Load club data when modal opens or club changes
  useEffect(() => {
    if (open) {
      if (club) {
        // When editing existing club, extract correct street address from formatted_address
        // to avoid using potentially incorrect old address field
        const extractedAddress = club.formatted_address 
          ? club.formatted_address.split(',')[0]?.trim() 
          : (club.address || '')
        
        setFormData({
          name: club.name || '',
          description: club.description || '',
          address: extractedAddress, // Use extracted address from formatted_address
          city: club.city || '',
          formatted_address: club.formatted_address || null,
          latitude: club.latitude || null,
          longitude: club.longitude || null,
          place_id: club.place_id || null,
          logo_base64: null,
        })
        if (club.logo_url) {
          setLogoPreview(club.logo_url)
        } else {
          setLogoPreview(null)
        }
        setLogoSettings(club.logo_settings || null)
      } else {
        // Reset form for new club
        setFormData({
          name: '',
          description: '',
          address: '',
          city: '',
          formatted_address: null,
          latitude: null,
          longitude: null,
          place_id: null,
          logo_base64: null,
        })
        setLogoPreview(null)
        setLogoSettings(null)
      }
    }
  }, [open, club])

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Invalid file',
        description: 'Please upload an image file',
      })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Logo must be less than 5MB',
      })
      return
    }

    // Open cropper with selected file
    setSelectedImageFile(file)
    setIsCropperOpen(true)
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleCroppedImage = async (croppedFile: File) => {
    setIsUploadingLogo(true)
    
    try {
      // Convert cropped file to base64
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        setFormData(prev => ({ ...prev, logo_base64: base64String }))
        setLogoPreview(base64String)
        setIsCropperOpen(false)
        setSelectedImageFile(null)
        setIsUploadingLogo(false)
        
        // After cropping, offer to position logo
        toast({
          title: 'Logo cropped!',
          description: 'You can now position your logo if needed.',
        })
      }
      reader.onerror = () => {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to process cropped image',
        })
        setIsUploadingLogo(false)
      }
      reader.readAsDataURL(croppedFile)
    } catch (error) {
      console.error('Error processing cropped image:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to process cropped image',
      })
      setIsUploadingLogo(false)
    }
  }

  const handleCropperClose = () => {
    setIsCropperOpen(false)
    setSelectedImageFile(null)
    setIsUploadingLogo(false)
  }

  const handlePositionLogo = () => {
    if (!logoPreview) {
      toast({
        variant: 'destructive',
        title: 'No logo',
        description: 'Please upload a logo first',
      })
      return
    }
    setIsPositionerOpen(true)
  }

  const handleSaveLogoSettings = async (settings: LogoSettings) => {
    setLogoSettings(settings)
    setIsPositionerOpen(false)
    
    toast({
      title: 'Logo position saved!',
      description: 'Position will be applied when you save the club.',
    })
  }

  const handlePositionerClose = () => {
    setIsPositionerOpen(false)
  }

  const handlePreviewChange = (settings: LogoSettings) => {
    // Real-time preview update - only update if different to prevent loops
    setLogoSettings(prev => {
      if (!prev || prev.width !== settings.width || prev.height !== settings.height || 
          prev.x !== settings.x || prev.y !== settings.y) {
        return settings
      }
      return prev
    })
  }

  const removeLogo = () => {
    setFormData(prev => ({ ...prev, logo_base64: null }))
    setLogoPreview(null)
    setLogoSettings(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Club name is required',
      })
      return
    }

    // Log form data before submission for debugging
    console.log('Submitting form data:', formData)

    setIsSaving(true)
    try {
      const { clubsApi } = await import('@/lib/api/clubs')
      
      if (club) {
        // Update existing club
        await clubsApi.updateClub(club.id, {
          name: formData.name,
          description: formData.description || undefined,
          address: formData.address || undefined,
          city: formData.city || undefined,
          formatted_address: formData.formatted_address || undefined,
          latitude: formData.latitude || undefined,
          longitude: formData.longitude || undefined,
          place_id: formData.place_id || undefined,
          logo_url: formData.logo_base64 || undefined,
          logo_settings: logoSettings || undefined,
        })
        
        toast({
          title: 'Success!',
          description: 'Club updated successfully',
        })
      } else {
        // Create new club
        const newClub = await clubsApi.createClub({
          name: formData.name,
          description: formData.description || undefined,
          address: formData.address || undefined,
          city: formData.city || undefined,
          formatted_address: formData.formatted_address || undefined,
          latitude: formData.latitude || undefined,
          longitude: formData.longitude || undefined,
          place_id: formData.place_id || undefined,
          logo_url: formData.logo_base64 || undefined,
          logo_settings: logoSettings || undefined,
        })
        
        // Set as selected club
        localStorage.setItem('selectedClubId', newClub.id)
        
        toast({
          title: 'Success!',
          description: 'Club created successfully',
        })
      }
      
      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to save club',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0"
        onPointerDownOutside={(e) => {
          // Allow clicks on Google Maps dropdown (pac-container) to work
          const target = e.target as HTMLElement
          if (target.closest('.pac-container')) {
            e.preventDefault()
          }
        }}
        onInteractOutside={(e) => {
          // Allow interactions with Google Maps dropdown
          const target = e.target as HTMLElement
          if (target.closest('.pac-container')) {
            e.preventDefault()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{club ? 'Edit Club' : 'Create New Club'}</DialogTitle>
          <DialogDescription>
            {club 
              ? 'Update your club information and logo'
              : 'Set up your club profile'}
          </DialogDescription>
        </DialogHeader>
        
        <form ref={formRef} onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 pb-2 space-y-4">
          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>Club Logo</Label>
            <div className="flex items-start gap-4">
              {logoPreview ? (
                <div className="relative">
                  <ClubLogo
                    logoUrl={logoPreview}
                    logoSettings={logoSettings}
                    alt="Club logo"
                    size={80}
                  />
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="absolute -top-2 -right-2 p-1 bg-background border border-border/40 rounded-full hover:bg-muted transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-[var(--radius)] border border-dashed border-border/40 flex items-center justify-center bg-muted/20">
                  <Building2 className="h-8 w-8 text-muted-foreground/50" />
                </div>
              )}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="logo-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleFileSelect}
                    disabled={isUploadingLogo}
                    className="gap-1.5"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {logoPreview ? 'Change Logo' : 'Upload Logo'}
                  </Button>
                  {logoPreview && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handlePositionLogo}
                      className="gap-1.5"
                    >
                      <Move className="h-3.5 w-3.5" />
                      Position
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG up to 5MB. Logo will be cropped to square.
                </p>
              </div>
            </div>
          </div>

          {/* Club Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Club Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter club name"
              required
              className="text-[13px]"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Tell us about your club..."
              rows={3}
              className="text-[13px] resize-none"
            />
          </div>

          {/* Address with Google Maps Autocomplete */}
          <div ref={addressInputRef}>
            <AddressAutocomplete
              value={formData.formatted_address || ''}
              onSelect={(addressData) => {
                console.log('🎯 CLUB FORM: Address selected from autocomplete:', addressData)
                setFormData(prev => {
                  const newData = {
                    ...prev,
                    address: addressData.address,
                    city: addressData.city || prev.city,
                    formatted_address: addressData.formatted_address,
                    latitude: addressData.latitude,
                    longitude: addressData.longitude,
                    place_id: addressData.place_id || null,
                  }
                  console.log('🎯 CLUB FORM: Updated formData:', newData)
                  return newData
                })
              }}
              label="Address"
              placeholder="Start typing an address..."
              className="space-y-2"
            />
          </div>
        </form>

        <DialogFooter className="flex-row justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <ModalActionButton
            onClick={(e) => {
              e?.preventDefault()
              handleSubmit(e as any)
            }}
            isLoading={isSaving}
            disabled={!formData.name.trim()}
            label={club ? 'Save Changes' : 'Create Club'}
            icon={<Save className="h-3.5 w-3.5" />}
            variant="save"
            type="submit"
          />
        </DialogFooter>
      </DialogContent>

      {/* Image Cropper */}
      <ImageCropper
        open={isCropperOpen}
        onClose={handleCropperClose}
        onCrop={handleCroppedImage}
        imageFile={selectedImageFile}
        isUploading={isUploadingLogo}
      />

      {/* Logo Positioner */}
      {logoPreview && (
        <LogoPositioner
          open={isPositionerOpen}
          onClose={handlePositionerClose}
          onSave={handleSaveLogoSettings}
          logoUrl={logoPreview}
          currentSettings={logoSettings}
          isUploading={false}
          onPreviewChange={handlePreviewChange}
        />
      )}
    </Dialog>
  )
}

