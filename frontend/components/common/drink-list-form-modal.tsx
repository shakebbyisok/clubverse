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
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { DrinkList, DrinkListCreate, DrinkListUpdate } from '@/types'
import { ModalActionButton } from './modal-action-button'

interface DrinkListFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  drinkList?: DrinkList | null
  onSuccess?: () => void
}

export function DrinkListFormModal({
  open,
  onOpenChange,
  drinkList,
  onSuccess,
}: DrinkListFormModalProps) {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

  useEffect(() => {
    if (open) {
      if (drinkList) {
        setFormData({
          name: drinkList.name || '',
          description: drinkList.description || '',
        })
      } else {
        setFormData({
          name: '',
          description: '',
        })
      }
    }
  }, [open, drinkList])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'List name is required',
      })
      return
    }

    setIsSaving(true)
    try {
      const { drinkListsApi } = await import('@/lib/api/drink-lists')
      
      if (drinkList) {
        await drinkListsApi.update(drinkList.id, {
          name: formData.name,
          description: formData.description || undefined,
        })
        
        toast({
          title: 'Success!',
          description: 'Drink list updated successfully',
        })
      } else {
        await drinkListsApi.create({
          name: formData.name,
          description: formData.description || undefined,
        })
        
        toast({
          title: 'Success!',
          description: 'Drink list created successfully',
        })
      }
      
      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to save drink list',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg gap-0 p-0">
        <DialogHeader className="pb-2">
          <DialogTitle>{drinkList ? 'Edit Drink List' : 'Create Drink List'}</DialogTitle>
          <DialogDescription>
            {drinkList 
              ? 'Update your drink list information'
              : 'Create a new list to organize your drinks'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="px-4 pb-2 space-y-3">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-medium">List Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Premium Cocktails, Beers, Happy Hour"
              required
              className="text-[13px] h-8"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-medium">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description for this list..."
              rows={3}
              className="text-[13px] resize-none"
            />
          </div>
        </form>

        <DialogFooter className="flex-row justify-between pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            size="sm"
            className="h-8 text-xs"
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
            label={drinkList ? 'Save Changes' : 'Create List'}
            variant="save"
            type="submit"
            size="sm"
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

