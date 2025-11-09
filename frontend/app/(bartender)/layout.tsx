'use client'

import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { LayoutDashboard, ShoppingBag } from 'lucide-react'
import { useAuth } from '@/lib/providers/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { UserRole } from '@/types'

export default function BartenderLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && (!user || user.role !== UserRole.BARTENDER)) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  if (isLoading || !user || user.role !== UserRole.BARTENDER) {
    return null
  }

  const navItems = [
    {
      label: 'Dashboard',
      href: '/bartender',
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      label: 'Orders',
      href: '/bartender/orders',
      icon: <ShoppingBag className="h-4 w-4" />,
    },
  ]

  return (
    <DashboardLayout navItems={navItems} title="Bartender Dashboard">
      {children}
    </DashboardLayout>
  )
}

