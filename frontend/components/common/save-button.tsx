'use client'

import { forwardRef } from 'react'
import { Loader2, Check } from 'lucide-react'
import { Button, ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SaveButtonProps extends Omit<ButtonProps, 'children'> {
  isLoading?: boolean
  loadingText?: string
  children?: React.ReactNode
}

/**
 * Reusable save button with consistent green styling and loading state.
 */
export const SaveButton = forwardRef<HTMLButtonElement, SaveButtonProps>(
  ({ 
    isLoading = false, 
    loadingText = 'Saving', 
    children = 'Save Changes',
    className,
    disabled,
    ...props 
  }, ref) => {
    return (
      <Button
        ref={ref}
        disabled={disabled || isLoading}
        size="sm"
        className={cn(
          'h-9 px-4 bg-emerald-600 text-white hover:bg-emerald-500 border-0 transition-colors',
          'disabled:bg-emerald-600/50 disabled:text-white/70',
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            {loadingText}
          </>
        ) : (
          <>
            <Check className="mr-1.5 h-3.5 w-3.5" />
            {children}
          </>
        )}
      </Button>
    )
  }
)

SaveButton.displayName = 'SaveButton'

