import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const textVariants = cva('', {
  variants: {
    variant: {
      default: 'text-foreground',
      muted: 'text-muted-foreground',
      primary: 'text-primary',
      secondary: 'text-secondary-foreground',
      destructive: 'text-destructive',
      success: 'text-green-600 dark:text-green-400',
    },
    size: {
      xs: 'text-xs',
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
    },
    weight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'base',
    weight: 'normal',
  },
})

export interface TextProps
  extends React.HTMLAttributes<HTMLParagraphElement>,
    VariantProps<typeof textVariants> {
  as?: 'p' | 'span' | 'div' | 'label'
}

/**
 * Reusable Text Component
 * 
 * @example
 * <Text>Default text</Text>
 * <Text variant="muted" size="sm">Small muted text</Text>
 * <Text variant="primary" weight="semibold">Bold primary text</Text>
 */
export const Text = React.forwardRef<HTMLParagraphElement, TextProps>(
  ({ className, variant, size, weight, as = 'p', ...props }, ref) => {
    const Component = as
    return (
      <Component
        ref={ref}
        className={cn(textVariants({ variant, size, weight }), className)}
        {...props}
      />
    )
  }
)
Text.displayName = 'Text'

