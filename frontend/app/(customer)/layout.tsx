'use client'

import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav'

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <main className="pb-16">{children}</main>
      <MobileBottomNav />
    </>
  )
}

