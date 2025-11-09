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
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Save, Wine, Sparkles, X, Edit2 } from 'lucide-react'
import { NumberInput } from './number-input'
import { useToast } from '@/hooks/use-toast'
import { drinksApi, DrinkPreview } from '@/lib/api/drinks'
import { clubsApi } from '@/lib/api/clubs'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface AddDrinksModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AddDrinksModal({
  open,
  onOpenChange,
  onSuccess,
}: AddDrinksModalProps) {
  const { toast } = useToast()
  const [inputText, setInputText] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [previewDrinks, setPreviewDrinks] = useState<DrinkPreview[]>([])
  const [clubId, setClubId] = useState<string | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingField, setEditingField] = useState<'name' | 'price' | 'category' | null>(null)

  // Get club ID when modal opens
  useEffect(() => {
    if (open) {
      clubsApi.getMyClub().then(club => {
        if (club?.id) {
          setClubId(club.id)
        }
      }).catch(() => {
        // Handle error silently
      })
    } else {
      // Reset when modal closes
      setInputText('')
      setPreviewDrinks([])
      setClubId(null)
    }
  }, [open])

  const handleParse = async () => {
    if (!inputText.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter some drinks to parse',
      })
      return
    }

    setIsParsing(true)
    try {
      const response = await drinksApi.parsePreview(inputText)
      setPreviewDrinks(response.drinks)
      
      if (response.drinks.length === 0) {
        toast({
          variant: 'destructive',
          title: 'No drinks found',
          description: 'Could not parse any drinks from your input. Try a different format.',
        })
      } else {
        toast({
          title: 'Success!',
          description: `Parsed ${response.drinks.length} ${response.drinks.length === 1 ? 'drink' : 'drinks'}`,
        })
      }
    } catch (error: any) {
      console.error('Failed to parse drinks:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to parse drinks',
      })
    } finally {
      setIsParsing(false)
    }
  }

  const handleSaveAll = async () => {
    if (!clubId || previewDrinks.length === 0) return

    setIsSaving(true)
    try {
      await drinksApi.batchCreate(clubId, previewDrinks)
      
      toast({
        title: 'Success!',
        description: `Added ${previewDrinks.length} ${previewDrinks.length === 1 ? 'drink' : 'drinks'} successfully`,
      })
      
      onSuccess?.()
      onOpenChange(false)
      
      // Reset state
      setInputText('')
      setPreviewDrinks([])
    } catch (error: any) {
      console.error('Failed to save drinks:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to save drinks',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    setInputText('')
    setPreviewDrinks([])
    setEditingIndex(null)
    setEditingField(null)
    onOpenChange(false)
  }

  const handleUpdateDrink = (index: number, field: 'name' | 'price' | 'category', value: string | number) => {
    setPreviewDrinks(prev => {
      const updated = [...prev]
      updated[index] = {
        ...updated[index],
        [field]: field === 'price' ? (typeof value === 'string' ? parseFloat(value) || 0 : value) : value,
      }
      return updated
    })
  }

  const handleRemoveDrink = (index: number) => {
    setPreviewDrinks(prev => prev.filter((_, i) => i !== index))
  }

  const handleRemoveLogo = (index: number) => {
    setPreviewDrinks(prev => {
      const updated = [...prev]
      updated[index] = {
        ...updated[index],
        logo_url: null,
      }
      return updated
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader>
          <DialogTitle>Add Drinks</DialogTitle>
          <DialogDescription>
            Add drinks in natural language (parsed by AI)
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-2">
          {previewDrinks.length > 0 ? (
            /* Preview - Takes all space when available */
            <div className="space-y-2 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <Label>Preview ({previewDrinks.length} {previewDrinks.length === 1 ? 'drink' : 'drinks'})</Label>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto scrollbar-elegant">
                {previewDrinks.map((drink, index) => {
                  const isEditingName = editingIndex === index && editingField === 'name'
                  const isEditingPrice = editingIndex === index && editingField === 'price'
                  const isEditingCategory = editingIndex === index && editingField === 'category'
                  
                  return (
                    <div
                      key={index}
                      className="group relative flex items-start gap-3 p-3 rounded-[var(--radius)] border border-border/40 bg-card/50 hover:bg-card transition-colors"
                    >
                      {/* Remove drink button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveDrink(index)}
                        className="absolute -top-2 -right-2 p-1 bg-background border border-border/40 rounded-full hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>

                      {/* Logo with remove button */}
                      <div className="relative flex-shrink-0">
                        {drink.logo_url ? (
                          <>
                            <img
                              src={drink.logo_url}
                              alt={drink.name}
                              className="w-12 h-12 object-contain rounded-[var(--radius)] bg-background p-1"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveLogo(index)}
                              className="absolute -top-1 -right-1 p-0.5 bg-background border border-border/40 rounded-full hover:bg-destructive hover:border-destructive transition-colors"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </>
                        ) : (
                          <div className="w-12 h-12 rounded-[var(--radius)] bg-muted/50 flex items-center justify-center">
                            <Wine className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      
                      {/* Editable content */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        {/* Name */}
                        <div className="flex items-center gap-2">
                          {isEditingName ? (
                            <Input
                              value={drink.name}
                              onChange={(e) => handleUpdateDrink(index, 'name', e.target.value)}
                              onBlur={() => {
                                setEditingIndex(null)
                                setEditingField(null)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  setEditingIndex(null)
                                  setEditingField(null)
                                }
                              }}
                              className="text-sm h-7 flex-1"
                              autoFocus
                            />
                          ) : (
                            <>
                              <span 
                                className="text-sm font-medium cursor-pointer hover:text-primary transition-colors"
                                onClick={() => {
                                  setEditingIndex(index)
                                  setEditingField('name')
                                }}
                              >
                                {drink.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingIndex(index)
                                  setEditingField('name')
                                }}
                                className="p-0.5 hover:bg-accent rounded transition-colors"
                              >
                                <Edit2 className="h-3 w-3 text-muted-foreground" />
                              </button>
                            </>
                          )}
                          {isEditingCategory ? (
                            <Input
                              value={drink.category || ''}
                              onChange={(e) => handleUpdateDrink(index, 'category', e.target.value)}
                              onBlur={() => {
                                setEditingIndex(null)
                                setEditingField(null)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  setEditingIndex(null)
                                  setEditingField(null)
                                }
                              }}
                              placeholder="Category"
                              className="text-xs h-6 w-24"
                              autoFocus
                            />
                          ) : drink.category ? (
                            <Badge 
                              variant="secondary" 
                              className="text-xs px-1.5 py-0 uppercase cursor-pointer hover:bg-accent transition-colors"
                              onClick={() => {
                                setEditingIndex(index)
                                setEditingField('category')
                              }}
                            >
                              {drink.category}
                            </Badge>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingIndex(index)
                                setEditingField('category')
                              }}
                              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              Add category
                            </button>
                          )}
                          {drink.brand_name && (
                            <Badge variant="outline" className="text-xs px-1.5 py-0">
                              {drink.brand_name}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Price */}
                        <div className="flex items-center gap-2">
                          {isEditingPrice ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">$</span>
                              <NumberInput
                                value={drink.price}
                                onChange={(value) => {
                                  handleUpdateDrink(index, 'price', value)
                                }}
                                min={0}
                                step={0.01}
                                allowDecimals={true}
                                className="flex-shrink-0"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingIndex(null)
                                  setEditingField(null)
                                }}
                                className="h-7 px-2 text-xs"
                              >
                                Done
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span 
                                className="text-sm font-semibold text-muted-foreground cursor-pointer hover:text-primary transition-colors"
                                onClick={() => {
                                  setEditingIndex(index)
                                  setEditingField('price')
                                }}
                              >
                                ${drink.price.toFixed(2)}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingIndex(index)
                                  setEditingField('price')
                                }}
                                className="p-0.5 hover:bg-accent rounded transition-colors"
                              >
                                <Edit2 className="h-3 w-3 text-muted-foreground" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* Input - Only shown when no preview */
            <div className="space-y-4">
              <Textarea
                id="drink-input"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Example:&#10;Heineken $5&#10;Corona Light $4.50&#10;Jack Daniels $8&#10;Mojito $7"
                rows={12}
                className="text-[13px] resize-none min-h-[300px]"
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isParsing || isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={previewDrinks.length > 0 ? handleSaveAll : handleParse}
            disabled={!inputText.trim() || isParsing || isSaving}
            className="gap-1.5"
          >
            {isParsing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Parsing...
              </>
            ) : isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : previewDrinks.length > 0 ? (
              <>
                <Save className="h-3.5 w-3.5" />
                Save ({previewDrinks.length})
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Parse & Preview
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

