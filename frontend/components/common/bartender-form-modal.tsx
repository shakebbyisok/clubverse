'use client'

import { useState, useEffect } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { BartenderCreate, Club } from '@/types'
import { bartendersApi } from '@/lib/api/bartenders'
import { clubsApi } from '@/lib/api/clubs'

interface BartenderFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clubId: string
  onSuccess?: () => void
}

export function BartenderFormModal({
  open,
  onOpenChange,
  clubId,
  onSuccess,
}: BartenderFormModalProps) {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [selectedClubId, setSelectedClubId] = useState<string>(clubId)
  const [clubs, setClubs] = useState<Club[]>([])
  const [isLoadingClubs, setIsLoadingClubs] = useState(true)
  const [formData, setFormData] = useState<BartenderCreate>({
    club_id: clubId,
    email: '',
    password: '',
    full_name: '',
  })

  // Load clubs when modal opens
  useEffect(() => {
    if (open) {
      const fetchClubs = async () => {
        setIsLoadingClubs(true)
        try {
          const myClubs = await clubsApi.getMyClubs()
          setClubs(myClubs)
          // Set selected club to the provided clubId or first club
          const defaultClubId = clubId || myClubs[0]?.id
          if (defaultClubId) {
            setSelectedClubId(defaultClubId)
            setFormData({
              club_id: defaultClubId,
              email: '',
              password: '',
              full_name: '',
            })
          }
        } catch (error: any) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: error.response?.data?.detail || 'Failed to load clubs',
          })
        } finally {
          setIsLoadingClubs(false)
        }
      }
      fetchClubs()
    }
  }, [open, clubId, toast])

  // Update formData when selectedClubId changes
  useEffect(() => {
    if (selectedClubId) {
      setFormData(prev => ({ ...prev, club_id: selectedClubId }))
    }
  }, [selectedClubId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.email || !formData.password) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Email and password are required',
      })
      return
    }

    setIsSaving(true)
    try {
      await bartendersApi.create(formData)
      toast({
        title: 'Success!',
        description: 'Bartender added successfully',
      })
      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to add bartender',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Add Bartender</DialogTitle>
          <DialogDescription>
            Create a new bartender account for this club. They will be able to log in and manage orders.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="bartender@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                disabled={isSaving}
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">
                Minimum 6 characters
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name (Optional)</Label>
              <Input
                id="full_name"
                type="text"
                placeholder="John Doe"
                value={formData.full_name || ''}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                disabled={isSaving}
              />
            </div>

            {/* Club Selection */}
            <div className="space-y-2">
              <Label htmlFor="club">Club</Label>
              {isLoadingClubs ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Select
                  value={selectedClubId}
                  onValueChange={setSelectedClubId}
                  disabled={isSaving}
                >
                  <SelectTrigger id="club">
                    <SelectValue placeholder="Select a club" />
                  </SelectTrigger>
                  <SelectContent>
                    {clubs.map((club) => (
                      <SelectItem key={club.id} value={club.id}>
                        {club.name}
                        {club.city && ` - ${club.city}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">
                Select the club this bartender should be associated with
              </p>
            </div>
          </div>
          <DialogFooter className="px-6 pb-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Bartender'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

