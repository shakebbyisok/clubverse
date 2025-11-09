import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export interface EmptyStateProps {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

/**
 * Reusable Empty State Component
 * 
 * @example
 * <EmptyState
 *   title="No clubs found"
 *   description="Get started by creating your first club"
 *   action={{
 *     label: "Create Club",
 *     onClick: () => router.push('/clubs/new')
 *   }}
 * />
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 px-4 text-center',
      className
    )}>
      {icon && (
        <div className="mb-4 text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}

