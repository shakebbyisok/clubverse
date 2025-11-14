'use client'

import { useRouter } from 'next/navigation'
import { UserClub } from '@/lib/api/user-clubs'
import { ClubLogo } from './club-logo'
import { Trophy, Star, ArrowRight, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/providers/auth-provider'

interface ClubCardProps {
  userClub: UserClub
  className?: string
}

export function ClubCard({ userClub, className }: ClubCardProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { club, points, total_orders } = userClub

  const handleClick = () => {
    router.push(`/clubs/${club.id}`)
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm',
        'transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5',
        'cursor-pointer',
        className
      )}
    >
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative p-5 space-y-4">
        {/* Header: Logo and Club Name */}
        <div className="flex items-start gap-4">
          <ClubLogo
            logoUrl={club.logo_url}
            logoSettings={club.logo_settings}
            alt={club.name}
            size={56}
            containerClassName="flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {club.name}
            </h3>
            {club.city && (
              <p className="text-sm text-muted-foreground truncate">{club.city}</p>
            )}
          </div>
        </div>

        {/* User Info */}
        {user?.full_name && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span className="truncate">{user.full_name}</span>
          </div>
        )}

        {/* Stats Section */}
        <div className="flex items-center gap-4 pt-2 border-t border-border/40">
          {/* Points */}
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
              <Star className="h-5 w-5 fill-current" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Points</p>
              <p className="text-lg font-semibold text-foreground">{points.toLocaleString()}</p>
            </div>
          </div>

          {/* Orders */}
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary/10 text-secondary">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Orders</p>
              <p className="text-lg font-semibold text-foreground">{total_orders}</p>
            </div>
          </div>
        </div>

        {/* Achievements Placeholder */}
        <div className="pt-2 border-t border-border/40">
          <p className="text-xs text-muted-foreground mb-2">Achievements</p>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50 text-xs text-muted-foreground">
              Coming soon
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">View Club</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </div>
  )
}

