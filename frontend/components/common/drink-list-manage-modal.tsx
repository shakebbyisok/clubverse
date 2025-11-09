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
import { Loader2, Plus, X, Wine, Search } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { DrinkList, DrinkListWithDrinks, Drink } from '@/types'
import { drinkListsApi } from '@/lib/api/drink-lists'
import { drinksApi } from '@/lib/api/drinks'
import { clubsApi } from '@/lib/api/clubs'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'

interface DrinkListManageModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  drinkList: DrinkList | null
  onSuccess?: () => void
}

export function DrinkListManageModal({
  open,
  onOpenChange,
  drinkList,
  onSuccess,
}: DrinkListManageModalProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [listWithDrinks, setListWithDrinks] = useState<DrinkListWithDrinks | null>(null)
  const [availableDrinks, setAvailableDrinks] = useState<Drink[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDrinkIds, setSelectedDrinkIds] = useState<Set<string>>(new Set())
  const [clubId, setClubId] = useState<string | null>(null)

  // Fetch list details and available drinks when modal opens
  useEffect(() => {
    if (open && drinkList) {
      const fetchData = async () => {
        setIsLoading(true)
        try {
          // Get club ID
          const club = await clubsApi.getMyClub()
          if (club?.id) {
            setClubId(club.id)
            
            // Fetch list with drinks
            const listDetails = await drinkListsApi.getById(drinkList.id)
            setListWithDrinks(listDetails)
            
            // Fetch all club drinks
            const drinks = await drinksApi.getClubDrinks(club.id)
            setAvailableDrinks(drinks)
            
            // Pre-select drinks already in the list
            const existingIds = new Set(listDetails.drinks.map(d => d.id))
            setSelectedDrinkIds(existingIds)
          }
        } catch (error: any) {
          console.error('Failed to fetch data:', error)
          toast({
            variant: 'destructive',
            title: 'Error',
            description: error.response?.data?.detail || 'Failed to load drink list',
          })
        } finally {
          setIsLoading(false)
        }
      }
      
      fetchData()
    } else {
      // Reset state when modal closes
      setListWithDrinks(null)
      setAvailableDrinks([])
      setSearchQuery('')
      setSelectedDrinkIds(new Set())
      setClubId(null)
    }
  }, [open, drinkList, toast])

  // Filter drinks based on search
  const filteredDrinks = availableDrinks.filter(drink => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      drink.name.toLowerCase().includes(query) ||
      drink.category?.toLowerCase().includes(query) ||
      drink.description?.toLowerCase().includes(query)
    )
  })

  // Toggle drink selection
  const toggleDrinkSelection = (drinkId: string) => {
    setSelectedDrinkIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(drinkId)) {
        newSet.delete(drinkId)
      } else {
        newSet.add(drinkId)
      }
      return newSet
    })
  }

  // Handle save
  const handleSave = async () => {
    if (!drinkList || !clubId) return

    setIsSaving(true)
    try {
      await drinkListsApi.update(drinkList.id, {
        drink_ids: Array.from(selectedDrinkIds),
      })
      
      toast({
        title: 'Success!',
        description: 'Drink list updated successfully',
      })
      
      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Failed to update drink list:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to update drink list',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const currentDrinks = listWithDrinks?.drinks || []
  const hasChanges = currentDrinks.length !== selectedDrinkIds.size ||
    !currentDrinks.every(d => selectedDrinkIds.has(d.id))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader>
          <DialogTitle>{drinkList?.name || 'Manage Drink List'}</DialogTitle>
          <DialogDescription>
            View and manage drinks in this list. Add or remove drinks as needed.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search drinks..."
                className="text-[13px] pl-8"
              />
            </div>

            {/* Current drinks count */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {selectedDrinkIds.size} {selectedDrinkIds.size === 1 ? 'drink' : 'drinks'} selected
              </p>
            </div>

            {/* Drinks list */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-elegant">
              {filteredDrinks.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  {searchQuery ? 'No drinks found matching your search' : 'No drinks available'}
                </div>
              ) : (
                filteredDrinks.map((drink) => {
                  const isSelected = selectedDrinkIds.has(drink.id)
                  return (
                    <div
                      key={drink.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-[var(--radius)] border border-border/40 bg-card/50 transition-colors',
                        isSelected && 'bg-accent/30 border-primary/40'
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleDrinkSelection(drink.id)}
                        className="h-4 w-4"
                      />
                      {drink.image_url ? (
                        <img
                          src={drink.image_url}
                          alt={drink.name}
                          className="w-10 h-10 object-contain rounded-[var(--radius)] bg-background p-1"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-[var(--radius)] bg-muted/50 flex items-center justify-center">
                          <Wine className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{drink.name}</span>
                          {drink.category && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0">
                              {drink.category}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-sm font-semibold">
                            ${parseFloat(drink.price).toFixed(2)}
                          </span>
                          {drink.description && (
                            <span className="text-xs text-muted-foreground truncate">
                              {drink.description}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant={drink.is_available ? 'default' : 'secondary'}
                        className="text-xs px-2 py-0.5"
                      >
                        {drink.is_available ? 'Available' : 'Unavailable'}
                      </Badge>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex-row justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="gap-1.5"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

