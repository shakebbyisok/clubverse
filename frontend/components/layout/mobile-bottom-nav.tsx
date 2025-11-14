'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { List, User, Map } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  {
    label: 'Club',
    href: '/nearest-club',
    icon: 'svg', // Special marker for SVG icon (club logo)
  },
  {
    label: 'Map',
    href: '/map',
    icon: Map,
  },
  {
    label: 'Clubs',
    href: '/clubs',
    icon: List,
  },
  {
    label: 'Account',
    href: '/account',
    icon: User,
  },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t border-border/40 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon === 'svg' ? null : item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 h-full',
                'transition-colors duration-200',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
                  {item.icon === 'svg' ? (
                    <Image
                      src="/assets/previa/whiteprevia.svg"
                      alt="La Previa"
                      width={32}
                      height={32}
                      className={cn(
                        'h-8 w-auto dark:invert-0 invert',
                        isActive && 'scale-110'
                      )}
                      unoptimized
                    />
                  ) : (
                Icon && <Icon className={cn('h-5 w-5', isActive && 'scale-110')} />
              )}
              <span className="text-[11px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

