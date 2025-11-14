'use client'

import { Club } from '@/types'
import { ClubLogo } from './club-logo'
import { MapPin, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PartnerClubCardProps {
  club: Club
  distance?: number // in km
  className?: string
}

export function PartnerClubCard({ club, distance, className }: PartnerClubCardProps) {
  const distanceText = distance
    ? distance < 1
      ? `${Math.round(distance * 1000)}m`
      : `${distance.toFixed(1)}km`
    : null

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl aspect-[85.6/53.98]',
        // Premium VISA-style gradient - more sophisticated
        'bg-gradient-to-br dark:from-zinc-600 dark:via-zinc-800 dark:to-zinc-950 from-zinc-800 via-black to-zinc-950',
        'shadow-2xl dark:shadow-black/40 shadow-black/70',
        className
      )}
    >
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br dark:from-zinc-600 dark:via-zinc-800 dark:to-zinc-950 from-zinc-800 via-black to-zinc-950" />
      
      {/* Metallic Shine Overlay - VISA style */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-transparent" />
      
      {/* Secondary Shine - Bottom Left */}
      <div className="absolute bottom-0 left-0 w-2/3 h-2/3 bg-gradient-to-tr from-transparent via-white/3 to-transparent rounded-full blur-3xl" />
      
      {/* Holographic Effect - Top Right */}
      <div className="absolute top-0 right-0 w-3/4 h-3/4 bg-gradient-to-bl from-white/6 via-white/2 to-transparent rounded-full blur-3xl" />
      
      {/* Subtle Texture Overlay - Premium feel */}
      <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(circle_at_1px_1px,_white_1px,_transparent_0)] bg-[length:20px_20px]" />
      
      {/* Reflective Edge Highlight */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* Content */}
      <div className="relative h-full flex flex-col justify-between p-6 text-white">
        {/* Top Section */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="mb-4">
              <span className="text-[10px] font-light uppercase tracking-[0.18em] text-white/60">
                Partner Club
              </span>
            </div>
            <h2 className="text-[28px] font-normal tracking-[-0.03em] truncate mb-1.5 leading-[1.1] drop-shadow-sm">
              {club.name}
            </h2>
            {(club.city || club.formatted_address) && (
              <div className="flex items-center gap-1.5 text-white/50">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <p className="text-[13px] font-light truncate">
                  {club.city || club.formatted_address}
                </p>
              </div>
            )}
          </div>
          
          {/* Club Logo - Top Right */}
          <div className="flex-shrink-0">
            <div className="w-20 h-20 rounded-xl bg-white/12 backdrop-blur-md p-2.5 flex items-center justify-center border border-white/10 shadow-xl ring-1 ring-white/5">
              <ClubLogo
                logoUrl={club.logo_url}
                logoSettings={club.logo_settings}
                alt={club.name}
                size={56}
                containerClassName="w-full h-full"
              />
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex items-end justify-between">
          {distanceText && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-md border border-white/10 shadow-sm">
              <MapPin className="h-3 w-3 text-white/80 flex-shrink-0" />
              <span className="text-[11px] font-light text-white/90 tracking-wide">
                {distanceText}
              </span>
            </div>
          )}
          
          {/* Points Display - Bottom Right */}
          <div className="flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
            <div className="text-xl font-light tracking-tight text-white">
              0
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

