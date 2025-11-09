'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ChevronRight, MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

export interface ElegantListItem {
  id: string
  title: string
  subtitle?: string
  description?: string
  badge?: string | number
  icon?: ReactNode
  actions?: Array<{
    label: string
    onClick: () => void
    variant?: 'default' | 'destructive'
  }>
}

interface ElegantListProps {
  items: ElegantListItem[]
  onItemClick?: (item: ElegantListItem) => void
  emptyMessage?: string
  className?: string
  showChevron?: boolean
}

export function ElegantList({
  items,
  onItemClick,
  emptyMessage = 'No items',
  className,
  showChevron = true,
}: ElegantListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {items.map((item) => (
        <div
          key={item.id}
          onClick={() => onItemClick?.(item)}
          className={cn(
            'group relative flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius)]',
            'bg-card/50 border border-border/40',
            'transition-all duration-150',
            'hover:bg-accent/50 hover:border-border/60',
            onItemClick && 'cursor-pointer',
            'active:scale-[0.99]'
          )}
        >
          {/* Icon */}
          {item.icon && (
            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-muted-foreground">
              {item.icon}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground truncate">
                  {item.title}
                </h3>
                {item.badge !== undefined && (
                  <span className="flex-shrink-0 px-1.5 py-0.5 text-xs font-medium rounded-full bg-muted text-muted-foreground">
                    {item.badge}
                  </span>
                )}
              </div>
              {item.subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {item.subtitle}
                </p>
              )}
              {item.description && (
                <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-1">
                  {item.description}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          {item.actions && item.actions.length > 0 && (
            <div className="flex-shrink-0 flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {item.actions.map((action, idx) => (
                    <DropdownMenuItem
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation()
                        action.onClick()
                      }}
                      className={cn(
                        action.variant === 'destructive' && 'text-destructive focus:text-destructive'
                      )}
                    >
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Chevron */}
          {showChevron && onItemClick && (
            <div className="flex-shrink-0">
              <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

