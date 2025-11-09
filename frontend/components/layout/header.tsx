'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useAuth } from '@/lib/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export function Header() {
  const { isAuthenticated, user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/clubs')
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mobile-container desktop:desktop-container flex h-16 items-center justify-between">
        <Link href="/clubs" className="flex items-center space-x-3">
          <Image
            src="/assets/logo.png"
            alt="Clubverse"
            width={32}
            height={32}
            className="h-8 w-8"
            priority
          />
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Clubverse
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user?.email}
              </span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Login
              </Button>
            </Link>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

