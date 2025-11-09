import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
  helperText?: string
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, helperText, ...props }, ref) => {
    return (
      <div className="w-full">
        <textarea
          className={cn(
            'flex min-h-[80px] w-full bg-background px-4 py-2 text-sm font-medium transition-all rounded-[var(--radius)] resize-none',
            'border placeholder:text-muted-foreground/60',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error
              ? 'border-destructive/50 hover:border-destructive/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive/15 focus-visible:border-destructive/60'
              : 'border-border/30 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/15 focus-visible:border-primary/60',
            className
          )}
          ref={ref}
          {...props}
        />
        {helperText && (
          <p className={cn(
            'mt-1.5 text-xs',
            error ? 'text-destructive' : 'text-muted-foreground'
          )}>
            {helperText}
          </p>
        )}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }

