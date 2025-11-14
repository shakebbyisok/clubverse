'use client'

import { Club } from '@/types'
import { ClubLogo } from './club-logo'
import { MapPin, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NearestClubCardProps {
  club: Club
  distance?: number // in km
  size?: 'small' | 'medium' | 'large'
  showDistance?: boolean
  showStatus?: boolean
  className?: string
  onClick?: () => void
}

export function NearestClubCard({
  club,
  distance,
  size = 'large',
  showDistance = true,
  showStatus = true,
  className,
  onClick,
}: NearestClubCardProps) {
  const distanceText = distance
    ? distance < 1
      ? `${Math.round(distance * 1000)}m away`
      : `${distance.toFixed(1)}km away`
    : null

  // Size variants
  const sizeClasses = {
    small: {
      container: 'p-3',
      logo: 40,
      title: 'text-sm',
      subtitle: 'text-xs',
      gap: 'gap-2',
    },
    medium: {
      container: 'p-4',
      logo: 56,
      title: 'text-base',
      subtitle: 'text-sm',
      gap: 'gap-3',
    },
    large: {
      container: 'p-5',
      logo: 80,
      title: 'text-xl',
      subtitle: 'text-sm',
      gap: 'gap-4',
    },
  }

  const sizes = sizeClasses[size]
  const isClickable = !!onClick

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm',
        'transition-all duration-300',
        isClickable && 'cursor-pointer hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5',
        sizes.container,
        className
      )}
    >
      {/* Background gradient overlay */}
      {size === 'large' && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      )}

      <div className={cn('relative flex items-start', sizes.gap)}>
        {/* Club Logo */}
        <ClubLogo
          logoUrl={club.logo_url}
          logoSettings={club.logo_settings}
          alt={club.name}
          size={sizes.logo}
          containerClassName="flex-shrink-0"
        />

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Club Name */}
          <h3
            className={cn(
              'font-semibold text-foreground truncate',
              sizes.title,
              isClickable && 'group-hover:text-primary transition-colors'
            )}
          >
            {club.name}
          </h3>

          {/* Address */}
          {(club.city || club.formatted_address) && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className={cn('flex-shrink-0', size === 'small' ? 'h-3 w-3' : 'h-4 w-4')} />
              <p className={cn('truncate', sizes.subtitle)}>
                {club.city || club.formatted_address}
              </p>
            </div>
          )}

          {/* Distance and Status Row */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Distance Badge */}
            {showDistance && distanceText && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                <span className={cn('font-medium', size === 'small' ? 'text-[10px]' : 'text-xs')}>
                  {distanceText}
                </span>
              </div>
            )}

            {/* Status Indicator */}
            {showStatus && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className={cn('flex-shrink-0', size === 'small' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
                <span className={cn('font-medium', size === 'small' ? 'text-[10px]' : 'text-xs')}>
                  Open Now
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

