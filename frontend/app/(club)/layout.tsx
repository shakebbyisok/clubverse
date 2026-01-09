'use client'

import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { LayoutDashboard, Users, Wine, ShoppingBag, Settings, Beaker } from 'lucide-react'
import { useAuth } from '@/lib/providers/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { UserRole } from '@/types'
import { Club } from '@/components/common/club-selector'
import { ClubFormModal } from '@/components/common/club-form-modal'

export default function ClubLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [clubs, setClubs] = useState<Club[]>([])
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null)
  const [isLoadingClubs, setIsLoadingClubs] = useState(true)
  const [isCreateClubModalOpen, setIsCreateClubModalOpen] = useState(false)

  useEffect(() => {
    if (!isLoading && (!user || user.role !== UserRole.CLUB_OWNER)) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  // Update browser title and favicon for club owner UI
  useEffect(() => {
    if (user?.role === UserRole.CLUB_OWNER) {
      // Update document title
      document.title = 'Clubverse - Club Dashboard'
      
      // Update favicon
      const updateFavicon = (href: string) => {
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement
        if (!link) {
          link = document.createElement('link')
          link.rel = 'icon'
          document.head.appendChild(link)
        }
        link.href = href
        
        // Also update shortcut icon
        let shortcut = document.querySelector("link[rel~='shortcut icon']") as HTMLLinkElement
        if (!shortcut) {
          shortcut = document.createElement('link')
          shortcut.rel = 'shortcut icon'
          document.head.appendChild(shortcut)
        }
        shortcut.href = href
        
        // Update apple-touch-icon
        let apple = document.querySelector("link[rel~='apple-touch-icon']") as HTMLLinkElement
        if (!apple) {
          apple = document.createElement('link')
          apple.rel = 'apple-touch-icon'
          document.head.appendChild(apple)
        }
        apple.href = href
      }
      
      updateFavicon('/assets/whiteclubverse.svg')
      
      // Cleanup: restore original favicon when component unmounts
      return () => {
        document.title = 'La Previa - Nightlife Drink Ordering'
        const originalFavicon = '/assets/previa/whiteprevia.svg'
        const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement
        const shortcut = document.querySelector("link[rel~='shortcut icon']") as HTMLLinkElement
        const apple = document.querySelector("link[rel~='apple-touch-icon']") as HTMLLinkElement
        if (link) link.href = originalFavicon
        if (shortcut) shortcut.href = originalFavicon
        if (apple) apple.href = originalFavicon
      }
    }
  }, [user])

  // Fetch user's clubs
  useEffect(() => {
    if (user?.role === UserRole.CLUB_OWNER) {
      const fetchClubs = async () => {
        try {
          const { clubsApi } = await import('@/lib/api/clubs')
          const response = await clubsApi.getMyClubs()
          setClubs(response.map(club => ({
            id: club.id,
            name: club.name,
            city: club.city || undefined,
            formatted_address: club.formatted_address || undefined,
            logo_url: club.logo_url || undefined,
            logo_settings: club.logo_settings || undefined,
            is_active: club.is_active,
          })))
          
          // Auto-select first club if available
          if (response.length > 0) {
            // Check localStorage for previously selected club
            const savedClubId = localStorage.getItem('selectedClubId')
            const clubExists = savedClubId && response.some(c => c.id === savedClubId)
            
            if (clubExists) {
              setSelectedClubId(savedClubId!)
            } else {
              setSelectedClubId(response[0].id)
            }
          }
        } catch (error: any) {
          console.error('Failed to fetch clubs:', error)
          // If 404, user has no clubs yet - that's okay
          if (error.response?.status !== 404) {
            // Only show error for non-404 errors
          }
        } finally {
          setIsLoadingClubs(false)
        }
      }
      
      fetchClubs()
    }
  }, [user])

  const handleClubChange = (clubId: string) => {
    setSelectedClubId(clubId)
    localStorage.setItem('selectedClubId', clubId)
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new CustomEvent('clubChanged', { detail: clubId }))
  }

  const handleCreateClub = () => {
    setIsCreateClubModalOpen(true)
  }

  const handleClubCreated = async () => {
    // Refresh clubs list
    try {
      const { clubsApi } = await import('@/lib/api/clubs')
      const response = await clubsApi.getMyClubs()
      setClubs(response.map(club => ({
        id: club.id,
        name: club.name,
        city: club.city || undefined,
        formatted_address: club.formatted_address || undefined,
        logo_url: club.logo_url || undefined,
        logo_settings: club.logo_settings || undefined,
        is_active: club.is_active,
      })))
      
      // Select the newly created club
      if (response.length > 0) {
        const savedClubId = localStorage.getItem('selectedClubId')
        if (savedClubId) {
          setSelectedClubId(savedClubId)
        } else {
          setSelectedClubId(response[response.length - 1].id)
        }
      }
    } catch (error) {
      console.error('Failed to refresh clubs:', error)
    }
  }

  if (isLoading || !user || user.role !== UserRole.CLUB_OWNER) {
    return null
  }

  const navItems = [
    {
      label: 'Dashboard',
      href: '/club',
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      label: 'Bartenders',
      href: '/club/bartenders',
      icon: <Users className="h-4 w-4" />,
    },
    {
      label: 'Ingredients',
      href: '/club/ingredients',
      icon: <Beaker className="h-4 w-4" />,
    },
    {
      label: 'Drinks',
      href: '/club/drinks',
      icon: <Wine className="h-4 w-4" />,
    },
    {
      label: 'Orders',
      href: '/club/orders',
      icon: <ShoppingBag className="h-4 w-4" />,
    },
    {
      label: 'Settings',
      href: '/club/settings',
      icon: <Settings className="h-4 w-4" />,
    },
  ]

  return (
    <>
      <DashboardLayout 
        navItems={navItems} 
        title="Club Management"
        clubs={clubs}
        selectedClubId={selectedClubId}
        onClubChange={handleClubChange}
        onCreateClub={handleCreateClub}
      >
        {children}
      </DashboardLayout>
      
      {/* Create Club Modal */}
      <ClubFormModal
        open={isCreateClubModalOpen}
        onOpenChange={setIsCreateClubModalOpen}
        club={null}
        onSuccess={handleClubCreated}
      />
    </>
  )
}

