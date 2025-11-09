'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/providers/auth-provider'

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading) {
      router.push('/map')
    }
  }, [isLoading, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div>Loading...</div>
    </div>
  )
}

