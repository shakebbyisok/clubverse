'use client'

import { useAuth } from '@/lib/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { ElegantList, ElegantListItem } from '@/components/common/elegant-list'
import { User, Mail, LogOut, UserCircle, Receipt } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'

export default function AccountPage() {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  // Account menu items using ElegantList
  const accountMenuItems = useMemo((): ElegantListItem[] => {
    return [
      {
        id: 'edit-profile',
        title: 'Edit Profile',
        subtitle: 'Update your personal information',
        icon: <UserCircle className="h-4 w-4" />,
      },
      {
        id: 'order-history',
        title: 'Order History',
        subtitle: 'View your past orders',
        icon: <Receipt className="h-4 w-4" />,
      },
    ]
  }, [])

  if (!user) {
    return (
      <div className="fixed inset-0 pb-16 flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Not logged in</p>
          <Button onClick={() => router.push('/login')}>Login</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-16 bg-background">
      <div className="px-4 py-6 space-y-6">
        {/* Profile Section - Elegant Minimalist */}
        <div className="text-center space-y-4">
          {/* Minimalist black/white icon */}
          <div className="w-16 h-16 rounded-full bg-card border-2 border-border/60 mx-auto flex items-center justify-center">
            <UserCircle className="h-8 w-8 text-foreground" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">
              {user.full_name || 'User'}
            </h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        {/* Account Options - Using ElegantList */}
        <ElegantList
          items={accountMenuItems}
          onItemClick={(item) => {
            // Handle navigation when implemented
            if (item.id === 'edit-profile') {
              // router.push('/account/edit')
            } else if (item.id === 'order-history') {
              // router.push('/account/orders')
            }
          }}
          showChevron={true}
          className="space-y-3"
        />

        {/* Logout Button - Elegant Compact */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            className="px-6 py-3 border-border/40 hover:bg-muted/50 transition-all"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* App Info - Minimalist */}
        <div className="text-center text-xs text-muted-foreground/60 pt-2 space-y-0.5">
          <p>Clubverse v1.0.0</p>
          <p>© 2025 Clubverse. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}

