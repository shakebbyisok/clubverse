'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShoppingBag, QrCode } from 'lucide-react'

export default function BartenderDashboardPage() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage orders and scan QR codes
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card 
          className="border-border/40 bg-card/50 backdrop-blur-sm cursor-pointer hover:bg-card/70 transition-colors"
          onClick={() => router.push('/bartender/orders')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">View Orders</div>
            <p className="text-xs text-muted-foreground mt-1">
              Manage and process orders
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scan QR Code</CardTitle>
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground mb-3">
              Scan customer QR code to process order
            </div>
            <Button variant="outline" size="sm" className="w-full">
              Open Scanner
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

