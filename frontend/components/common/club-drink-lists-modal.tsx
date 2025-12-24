'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { SaveButton } from '@/components/common/save-button'
import { Loader2, Check, List } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { drinkListsApi } from '@/lib/api/drink-lists'
import { clubsApi } from '@/lib/api/clubs'
import { DrinkList } from '@/types'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

interface ClubDrinkListsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clubId: string
  clubName: string
}

export function ClubDrinkListsModal({
  open,
  onOpenChange,
  clubId,
  clubName,
}: ClubDrinkListsModalProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [allDrinkLists, setAllDrinkLists] = useState<DrinkList[]>([])
  const [associatedListIds, setAssociatedListIds] = useState<Set<string>>(new Set())

  // Fetch all drink lists and current associations
  useEffect(() => {
    if (open && clubId) {
      fetchData()
    } else {
      // Reset state when modal closes
      setAllDrinkLists([])
      setAssociatedListIds(new Set())
    }
  }, [open, clubId])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [lists, associatedIds] = await Promise.all([
        drinkListsApi.getAll(),
        clubsApi.getClubDrinkLists(clubId),
      ])
      
      setAllDrinkLists(lists)
      setAssociatedListIds(new Set(associatedIds))
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to load drink lists',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleList = (listId: string) => {
    setAssociatedListIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(listId)) {
        newSet.delete(listId)
      } else {
        newSet.add(listId)
      }
      return newSet
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Fetch current associations to determine what changed
      const currentAssociatedIds = await clubsApi.getClubDrinkLists(clubId)
      const currentSet = new Set(currentAssociatedIds)
      const newSet = associatedListIds

      // Find lists to associate (in new but not in current)
      const toAssociate = Array.from(newSet).filter(id => !currentSet.has(id))
      
      // Find lists to disassociate (in current but not in new)
      const toDisassociate = Array.from(currentSet).filter(id => !newSet.has(id))

      // Perform associations and disassociations in parallel
      await Promise.all([
        ...toAssociate.map(listId => drinkListsApi.associateClub(listId, clubId)),
        ...toDisassociate.map(listId => drinkListsApi.disassociateClub(listId, clubId)),
      ])

      toast({
        title: 'Success!',
        description: 'Drink list associations updated successfully',
      })
      
      onOpenChange(false)
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to update associations',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Drink Lists</DialogTitle>
          <DialogDescription>
            Associate drink lists with <span className="font-medium text-foreground">{clubName}</span>
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : allDrinkLists.length === 0 ? (
            <div className="text-center py-12">
              <List className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No drink lists available. Create one first.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {allDrinkLists.map((list) => {
                const isAssociated = associatedListIds.has(list.id)
                return (
                  <div
                    key={list.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-md border border-border/50 transition-colors',
                      'hover:bg-accent/50 cursor-pointer',
                      isAssociated && 'bg-primary/5 border-primary/30'
                    )}
                    onClick={() => handleToggleList(list.id)}
                  >
                    <Checkbox
                      checked={isAssociated}
                      onCheckedChange={() => handleToggleList(list.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{list.name}</span>
                        {list.drink_count !== undefined && list.drink_count > 0 && (
                          <span className="text-xs text-muted-foreground">
                            ({list.drink_count} {list.drink_count === 1 ? 'drink' : 'drinks'})
                          </span>
                        )}
                      </div>
                      {list.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {list.description}
                        </p>
                      )}
                    </div>
                    {isAssociated && (
                      <div className="flex-shrink-0">
                        <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary" />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </DialogBody>

        <DialogFooter className="border-t border-border/50">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-4"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <SaveButton
            onClick={handleSave}
            isLoading={isSaving}
            disabled={isLoading}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

