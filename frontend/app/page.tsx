'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/providers/auth-provider'
import { UserRole } from '@/types'

export default function HomePage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        // Redirect based on role
        switch (user.role) {
          case UserRole.CUSTOMER:
            router.push('/clubs')
            break
          case UserRole.CLUB_OWNER:
            router.push('/club')
            break
          case UserRole.BARTENDER:
            router.push('/bartender')
            break
          case UserRole.ADMIN:
            router.push('/admin')
            break
          default:
            router.push('/clubs')
        }
      } else {
        // Not authenticated, go to clubs page (public)
        router.push('/clubs')
      }
    }
  }, [isLoading, user, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div>Loading...</div>
    </div>
  )
}

