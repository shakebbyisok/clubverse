'use client'

import { ReactNode, useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'

export interface Section {
  id: string
  label: string
  icon?: ReactNode
  badge?: string | number
  content: ReactNode
}

interface SectionedLayoutProps {
  sections: Section[]
  defaultSectionId?: string
  className?: string
  header?: ReactNode
  emptyMessage?: string
}

export function SectionedLayout({
  sections,
  defaultSectionId,
  className,
  header,
  emptyMessage = 'No content available',
}: SectionedLayoutProps) {
  const [activeSectionId, setActiveSectionId] = useState<string>(
    defaultSectionId || sections[0]?.id || ''
  )

  const activeSection = sections.find(s => s.id === activeSectionId) || sections[0]

  if (sections.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col lg:flex-row gap-4', className)}>
      {/* Sidebar Navigation - Desktop */}
      <aside className="hidden lg:flex lg:w-56 lg:flex-shrink-0 lg:flex-col">
        <div className="space-y-1">
          {sections.map((section) => {
            const isActive = section.id === activeSectionId
            return (
              <button
                key={section.id}
                onClick={() => setActiveSectionId(section.id)}
                className={cn(
                  'group w-full flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius)]',
                  'text-sm font-medium transition-all duration-150',
                  'hover:bg-accent/50',
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {section.icon && (
                  <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                    {section.icon}
                  </span>
                )}
                <span className="flex-1 text-left truncate">{section.label}</span>
                {section.badge !== undefined && (
                  <span className={cn(
                    'flex-shrink-0 px-1.5 py-0.5 text-xs font-medium rounded-full',
                    isActive
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                  )}>
                    {section.badge}
                  </span>
                )}
                {isActive && (
                  <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
                )}
              </button>
            )
          })}
        </div>
      </aside>

      {/* Mobile Tabs */}
      <div className="lg:hidden">
        <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
          {sections.map((section) => {
            const isActive = section.id === activeSectionId
            return (
              <button
                key={section.id}
                onClick={() => setActiveSectionId(section.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius)] whitespace-nowrap',
                  'text-xs font-medium transition-all duration-150',
                  'hover:bg-accent/50',
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {section.icon && (
                  <span className="w-3.5 h-3.5 flex items-center justify-center">
                    {section.icon}
                  </span>
                )}
                <span>{section.label}</span>
                {section.badge !== undefined && (
                  <span className={cn(
                    'px-1.5 py-0.5 text-xs font-medium rounded-full',
                    isActive
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                  )}>
                    {section.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {header && (
          <div className="mb-4">
            {header}
          </div>
        )}
        <div className="animate-in fade-in-50 duration-200">
          {activeSection?.content || (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">{emptyMessage}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

