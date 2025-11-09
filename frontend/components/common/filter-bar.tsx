'use client'

import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Filter, Download, Columns2 } from 'lucide-react'

export interface FilterButton {
  id: string
  label: string
  icon?: ReactNode
  onClick?: () => void
  active?: boolean
}

interface FilterBarProps {
  filters: FilterButton[]
  actions?: Array<{
    label: string
    icon?: ReactNode
    onClick: () => void
  }>
  className?: string
}

export function FilterBar({
  filters,
  actions = [],
  className,
}: FilterBarProps) {
  return (
    <div className={cn('flex items-center justify-between gap-4 py-2', className)}>
      {/* Filter Buttons */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
        {filters.map((filter) => (
          <Button
            key={filter.id}
            variant="ghost"
            size="sm"
            onClick={filter.onClick}
            className={cn(
              'h-8 px-3 rounded-full text-xs font-medium',
              'hover:bg-accent/50',
              filter.active
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {filter.icon && <span className="mr-1.5">{filter.icon}</span>}
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Action Buttons */}
      {actions.length > 0 && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions.map((action, idx) => (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              onClick={action.onClick}
              className="h-8 px-3 text-xs gap-1.5"
            >
              {action.icon && <span>{action.icon}</span>}
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

