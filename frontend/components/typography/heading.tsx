import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const headingVariants = cva('font-semibold tracking-tight', {
  variants: {
    level: {
      h1: 'text-4xl lg:text-5xl',
      h2: 'text-3xl lg:text-4xl',
      h3: 'text-2xl lg:text-3xl',
      h4: 'text-xl lg:text-2xl',
      h5: 'text-lg lg:text-xl',
      h6: 'text-base lg:text-lg',
    },
  },
  defaultVariants: {
    level: 'h1',
  },
})

export interface HeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingVariants> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
}

/**
 * Reusable Heading Component
 * 
 * @example
 * <Heading level="h1">Welcome</Heading>
 * <Heading level="h2" as="h3">Subtitle</Heading>
 */
export const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, level = 'h1', as, ...props }, ref) => {
    const Component = as || level
    return (
      <Component
        ref={ref}
        className={cn(headingVariants({ level }), className)}
        {...props}
      />
    )
  }
)
Heading.displayName = 'Heading'

