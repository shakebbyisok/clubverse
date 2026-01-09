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
import { Loader2, Save, Wine, PenLine, Wand2, GlassWater, Martini, Beer, Tag, ImagePlus, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { drinksApi } from '@/lib/api/drinks'
import { apiClient } from '@/lib/api/client'
import { smartDrinksApi, SmartParseResponse } from '@/lib/api/smart-drinks'
import { clubsApi } from '@/lib/api/clubs'
import { categoriesApi, Category } from '@/lib/api/categories'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { CategorySelect } from '@/components/common/category-select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { migrateImagePath, resolveImageUrl } from '@/lib/utils/image-path'

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
  const [activeTab, setActiveTab] = useState<'smart' | 'manual'>('smart')
  
  // Smart add states
  const [inputText, setInputText] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [smartParsedData, setSmartParsedData] = useState<SmartParseResponse | null>(null)
  
  // Manual add states
  const [manualForm, setManualForm] = useState({
    name: '',
    price: '',
    category_id: null as string | null,
    image_url: null as string | null,
  })
  const [isManualSaving, setIsManualSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  
  // Shared states
  const [clubId, setClubId] = useState<string | null>(null)
  const [systemCategories, setSystemCategories] = useState<Category[]>([])
  const [customCategories, setCustomCategories] = useState<Category[]>([])

  // Get club ID and data when modal opens
  useEffect(() => {
    if (open) {
      clubsApi.getMyClub().then(club => {
        if (club?.id) {
          setClubId(club.id)
          // Fetch categories
          categoriesApi.getClubCategories(club.id).then(tree => {
            setSystemCategories(tree.system_categories)
            setCustomCategories(tree.custom_categories)
          }).catch(() => {})
        }
      }).catch(() => {})
    } else {
      // Reset when modal closes
      resetAll()
    }
  }, [open])

  const resetAll = () => {
    setInputText('')
    setSmartParsedData(null)
    setClubId(null)
    setSystemCategories([])
    setCustomCategories([])
    resetManualForm()
  }

  const resetManualForm = () => {
    setManualForm({
      name: '',
      price: '',
      category_id: null,
      image_url: null,
    })
    setImagePreview(null)
  }

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !clubId) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      toast({ variant: 'destructive', title: 'Invalid file type', description: 'Please upload a JPG, PNG, GIF, or WebP image' })
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'File too large', description: 'Maximum file size is 5MB' })
      return
    }

    // Show preview immediately
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)

    // Upload to server
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await apiClient.post(`/uploads/image?club_id=${clubId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      const imageUrl = response.data.url
      setManualForm(prev => ({ ...prev, image_url: imageUrl }))
      toast({ title: 'Image uploaded' })
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Upload failed', description: error.response?.data?.detail || 'Failed to upload image' })
      setImagePreview(null)
    } finally {
      setIsUploading(false)
    }
  }

  const removeImage = () => {
    setManualForm(prev => ({ ...prev, image_url: null }))
    setImagePreview(null)
  }

  // Smart parse
  const handleSmartParse = async () => {
    if (!inputText.trim() || !clubId) return

    setIsParsing(true)
    try {
      const response = await smartDrinksApi.parse(clubId, inputText)
      setSmartParsedData(response)
      
      const totalItems = response.liquors.length + response.sodas.length + 
                        response.cocktails.length + response.drinks.length
      
      if (totalItems === 0) {
        toast({
          variant: 'destructive',
          title: 'No items found',
          description: 'Could not parse any items from your input.',
        })
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to parse',
      })
    } finally {
      setIsParsing(false)
    }
  }

  // Smart save
  const handleSmartSave = async () => {
    if (!smartParsedData || !clubId) return

    setIsSaving(true)
    try {
      const result = await smartDrinksApi.save(clubId, {
        liquors: smartParsedData.liquors,
        sodas: smartParsedData.sodas,
        cocktails: smartParsedData.cocktails,
        drinks: smartParsedData.drinks,
        category: smartParsedData.category,
      })
      
      const parts = []
      if (result.liquors_created > 0) parts.push(`${result.liquors_created} liquors`)
      if (result.shots_created > 0) parts.push(`${result.shots_created} shots`)
      if (result.sodas_created > 0) parts.push(`${result.sodas_created} sodas`)
      if (result.cocktails_created > 0) parts.push(`${result.cocktails_created} cocktails`)
      if (result.drinks_created > 0) parts.push(`${result.drinks_created} drinks`)
      if (result.category_created) parts.push(`category "${result.category_name}"`)
      
      toast({
        title: 'Success!',
        description: `Created ${parts.join(', ')}`,
      })
      
      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to save',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Manual save
  const handleManualSave = async () => {
    if (!clubId || !manualForm.name.trim()) return
    
    setIsManualSaving(true)
    try {
      await drinksApi.batchCreate(clubId, [{
        name: manualForm.name,
        price: parseFloat(manualForm.price) || 0,
        category_id: manualForm.category_id,
        logo_url: manualForm.image_url,
      }])
      toast({ title: 'Drink created', description: `${manualForm.name} added` })
      
      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to create',
      })
    } finally {
      setIsManualSaving(false)
    }
  }

  const handleClose = () => {
    resetAll()
    onOpenChange(false)
  }

  const totalSmartItems = smartParsedData 
    ? smartParsedData.liquors.length + smartParsedData.sodas.length + 
      smartParsedData.cocktails.length + smartParsedData.drinks.length
    : 0

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl h-[60vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Add Items</DialogTitle>
          <DialogDescription>
            Use AI to add multiple items, or manually create one at a time.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'smart' | 'manual')} className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="px-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="smart" className="gap-2">
                <Wand2 className="h-4 w-4" />
                Smart Add
              </TabsTrigger>
              <TabsTrigger value="manual" className="gap-2">
                <PenLine className="h-4 w-4" />
                Manual
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Smart Tab */}
          <TabsContent value="smart" className="flex-1 flex flex-col px-6 pb-4 mt-4">
            {!smartParsedData ? (
              <div className="flex-1 flex flex-col">
                <Label className="mb-1.5">Enter your items</Label>
                <Textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Examples:
• Absolut $8, Beefeater $9, Havana Club $8
• Coca-Cola $3, Red Bull $4, Tonic $2
• Gin Tonic $10, Vodka Red Bull $12
• Heineken $5, Corona $6
• ...under Premium Cocktails (creates category)`}
                  style={{ height: 'calc(60vh - 240px)' }}
                  className="resize-none mb-4"
                />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-4">
                {/* Summary */}
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm font-medium text-primary">{smartParsedData.summary}</p>
                </div>

                {/* New Category */}
                {smartParsedData.category?.is_new && (
                  <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                        New category: &quot;{smartParsedData.category.name}&quot;
                      </span>
                    </div>
                  </div>
                )}

                {/* Liquors */}
                {smartParsedData.liquors.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Wine className="h-4 w-4" />
                      Liquors ({smartParsedData.liquors.length})
                      <span className="text-xs text-muted-foreground">+ auto-shots</span>
                    </h4>
                    <div className="grid gap-2">
                      {smartParsedData.liquors.map((liq, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2">
                            {liq.image_url && (
                              <img src={migrateImagePath(liq.image_url) || liq.image_url} alt={liq.name} className="w-6 h-6 object-contain" />
                            )}
                            <span className="text-sm font-medium">{liq.name}</span>
                            <Badge variant="secondary" className="text-xs">{liq.liquor_type}</Badge>
                            {!liq.is_new && <Badge variant="outline" className="text-xs">exists</Badge>}
                          </div>
                          <span className="text-sm">${liq.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sodas */}
                {smartParsedData.sodas.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <GlassWater className="h-4 w-4" />
                      Sodas ({smartParsedData.sodas.length})
                    </h4>
                    <div className="grid gap-2">
                      {smartParsedData.sodas.map((soda, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2">
                            {soda.image_url && (
                              <img src={migrateImagePath(soda.image_url) || soda.image_url} alt={soda.name} className="w-6 h-6 object-contain" />
                            )}
                            <span className="text-sm font-medium">{soda.name}</span>
                            {!soda.is_new && <Badge variant="outline" className="text-xs">exists</Badge>}
                          </div>
                          <div className="text-sm text-right">
                            {soda.price > 0 && <span>${soda.price.toFixed(2)}</span>}
                            {soda.price_addon > 0 && (
                              <span className="text-amber-600 ml-2">(+${soda.price_addon.toFixed(2)} mix)</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cocktails */}
                {smartParsedData.cocktails.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Martini className="h-4 w-4" />
                      Cocktails ({smartParsedData.cocktails.length})
                    </h4>
                    <div className="grid gap-2">
                      {smartParsedData.cocktails.map((cocktail, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{cocktail.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {cocktail.liquor_name} + {cocktail.soda_name}
                              {!cocktail.liquor_exists && <span className="text-amber-600"> (new liquor)</span>}
                              {!cocktail.soda_exists && <span className="text-amber-600"> (new soda)</span>}
                            </span>
                          </div>
                          <span className="text-sm font-medium">${cocktail.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Other Drinks */}
                {smartParsedData.drinks.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Beer className="h-4 w-4" />
                      Other Drinks ({smartParsedData.drinks.length})
                    </h4>
                    <div className="grid gap-2">
                      {smartParsedData.drinks.map((drink, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2">
                            {drink.image_url && (
                              <img src={migrateImagePath(drink.image_url) || drink.image_url} alt={drink.name} className="w-6 h-6 object-contain" />
                            )}
                            <span className="text-sm font-medium">{drink.name}</span>
                            <Badge variant="secondary" className="text-xs">{drink.category}</Badge>
                          </div>
                          <span className="text-sm">${drink.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Manual Tab */}
          <TabsContent value="manual" className="flex-1 overflow-y-auto px-6 pb-4 mt-4 min-h-0">
            <div className="flex gap-6">
              {/* Image Upload - Left Side */}
              <div className="flex-shrink-0">
                <Label className="mb-1.5 block">Image</Label>
                <div className="relative">
                  {imagePreview || manualForm.image_url ? (
                    <div className="relative w-28 h-28 rounded-lg border-2 border-dashed border-border overflow-hidden group">
                      <img 
                        src={imagePreview || resolveImageUrl(manualForm.image_url) || ''} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute top-1 right-1 p-1 bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      {isUploading && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                          <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <label className="w-28 h-28 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={isUploading}
                      />
                      {isUploading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <ImagePlus className="h-6 w-6 text-muted-foreground mb-1" />
                          <span className="text-xs text-muted-foreground">Upload</span>
                        </>
                      )}
                    </label>
                  )}
                </div>
              </div>

              {/* Form Fields - Right Side */}
              <div className="flex-1 space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    placeholder="e.g. Heineken, Mojito, Absolut Vodka"
                    value={manualForm.name}
                    onChange={(e) => setManualForm(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label>Price ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={manualForm.price}
                    onChange={(e) => setManualForm(prev => ({ ...prev, price: e.target.value }))}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label>Category</Label>
                  <CategorySelect
                    value={manualForm.category_id}
                    onValueChange={(v) => setManualForm(prev => ({ ...prev, category_id: v }))}
                    systemCategories={systemCategories}
                    customCategories={customCategories}
                    placeholder="Select category..."
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={isParsing || isSaving || isManualSaving}>
            Cancel
          </Button>
          {activeTab === 'smart' ? (
            <Button
              onClick={smartParsedData ? handleSmartSave : handleSmartParse}
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
              ) : smartParsedData && totalSmartItems > 0 ? (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Save All ({totalSmartItems})
                </>
              ) : (
                'Parse with AI'
              )}
            </Button>
          ) : (
            <Button
              onClick={handleManualSave}
              disabled={isManualSaving || !manualForm.name.trim()}
            >
              {isManualSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Drink
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
