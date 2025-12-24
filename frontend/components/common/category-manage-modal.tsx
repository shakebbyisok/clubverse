'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Plus, Trash2, Tag, Pencil, Check, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { categoriesApi, Category } from '@/lib/api/categories'
import { ConfirmDialog } from './confirm-dialog'

interface CategoryManageModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clubId: string
  onCategoriesChanged?: () => void
}

export function CategoryManageModal({
  open,
  onOpenChange,
  clubId,
  onCategoriesChanged,
}: CategoryManageModalProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [systemCategories, setSystemCategories] = useState<Category[]>([])
  const [customCategories, setCustomCategories] = useState<Category[]>([])
  
  // New category form
  const [newCategoryName, setNewCategoryName] = useState('')
  
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  
  // Delete state
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Load categories
  useEffect(() => {
    if (open && clubId) {
      loadCategories()
    }
  }, [open, clubId])

  const loadCategories = async () => {
    setIsLoading(true)
    try {
      const tree = await categoriesApi.getClubCategories(clubId)
      setSystemCategories(tree.system_categories)
      setCustomCategories(tree.custom_categories)
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load categories',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter a category name',
      })
      return
    }

    // Check for duplicates
    const allNames = [...systemCategories, ...customCategories].map(c => c.name.toLowerCase())
    if (allNames.includes(newCategoryName.trim().toLowerCase())) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'A category with this name already exists',
      })
      return
    }

    setIsSaving(true)
    try {
      await categoriesApi.createCategory(clubId, {
        name: newCategoryName.trim(),
      })
      
      toast({
        title: 'Success!',
        description: `Category "${newCategoryName.trim()}" created`,
      })
      
      setNewCategoryName('')
      await loadCategories()
      onCategoriesChanged?.()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to create category',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const startEditing = (cat: Category) => {
    setEditingId(cat.id)
    setEditingName(cat.name)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingName('')
  }

  const handleUpdateCategory = async () => {
    if (!editingId || !editingName.trim()) return

    // Check for duplicates (excluding current)
    const allNames = [...systemCategories, ...customCategories]
      .filter(c => c.id !== editingId)
      .map(c => c.name.toLowerCase())
    
    if (allNames.includes(editingName.trim().toLowerCase())) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'A category with this name already exists',
      })
      return
    }

    setIsUpdating(true)
    try {
      await categoriesApi.updateCategory(editingId, {
        name: editingName.trim(),
      })
      
      toast({
        title: 'Success!',
        description: 'Category updated',
      })
      
      cancelEditing()
      await loadCategories()
      onCategoriesChanged?.()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to update category',
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return

    setIsDeleting(true)
    try {
      await categoriesApi.deleteCategory(deletingCategory.id)
      
      toast({
        title: 'Success!',
        description: `Category "${deletingCategory.name}" deleted`,
      })
      
      setDeletingCategory(null)
      await loadCategories()
      onCategoriesChanged?.()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to delete category',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Categories</DialogTitle>
            <DialogDescription>
              Create custom categories for your drinks. Standard categories are available to all clubs.
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Add new category */}
                <div className="space-y-2">
                  <Label>Add Custom Category</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="e.g., Premium Whisky, Energy Drinks..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddCategory()
                        }
                      }}
                    />
                    <Button
                      onClick={handleAddCategory}
                      disabled={isSaving || !newCategoryName.trim()}
                      size="sm"
                      className="gap-1.5 px-3"
                    >
                      {isSaving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      Add
                    </Button>
                  </div>
                </div>

                {/* Custom categories list */}
                {customCategories.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs uppercase tracking-wide">
                      Your Custom Categories
                    </Label>
                    <div className="space-y-1">
                      {customCategories.map((cat) => (
                        <div
                          key={cat.id}
                          className="flex items-center justify-between p-2 rounded-md border border-border/40 bg-card/30"
                        >
                          {editingId === cat.id ? (
                            // Edit mode
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="h-7 text-sm"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    handleUpdateCategory()
                                  } else if (e.key === 'Escape') {
                                    cancelEditing()
                                  }
                                }}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-100/10"
                                onClick={handleUpdateCategory}
                                disabled={isUpdating || !editingName.trim()}
                              >
                                {isUpdating ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                onClick={cancelEditing}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            // View mode
                            <>
                              <div className="flex items-center gap-2">
                                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-sm">{cat.name}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                  onClick={() => startEditing(cat)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                  onClick={() => setDeletingCategory(cat)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Standard categories (read-only) */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wide">
                    Standard Categories
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {systemCategories.map((cat) => (
                      <span
                        key={cat.id}
                        className="px-2 py-1 text-xs rounded-md bg-muted/50 text-muted-foreground"
                      >
                        {cat.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </DialogBody>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deletingCategory}
        onOpenChange={(open) => !open && setDeletingCategory(null)}
        title="Delete Category"
        description={
          <>
            Are you sure you want to delete <span className="font-medium text-foreground">{deletingCategory?.name}</span>? 
            Drinks using this category will become uncategorized.
          </>
        }
        confirmLabel="Delete"
        onConfirm={handleDeleteCategory}
        isLoading={isDeleting}
        variant="destructive"
      />
    </>
  )
}
