'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Loader2, Wine } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Drink } from '@/lib/api/drinks'
import { categoriesApi, Category } from '@/lib/api/categories'
import { SaveButton } from './save-button'
import { CategorySelect } from '@/components/common/category-select'
import { migrateImagePath } from '@/lib/utils/image-path'

interface DrinkEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  drink: Drink | null
  clubId: string
  onSave: (drinkId: string, data: DrinkUpdateData) => Promise<void>
}

export interface DrinkUpdateData {
  name?: string
  description?: string | null
  price?: number
  category?: string | null
  category_id?: string | null
  is_available?: boolean
}

export function DrinkEditModal({
  open,
  onOpenChange,
  drink,
  clubId,
  onSave,
}: DrinkEditModalProps) {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)
  
  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [isAvailable, setIsAvailable] = useState(true)
  
  // Categories
  const [systemCategories, setSystemCategories] = useState<Category[]>([])
  const [customCategories, setCustomCategories] = useState<Category[]>([])

  // Load drink data and categories when modal opens
  useEffect(() => {
    if (open && drink) {
      setName(drink.name)
      setDescription(drink.description || '')
      setPrice(parseFloat(drink.price).toString())
      setCategoryId(drink.category_id || null)
      setIsAvailable(drink.is_available)
      
      // Fetch categories
      setIsLoadingCategories(true)
      categoriesApi.getClubCategories(clubId)
        .then(tree => {
          setSystemCategories(tree.system_categories)
          setCustomCategories(tree.custom_categories)
        })
        .catch(() => {
          // Silently fail
        })
        .finally(() => {
          setIsLoadingCategories(false)
        })
    }
  }, [open, drink, clubId])

  const handleSave = async () => {
    if (!drink) return
    
    // Validate
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Name is required',
      })
      return
    }
    
    const priceNum = parseFloat(price)
    if (isNaN(priceNum) || priceNum < 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter a valid price',
      })
      return
    }

    setIsSaving(true)
    try {
      // Find category name for the selected ID
      const allCategories = [...systemCategories, ...customCategories]
      const selectedCategory = allCategories.find(c => c.id === categoryId)
      
      await onSave(drink.id, {
        name: name.trim(),
        description: description.trim() || null,
        price: priceNum,
        category: selectedCategory?.name || null,
        category_id: categoryId,
        is_available: isAvailable,
      })
      
      toast({
        title: 'Success!',
        description: 'Drink updated successfully',
      })
      
      onOpenChange(false)
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to update drink',
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!drink) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Drink</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* Drink Preview */}
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-card/30">
            {drink.image_url ? (
              <img
                src={migrateImagePath(drink.image_url) || drink.image_url}
                alt={drink.name}
                className="w-12 h-12 object-contain rounded-lg bg-background p-1"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center">
                <Wine className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div>
              <p className="font-medium">{drink.name}</p>
              <p className="text-sm text-muted-foreground">${parseFloat(drink.price).toFixed(2)}</p>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Drink name"
            />
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="pl-7"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            {isLoadingCategories ? (
              <div className="flex items-center justify-center h-10 border border-input rounded-md">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <CategorySelect
                value={categoryId}
                onValueChange={setCategoryId}
                systemCategories={systemCategories}
                customCategories={customCategories}
                placeholder="Select category"
                disabled={isLoadingCategories}
              />
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description..."
              rows={2}
            />
          </div>

          {/* Availability */}
          <div className="flex items-center justify-between">
            <Label htmlFor="available">Available for ordering</Label>
            <Switch
              id="available"
              checked={isAvailable}
              onCheckedChange={setIsAvailable}
            />
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <SaveButton
            onClick={handleSave}
            isLoading={isSaving}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

