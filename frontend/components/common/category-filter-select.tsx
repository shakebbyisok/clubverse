'use client'

import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Category } from '@/lib/api/categories'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

interface CategoryFilterSelectProps {
  value: string
  onValueChange: (value: string) => void
  systemCategories: Category[]
  customCategories: Category[]
  className?: string
  disabled?: boolean
}

export function CategoryFilterSelect({
  value,
  onValueChange,
  systemCategories,
  customCategories,
  className,
  disabled = false,
}: CategoryFilterSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<'standard' | 'custom'>('standard')

  const allCategories = [...systemCategories, ...customCategories]
  const selectedCategory = allCategories.find(cat => cat.id === value)

  const handleSelect = (categoryId: string) => {
    onValueChange(categoryId)
    setOpen(false)
  }

  const handleAll = () => {
    onValueChange('all')
    setOpen(false)
  }

  const handleUncategorized = () => {
    onValueChange('uncategorized')
    setOpen(false)
  }

  // Auto-select tab based on selected category
  React.useEffect(() => {
    if (value && value !== 'all' && value !== 'uncategorized' && selectedCategory) {
      setActiveTab(selectedCategory.is_system ? 'standard' : 'custom')
    }
  }, [value, selectedCategory])

  const displayValue = 
    value === 'all' ? 'All Categories' :
    value === 'uncategorized' ? 'Uncategorized' :
    selectedCategory?.name || 'All Categories'

  return (
    <SelectPrimitive.Root open={open} onOpenChange={setOpen} disabled={disabled}>
      <SelectPrimitive.Trigger
        className={cn(
          'flex h-8 w-[160px] items-center justify-between bg-background px-3 py-1.5 text-xs font-medium transition-all rounded-md border',
          'border-border/30 hover:border-primary/40',
          'focus:outline-none focus:ring-1 focus:ring-primary/15 focus:border-primary/60',
          'data-[state=open]:border-primary/60 data-[state=open]:ring-1 data-[state=open]:ring-primary/15',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <Filter className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="truncate">{displayValue}</span>
        </div>
        <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
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

              {/* Filter options */}
              <div className="px-2 py-1 space-y-0.5">
                <button
                  type="button"
                  onClick={handleAll}
                  className={cn(
                    'w-full flex items-center justify-between px-2 py-1.5 rounded-sm text-xs transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    value === 'all' && 'bg-accent text-accent-foreground'
                  )}
                >
                  <span>All Categories</span>
                  {value === 'all' && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
                <button
                  type="button"
                  onClick={handleUncategorized}
                  className={cn(
                    'w-full flex items-center justify-between px-2 py-1.5 rounded-sm text-xs transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    value === 'uncategorized' && 'bg-accent text-accent-foreground'
                  )}
                >
                  <span className="text-muted-foreground">Uncategorized</span>
                  {value === 'uncategorized' && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              </div>

              {/* Standard Categories Tab */}
              <TabsContent value="standard" className="mt-0 p-0">
                <div className="max-h-[200px] overflow-y-auto">
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

