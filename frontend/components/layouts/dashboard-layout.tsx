'use client'

import { ReactNode } from 'react'
import { useAuth } from '@/lib/providers/auth-provider'
import { useRouter, usePathname } from 'next/navigation'
import { UserRole } from '@/types'
import { 
  LayoutDashboard, 
  Users, 
  Wine, 
  ShoppingBag, 
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Button } from '@/components/ui/button'
import { ClubSelector, Club } from '@/components/common/club-selector'

interface NavItem {
  label: string
  href: string
  icon: ReactNode
}

interface DashboardLayoutProps {
  children: ReactNode
  navItems: NavItem[]
  title: string
  clubs?: Club[]
  selectedClubId?: string | null
  onClubChange?: (clubId: string) => void
  onCreateClub?: () => void
}

export function DashboardLayout({ 
  children, 
  navItems, 
  title,
  clubs = [],
  selectedClubId = null,
  onClubChange,
  onCreateClub,
}: DashboardLayoutProps) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // Show club selector only for club owners
  const showClubSelector = user?.role === UserRole.CLUB_OWNER

  // Find active page name from current pathname
  const activePage = navItems.find(item => {
    if (item.href === pathname) return true
    // Handle nested routes (e.g., /club/bartenders matches /club)
    if (pathname.startsWith(item.href) && item.href !== '/club') return true
    return false
  })?.label || title

  const getRoleLabel = (role: UserRole): string => {
    switch (role) {
      case UserRole.CUSTOMER:
        return 'Customer'
      case UserRole.CLUB_OWNER:
        return 'Club Owner'
      case UserRole.BARTENDER:
        return 'Bartender'
      case UserRole.ADMIN:
        return 'Admin'
      default:
        return 'User'
    }
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:w-48 lg:flex-col border-r border-border/40 bg-card/30 backdrop-blur-sm">
        <div className="flex-1 flex flex-col">
          {/* Logo/Brand */}
          <div className="h-12 flex items-center justify-center px-3 border-b border-border/40 gap-2">
            <img 
              src="/assets/previa/whiteprevia.svg" 
              alt="La Previa" 
              className="h-10 w-auto dark:invert-0 invert"
            />
          </div>

          {/* Club Selector - Only for Club Owners */}
          {showClubSelector && (
            <div className="pt-2 pb-2 border-b border-border/40">
              <ClubSelector
                clubs={clubs}
                selectedClubId={selectedClubId}
                onClubChange={onClubChange || (() => {})}
                onCreateNew={onCreateClub}
                isLoading={false}
              />
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/club')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-2.5 py-2 text-[13px] font-medium rounded-[var(--radius)] transition-all ${
                    isActive 
                      ? 'bg-primary/10 text-primary' 
                      : 'hover:bg-primary/5 hover:text-primary text-muted-foreground'
                  }`}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* User Section */}
          <div className="p-2.5 border-t border-border/40">
            <div className="flex items-center gap-2 px-2.5 py-2 mb-1.5">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate text-foreground">
                  {user?.full_name || user?.email}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {user && getRoleLabel(user.role)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="flex-1 justify-start gap-1.5 h-7 px-2"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="text-xs">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-48 bg-card border-r border-border/40 flex flex-col">
            <div className="h-12 flex items-center justify-center px-3 border-b border-border/40 gap-2 relative">
              <img 
                src="/assets/previa/whiteprevia.svg" 
                alt="La Previa" 
                className="h-10 w-auto dark:invert-0 invert"
              />
              <button onClick={() => setSidebarOpen(false)} className="absolute top-2 right-2 p-1.5">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Club Selector - Mobile */}
            {showClubSelector && (
              <div className="pt-2 pb-2 border-b border-border/40">
                <ClubSelector
                  clubs={clubs}
                  selectedClubId={selectedClubId}
                  onClubChange={(clubId) => {
                    onClubChange?.(clubId)
                    setSidebarOpen(false)
                  }}
                  onCreateNew={onCreateClub}
                  isLoading={false}
                />
              </div>
            )}

            <nav className="flex-1 px-2 py-4 space-y-0.5">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/club')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-2 px-2.5 py-2 text-[13px] font-medium rounded-[var(--radius)] transition-all ${
                      isActive 
                        ? 'bg-primary/10 text-primary' 
                        : 'hover:bg-primary/5 hover:text-primary text-muted-foreground'
                    }`}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            <div className="p-2.5 border-t border-border/40">
              <div className="flex items-center gap-2 px-2.5 py-2 mb-1.5">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate text-foreground">
                    {user?.full_name || user?.email}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {user && getRoleLabel(user.role)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <ThemeToggle />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="flex-1 justify-start gap-1.5 h-7 px-2"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="text-xs">Logout</span>
                </Button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-12 border-b border-border/40 flex items-center justify-between px-4 lg:px-6 bg-card/30 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(true)} 
              className="lg:hidden p-1.5"
            >
              <Menu className="h-4 w-4" />
            </button>
            <h1 className="text-base lg:text-lg font-semibold text-foreground">{activePage}</h1>
          </div>
          <div className="hidden lg:flex items-center gap-3">
            <span className="text-[11px] text-muted-foreground">
              {user && getRoleLabel(user.role)}
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="w-full max-w-7xl mx-auto p-3 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

