'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Building2, Plus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ClubLogo } from './club-logo'
import { TruncatedText } from './truncated-text'
import { LogoSettings } from '@/types'

export interface Club {
  id: string
  name: string
  city?: string
  formatted_address?: string
  logo_url?: string
  logo_settings?: LogoSettings | null
  is_active?: boolean
}

interface ClubSelectorProps {
  clubs: Club[]
  selectedClubId: string | null
  onClubChange: (clubId: string) => void
  isLoading?: boolean
  onCreateNew?: () => void
  className?: string
}


export function ClubSelector({
  clubs,
  selectedClubId,
  onClubChange,
  isLoading = false,
  onCreateNew,
  className,
}: ClubSelectorProps) {
  const selectedClub = clubs.find((c) => c.id === selectedClubId)

  if (isLoading) {
    return (
      <div className={cn('px-2 py-1.5', className)}>
        <div className="flex items-center gap-2.5">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground flex-shrink-0" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    )
  }

  if (clubs.length === 0) {
    return (
      <div className={cn('px-2 py-1.5', className)}>
        {onCreateNew ? (
          <button
            onClick={onCreateNew}
            className="flex w-full items-center gap-2 rounded-[var(--radius)] border border-dashed border-border/40 px-2 py-1.5 text-sm font-medium transition-colors hover:bg-primary/5 hover:border-primary/40 text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
            <span>Create club</span>
          </button>
        ) : (
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4 flex-shrink-0" />
            <span>No clubs</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn('px-2', className)}>
      <Select
        value={selectedClubId || undefined}
        onValueChange={onClubChange}
      >
        <SelectTrigger className="h-auto w-full border border-border/40 bg-card/50 hover:bg-accent/50 px-2 py-1.5 rounded-lg transition-colors shadow-none">
          <div className="flex items-center gap-3 flex-1 min-w-0 w-full overflow-hidden">
            <ClubLogo
              logoUrl={selectedClub?.logo_url}
              logoSettings={selectedClub?.logo_settings}
              alt={selectedClub?.name || 'Club'}
              size={32}
              containerClassName="flex-shrink-0"
            />
            <SelectValue placeholder="Select a club" className="flex-1 min-w-0 w-0 overflow-hidden">
              {selectedClub ? (
                <div className="flex flex-col items-start min-w-0 w-full gap-0.5 overflow-hidden">
                  <span className="text-sm font-semibold truncate w-full leading-tight">{selectedClub.name}</span>
                  {(selectedClub.formatted_address || selectedClub.city) && (
                    <div className="w-full min-w-0 overflow-hidden">
                      <TruncatedText
                        text={selectedClub.formatted_address || selectedClub.city || ''}
                        className="text-xs text-muted-foreground leading-tight"
                        maxChars={18}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Select a club</span>
              )}
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent className="w-[280px]">
          {clubs.map((club) => (
            <SelectItem key={club.id} value={club.id} className="py-2 px-2">
              <div className="flex items-center gap-3 w-full overflow-hidden">
                <ClubLogo
                  logoUrl={club.logo_url}
                  logoSettings={club.logo_settings}
                  alt={club.name}
                  size={36}
                />
                <div className="flex flex-col items-start gap-0.5 min-w-0 flex-1 overflow-hidden">
                  <span className="text-sm font-semibold truncate max-w-full">{club.name}</span>
                  {(club.formatted_address || club.city) && (
                    <TruncatedText
                      text={club.formatted_address || club.city || ''}
                      className="text-xs text-muted-foreground cursor-default"
                      maxChars={30}
                    />
                  )}
                </div>
              </div>
            </SelectItem>
          ))}
          {onCreateNew && (
            <>
              <div className="h-px bg-border my-1" />
              <button
                onClick={(e) => {
                  e.preventDefault()
                  onCreateNew()
                }}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors rounded-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Create new club
              </button>
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  )
}

