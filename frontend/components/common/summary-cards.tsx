'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface SummaryCard {
  id: string
  label: string
  value: string | number
  icon?: ReactNode
  onClick?: () => void
}

interface SummaryCardsProps {
  cards: SummaryCard[]
  activeCardId?: string
  className?: string
}

export function SummaryCards({
  cards,
  activeCardId,
  className,
}: SummaryCardsProps) {
  return (
    <div className={cn('flex gap-2 overflow-x-auto pb-2 scrollbar-hide', className)}>
      {cards.map((card) => {
        const isActive = card.id === activeCardId
        return (
          <button
            key={card.id}
            onClick={card.onClick}
            className={cn(
              'flex flex-col items-start gap-1 px-4 py-3 rounded-[var(--radius)]',
              'bg-card/50 border transition-all duration-150',
              'hover:bg-accent/30 hover:border-border/60',
              'min-w-[120px] flex-shrink-0',
              isActive
                ? 'border-primary/40 bg-primary/5'
                : 'border-border/40'
            )}
          >
            <div className="flex items-center gap-2 w-full">
              {card.icon && (
                <span className="text-muted-foreground">{card.icon}</span>
              )}
              <span className={cn(
                'text-xs font-medium uppercase tracking-wider',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}>
                {card.label}
              </span>
            </div>
            <span className={cn(
              'text-lg font-semibold',
              isActive ? 'text-foreground' : 'text-foreground/80'
            )}>
              {card.value}
            </span>
          </button>
        )
      })}
    </div>
  )
}

