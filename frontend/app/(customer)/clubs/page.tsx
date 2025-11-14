'use client'

import { useUserClubs, useRegisterToClub } from '@/lib/queries/use-user-clubs'
import { useClubs } from '@/lib/queries/use-clubs'
import { ClubCard } from '@/components/common/club-card'
import { AlertCircle, Loader2, Plus, MapPin } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ElegantList, ElegantListItem } from '@/components/common/elegant-list'
import { ClubLogo } from '@/components/common/club-logo'

export default function ClubsPage() {
  const router = useRouter()
  const { data: userClubs, isLoading: isLoadingUserClubs, error: userClubsError } = useUserClubs()
  const { data: allClubs, isLoading: isLoadingAllClubs } = useClubs()
  const registerMutation = useRegisterToClub()
  const [showJoinClubs, setShowJoinClubs] = useState(false)

  const isLoading = isLoadingUserClubs || isLoadingAllClubs

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 pb-16 flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Loading your clubs...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (userClubsError) {
    return (
      <div className="fixed inset-0 pb-16 flex items-center justify-center bg-background p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {userClubsError instanceof Error ? userClubsError.message : 'Failed to load your clubs'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // No user clubs - show available clubs
  if (!userClubs || userClubs.length === 0) {
    const clubListItems: ElegantListItem[] = (allClubs || []).map((club) => ({
      id: club.id,
      title: club.name,
      subtitle: club.city || club.formatted_address || undefined,
      icon: (
        <ClubLogo
          logoUrl={club.logo_url}
          logoSettings={club.logo_settings}
          alt={club.name}
          size={40}
        />
      ),
    }))

    return (
      <div className="min-h-screen pb-16 bg-background">
        <div className="px-4 py-6 space-y-6">
          {/* Available Clubs List */}
          {allClubs && allClubs.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground px-1">
                Available Clubs
              </h3>
              <ElegantList
                items={clubListItems}
                onItemClick={async (item) => {
                  try {
                    await registerMutation.mutateAsync(item.id)
                  } catch (error) {
                    // Error handled by mutation
                  }
                }}
                showChevron={false}
              />
            </div>
          ) : (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No clubs available at the moment</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Show user clubs in grid
  return (
    <div className="min-h-screen pb-16 bg-background">
      <div className="px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Clubs</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {userClubs.length} {userClubs.length === 1 ? 'club' : 'clubs'}
            </p>
          </div>
          {allClubs && allClubs.length > userClubs.length && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowJoinClubs(!showJoinClubs)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Join More
            </Button>
          )}
        </div>

        {/* Clubs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {userClubs.map((userClub) => (
            <ClubCard key={userClub.id} userClub={userClub} />
          ))}
        </div>

        {/* Available Clubs to Join */}
        {showJoinClubs && allClubs && (
          <div className="space-y-4 pt-6 border-t border-border/40">
            <h3 className="text-sm font-medium text-muted-foreground px-1">
              Join More Clubs
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allClubs
                .filter((club) => !userClubs.some((uc) => uc.club_id === club.id))
                .map((club) => (
                  <div
                    key={club.id}
                    onClick={async () => {
                      try {
                        await registerMutation.mutateAsync(club.id)
                      } catch (error) {
                        // Error handled by mutation
                      }
                    }}
                    className="group relative overflow-hidden rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm p-5 cursor-pointer transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
                  >
                    <div className="flex items-center gap-4">
                      <ClubLogo
                        logoUrl={club.logo_url}
                        logoSettings={club.logo_settings}
                        alt={club.name}
                        size={48}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {club.name}
                        </h3>
                        {club.city && (
                          <p className="text-sm text-muted-foreground truncate">{club.city}</p>
                        )}
                      </div>
                      <Button size="sm" variant="outline" className="flex-shrink-0">
                        <Plus className="h-4 w-4 mr-1" />
                        Join
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
