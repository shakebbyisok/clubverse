'use client'

import { useState, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { categoriesApi, Category } from '@/lib/api/categories'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CategorySelectorProps {
  clubId: string
  value?: string | null
  onChange: (categoryId: string | null, category: Category | null) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

/**
 * Reusable category selector component.
 * Shows both system (predefined) and custom (club-specific) categories.
 */
export function CategorySelector({
  clubId,
  value,
  onChange,
  placeholder = 'Select category',
  className,
  disabled = false,
}: CategorySelectorProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [systemCategories, setSystemCategories] = useState<Category[]>([])
  const [customCategories, setCustomCategories] = useState<Category[]>([])
  const [error, setError] = useState<string | null>(null)

  // Fetch categories when clubId changes
  useEffect(() => {
    if (!clubId) return

    const fetchCategories = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const tree = await categoriesApi.getClubCategories(clubId)
        setSystemCategories(tree.system_categories)
        setCustomCategories(tree.custom_categories)
      } catch (err) {
        console.error('Failed to fetch categories:', err)
        setError('Failed to load categories')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCategories()
  }, [clubId])

  // Find selected category for display
  const selectedCategory = [...systemCategories, ...customCategories].find(
    (cat) => cat.id === value
  )

  const handleValueChange = (newValue: string) => {
    if (newValue === '__none__') {
      onChange(null, null)
    } else {
      const category = [...systemCategories, ...customCategories].find(
        (cat) => cat.id === newValue
      )
      onChange(newValue, category || null)
    }
  }

  if (isLoading) {
    return (
      <div
        className={cn(
          'flex items-center justify-center h-9 border border-input rounded-md bg-background',
          className
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div
        className={cn(
          'flex items-center px-3 h-9 border border-destructive/50 rounded-md bg-destructive/5 text-destructive text-sm',
          className
        )}
      >
        {error}
      </div>
    )
  }

  const hasCategories = systemCategories.length > 0 || customCategories.length > 0

  return (
    <Select
      value={value || '__none__'}
      onValueChange={handleValueChange}
      disabled={disabled || !hasCategories}
    >
      <SelectTrigger className={cn('w-full', className)}>
        <SelectValue placeholder={placeholder}>
          {selectedCategory?.name || placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {/* No category option */}
        <SelectItem value="__none__">
          <span className="text-muted-foreground">No category</span>
        </SelectItem>

        {/* System categories */}
        {systemCategories.length > 0 && (
          <>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
                Standard Categories
              </SelectLabel>
              {systemCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </>
        )}

        {/* Custom categories - only show if user has created some */}
        {customCategories.length > 0 && (
          <>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
                Your Custom Categories
              </SelectLabel>
              {customCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <span className="flex items-center gap-1.5">
                    <span className="text-[10px] text-primary/60">●</span>
                    {cat.name}
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          </>
        )}

        {!hasCategories && (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No categories available
          </div>
        )}
      </SelectContent>
    </Select>
  )
}
