'use client'

import * as React from 'react'
import * as SwitchPrimitives from '@radix-ui/react-switch'
import { cn } from '@/lib/utils'

interface ToggleProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
  label?: string
  description?: string
}

/**
 * Elegant, minimalist toggle switch matching the UI design system.
 * Clean, smooth transitions with subtle borders and backgrounds.
 */
const Toggle = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  ToggleProps
>(({ className, label, description, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-all duration-200',
      'border-border/40 bg-muted/30',
      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:ring-offset-1',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:border-primary/40 data-[state=checked]:bg-primary/10',
      'data-[state=unchecked]:hover:border-border/60',
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        'pointer-events-none block h-3.5 w-3.5 rounded-full transition-all duration-200',
        'bg-background border border-border/40 shadow-sm',
        'data-[state=checked]:translate-x-[18px] data-[state=checked]:border-primary/30 data-[state=checked]:bg-primary',
        'data-[state=unchecked]:translate-x-0.5'
      )}
    />
  </SwitchPrimitives.Root>
))
Toggle.displayName = SwitchPrimitives.Root.displayName

export { Toggle }

