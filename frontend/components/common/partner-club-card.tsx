'use client'

import { Club } from '@/types'
import { ClubLogo } from './club-logo'
import { MapPin, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface PartnerClubCardProps {
  club: Club
  distance?: number // in km
  points?: number // user's points at this club
  className?: string
}

export function PartnerClubCard({ club, distance, points = 0, className }: PartnerClubCardProps) {
  const distanceText = distance
    ? distance < 1
      ? `${Math.round(distance * 1000)}m`
      : `${distance.toFixed(1)}km`
    : null

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl',
        'bg-black border border-white/[0.08]',
        'shadow-2xl shadow-black/50',
        className
      )}
    >
      {/* Subtle top edge highlight */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Content */}
      <div className="relative px-6 py-5">
        {/* Header - Clubverse branding & distance */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 opacity-40">
            <Image 
              src="/assets/whiteicon.svg"
              alt="Clubverse"
              width={12}
              height={12}
              className="opacity-80"
              unoptimized
            />
            <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-white">
              Clubverse
            </span>
          </div>
          
          {distanceText && (
            <div className="flex items-center gap-1">
              <MapPin className="h-2.5 w-2.5 text-white/30" />
              <span className="text-[10px] font-normal text-white/30 tabular-nums">
                {distanceText}
              </span>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex items-center gap-4">
          {/* Club Logo */}
          <div className="flex-shrink-0">
            <div className="w-14 h-14 rounded-xl bg-white/[0.05] flex items-center justify-center overflow-hidden">
              <ClubLogo
                logoUrl={club.logo_url}
                logoSettings={club.logo_settings}
                alt={club.name}
                size={40}
                containerClassName="w-10 h-10"
              />
            </div>
          </div>

          {/* Club Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-white truncate leading-tight">
              {club.name}
            </h2>
            {(club.city || club.formatted_address) && (
              <p className="text-xs font-normal text-white/35 truncate mt-0.5">
                {club.city || club.formatted_address}
              </p>
            )}
          </div>

          {/* Points Badge */}
          <div className="flex-shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06]">
              <Sparkles className="h-3 w-3 text-amber-400" />
              <span className="text-sm font-semibold text-white tabular-nums">
                {points.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom accent line */}
        <div className="mt-5 pt-3.5 border-t border-white/[0.06]">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-medium uppercase tracking-[0.15em] text-white/20">
              Partner Venue
            </span>
            <div className="h-1 w-1 rounded-full bg-emerald-500/70" />
          </div>
        </div>
      </div>
    </div>
  )
}

