'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface TruncatedTextProps {
  text: string
  className?: string
  tooltipClassName?: string
  /** Maximum characters to show before truncating */
  maxChars?: number
}

/**
 * Elegant text component that truncates with ellipsis and shows
 * full text in a tooltip on hover.
 */
export function TruncatedText({
  text,
  className,
  tooltipClassName,
  maxChars = 28,
}: TruncatedTextProps) {
  // Check if text needs truncation
  const needsTruncation = text.length > maxChars
  
  // Truncate text - ensure we leave room for the 3 dots
  // Subtract 3 from maxChars to account for the ellipsis
  const displayText = needsTruncation 
    ? text.substring(0, Math.max(0, maxChars - 3)).trim() + '...'
    : text

  // Only wrap in tooltip if text is truncated
  if (!needsTruncation) {
    return (
      <span className={cn('inline-block whitespace-nowrap', className)}>
        {displayText}
      </span>
    )
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span 
            className={cn(
              'inline-block whitespace-nowrap cursor-default',
              className
            )}
          >
            {displayText}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          align="start"
          className={cn(
            'max-w-[320px] z-[100]',
            tooltipClassName
          )}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <p className="text-xs leading-relaxed break-words">{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

