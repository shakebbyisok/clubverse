import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { QueryProvider } from '@/lib/providers/query-provider'
import { AuthProvider } from '@/lib/providers/auth-provider'
import { ThemeProvider } from '@/lib/design-system/theme-provider'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'Clubverse - Nightlife Drink Ordering',
  description: 'Order drinks at your favorite clubs instantly',
  icons: {
    icon: '/assets/whiteicon.svg',
    shortcut: '/assets/whiteicon.svg',
    apple: '/assets/whiteicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.variable}>
        {googleMapsApiKey && (
          <Script
            src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places`}
            strategy="afterInteractive"
            id="google-maps-script"
          />
        )}
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

