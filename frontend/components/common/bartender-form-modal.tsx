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
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { BartenderCreate } from '@/types'
import { bartendersApi } from '@/lib/api/bartenders'

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
  const [formData, setFormData] = useState<BartenderCreate>({
    club_id: clubId,
    email: '',
    password: '',
    full_name: '',
  })

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setFormData({
        club_id: clubId,
        email: '',
        password: '',
        full_name: '',
      })
    }
  }, [open, clubId])

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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Bartender</DialogTitle>
          <DialogDescription>
            Create a new bartender account for this club. They will be able to log in and manage orders.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
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
          </div>
          <DialogFooter>
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

