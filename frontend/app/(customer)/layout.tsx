'use client'

import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav'
import { useAuth } from '@/lib/providers/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  // Show nothing while checking auth
  if (isLoading || !user) {
    return null
  }

  return (
    <>
      <main className="pb-16">{children}</main>
      <MobileBottomNav />
    </>
  )
}

