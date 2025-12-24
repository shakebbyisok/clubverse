'use client'

import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Category } from '@/lib/api/categories'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

interface CategorySelectProps {
  value: string | null
  onValueChange: (value: string | null) => void
  systemCategories: Category[]
  customCategories: Category[]
  placeholder?: string
  className?: string
  disabled?: boolean
  isLoading?: boolean
  displayCategoryName?: string | null // For displaying legacy category when category_id is null
}

export function CategorySelect({
  value,
  onValueChange,
  systemCategories,
  customCategories,
  placeholder = 'Select category',
  className,
  disabled = false,
  isLoading = false,
  displayCategoryName,
}: CategorySelectProps) {
  const [open, setOpen] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<'standard' | 'custom'>('standard')

  const allCategories = [...systemCategories, ...customCategories]
  const selectedCategory = allCategories.find(cat => cat.id === value)
  
  // Use selectedCategory name if found, otherwise use displayCategoryName, otherwise null
  // This ensures we show the category name even if the category list hasn't loaded yet
  const displayName = selectedCategory?.name || displayCategoryName || null

  const handleSelect = (categoryId: string) => {
    onValueChange(categoryId)
    setOpen(false)
  }

  const handleNone = () => {
    onValueChange(null)
    setOpen(false)
  }

  // Auto-select tab based on selected category
  React.useEffect(() => {
    if (value && selectedCategory) {
      setActiveTab(selectedCategory.is_system ? 'standard' : 'custom')
    } else if (!value && displayCategoryName) {
      // If we have a display name but no category_id, try to find matching category
      const matchingCategory = allCategories.find(c => 
        c.name.toLowerCase() === displayCategoryName.toLowerCase()
      )
      if (matchingCategory) {
        setActiveTab(matchingCategory.is_system ? 'standard' : 'custom')
      }
    }
  }, [value, selectedCategory, displayCategoryName, allCategories])

  return (
    <SelectPrimitive.Root open={open} onOpenChange={setOpen} disabled={disabled || isLoading}>
      <SelectPrimitive.Trigger
        className={cn(
          'flex h-7 w-full items-center justify-between bg-background px-3 py-1.5 text-xs font-medium transition-all rounded-md border border-dashed relative',
          'border-border/30 hover:border-primary/40',
          'focus:outline-none focus:ring-1 focus:ring-primary/15 focus:border-primary/60',
          'data-[state=open]:border-primary/60 data-[state=open]:ring-1 data-[state=open]:ring-primary/15',
          'disabled:cursor-not-allowed disabled:opacity-50',
          isLoading && 'ring-2 ring-primary/50 animate-pulse',
          className
        )}
      >
        {/* Render display directly instead of using SelectPrimitive.Value which doesn't work with custom buttons */}
        <span className={cn('truncate flex-1 text-left', !displayName && 'text-muted-foreground')}>
          {isLoading ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              <span>Updating...</span>
            </span>
          ) : (
            displayName || placeholder
          )}
        </span>
        {!isLoading && <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0 ml-2" />}
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="relative z-50 min-w-[200px] overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-md"
          position="popper"
          sideOffset={4}
        >
          <div className="p-1">
            {/* Tabs for Standard vs Custom */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'standard' | 'custom')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-8 mb-1 p-0.5 gap-0.5">
                <TabsTrigger 
                  value="standard" 
                  className="text-[11px] px-2 h-7 data-[state=active]:bg-background data-[state=active]:shadow-none"
                >
                  Standard
                </TabsTrigger>
                <TabsTrigger 
                  value="custom" 
                  className="text-[11px] px-2 h-7 data-[state=active]:bg-background data-[state=active]:shadow-none" 
                  disabled={customCategories.length === 0}
                >
                  Custom {customCategories.length > 0 && `(${customCategories.length})`}
                </TabsTrigger>
              </TabsList>

              {/* Standard Categories Tab */}
              <TabsContent value="standard" className="mt-0 p-0">
                <div className="max-h-[200px] overflow-y-auto">
                  {/* No category option */}
                  <div className="px-2 py-1">
                    <button
                      type="button"
                      onClick={handleNone}
                      className={cn(
                        'w-full flex items-center justify-between px-2 py-1.5 rounded-sm text-xs transition-colors',
                        'hover:bg-accent hover:text-accent-foreground',
                        !value && 'bg-accent text-accent-foreground'
                      )}
                    >
                      <span className="text-muted-foreground">No category</span>
                      {!value && <Check className="h-3.5 w-3.5 text-primary" />}
                    </button>
                  </div>
                  
                  {systemCategories.length === 0 ? (
                    <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                      No standard categories
                    </div>
                  ) : (
                    <div className="py-1">
                      {systemCategories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleSelect(cat.id)}
                          className={cn(
                            'w-full flex items-center justify-between px-2 py-1.5 rounded-sm text-xs transition-colors',
                            'hover:bg-accent hover:text-accent-foreground',
                            value === cat.id && 'bg-accent text-accent-foreground'
                          )}
                        >
                          <span>{cat.name}</span>
                          {value === cat.id && <Check className="h-3.5 w-3.5 text-primary" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Custom Categories Tab */}
              <TabsContent value="custom" className="mt-0 p-0">
                <div className="max-h-[200px] overflow-y-auto">
                  {/* No category option */}
                  <div className="px-2 py-1">
                    <button
                      type="button"
                      onClick={handleNone}
                      className={cn(
                        'w-full flex items-center justify-between px-2 py-1.5 rounded-sm text-xs transition-colors',
                        'hover:bg-accent hover:text-accent-foreground',
                        !value && 'bg-accent text-accent-foreground'
                      )}
                    >
                      <span className="text-muted-foreground">No category</span>
                      {!value && <Check className="h-3.5 w-3.5 text-primary" />}
                    </button>
                  </div>
                  
                  {customCategories.length === 0 ? (
                    <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                      No custom categories yet
                    </div>
                  ) : (
                    <div className="py-1">
                      {customCategories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleSelect(cat.id)}
                          className={cn(
                            'w-full flex items-center justify-between px-2 py-1.5 rounded-sm text-xs transition-colors',
                            'hover:bg-accent hover:text-accent-foreground',
                            value === cat.id && 'bg-accent text-accent-foreground'
                          )}
                        >
                          <span>{cat.name}</span>
                          {value === cat.id && <Check className="h-3.5 w-3.5 text-primary" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}

