'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Toggle } from '@/components/ui/toggle'
import { SaveButton } from '@/components/common/save-button'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Bartender, Club } from '@/types'
import { bartendersApi } from '@/lib/api/bartenders'
import { clubsApi } from '@/lib/api/clubs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface BartenderEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bartender: Bartender | null
  currentClubId: string
  onSuccess?: () => void
}

export function BartenderEditModal({
  open,
  onOpenChange,
  bartender,
  currentClubId,
  onSuccess,
}: BartenderEditModalProps) {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [selectedClubId, setSelectedClubId] = useState<string>(currentClubId)
  const [isActive, setIsActive] = useState<boolean>(true)
  const [clubs, setClubs] = useState<Club[]>([])
  const [isLoadingClubs, setIsLoadingClubs] = useState(true)

  // Load clubs when modal opens
  useEffect(() => {
    if (open) {
      const fetchClubs = async () => {
        setIsLoadingClubs(true)
        try {
          const myClubs = await clubsApi.getMyClubs()
          setClubs(myClubs)
          // Set selected club to bartender's current club or current club
          if (bartender) {
            setSelectedClubId(bartender.club_id)
            setIsActive(bartender.is_active)
          } else {
            setSelectedClubId(currentClubId)
            setIsActive(true)
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
  }, [open, bartender, currentClubId, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!bartender || !selectedClubId) {
      return
    }

    // Check if anything changed
    const clubChanged = selectedClubId !== bartender.club_id
    const statusChanged = isActive !== bartender.is_active

    if (!clubChanged && !statusChanged) {
      onOpenChange(false)
      return
    }

    setIsSaving(true)
    try {
      // Update club if changed
      if (clubChanged) {
        await bartendersApi.updateClub(bartender.id, selectedClubId)
      }
      
      // Update status if changed
      if (statusChanged) {
        await bartendersApi.updateStatus(bartender.id, isActive)
      }

      const changes = []
      if (clubChanged) changes.push('club')
      if (statusChanged) changes.push('status')
      
      toast({
        title: 'Success!',
        description: `Bartender ${changes.join(' and ')} updated`,
      })
      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to update bartender',
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!bartender) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Bartender</DialogTitle>
          <DialogDescription>
            Update bartender's club association and status
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody>
            <div className="space-y-4">
              {/* Bartender Info */}
              <div className="p-3 rounded-lg border border-border/40 bg-card/30">
                <div className="text-sm font-medium">{bartender.user_name || 'N/A'}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {bartender.user_email || 'No email'}
                </div>
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

              {/* Status Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-card/30">
                <div className="space-y-0.5">
                  <Label htmlFor="status" className="text-sm font-medium">Status</Label>
                  <p className="text-xs text-muted-foreground">
                    {isActive ? 'Bartender is active and can access orders' : 'Bartender is inactive'}
                  </p>
                </div>
                <Toggle
                  id="status"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  disabled={isSaving}
                />
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <SaveButton
              type="submit"
              isLoading={isSaving}
              disabled={isSaving || isLoadingClubs || (selectedClubId === bartender.club_id && isActive === bartender.is_active)}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

