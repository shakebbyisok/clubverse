import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/lib/providers/query-provider'
import { AuthProvider } from '@/lib/providers/auth-provider'
import { ThemeProvider } from '@/lib/design-system/theme-provider'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'Clubverse - Nightlife Drink Ordering',
  description: 'Order drinks at your favorite clubs instantly',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.variable}>
        <ThemeProvider defaultTheme="dark">
          <QueryProvider>
            <AuthProvider>
              <div className="min-h-screen bg-background">
                {children}
              </div>
              <Toaster />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

