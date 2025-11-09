'use client'

import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { LayoutDashboard, Building2, Users, ShoppingBag } from 'lucide-react'
import { useAuth } from '@/lib/providers/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { UserRole } from '@/types'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && (!user || user.role !== UserRole.ADMIN)) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  if (isLoading || !user || user.role !== UserRole.ADMIN) {
    return null
  }

  const navItems = [
    {
      label: 'Dashboard',
      href: '/admin',
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      label: 'Clubs',
      href: '/admin/clubs',
      icon: <Building2 className="h-4 w-4" />,
    },
    {
      label: 'Users',
      href: '/admin/users',
      icon: <Users className="h-4 w-4" />,
    },
    {
      label: 'Orders',
      href: '/admin/orders',
      icon: <ShoppingBag className="h-4 w-4" />,
    },
  ]

  return (
    <DashboardLayout navItems={navItems} title="Admin Dashboard">
      {children}
    </DashboardLayout>
  )
}

