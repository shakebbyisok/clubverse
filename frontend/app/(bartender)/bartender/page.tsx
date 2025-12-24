'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShoppingBag, QrCode, Building2, Loader2 } from 'lucide-react'
import { QRScannerModal } from '@/components/common/qr-scanner-modal'
import { Order, BartenderClubInfo } from '@/types'
import { bartenderApi } from '@/lib/api/bartender'
import { useToast } from '@/hooks/use-toast'

export default function BartenderDashboardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [clubInfo, setClubInfo] = useState<BartenderClubInfo | null>(null)
  const [isLoadingClub, setIsLoadingClub] = useState(true)

  useEffect(() => {
    const fetchClubInfo = async () => {
      try {
        const info = await bartenderApi.getMyClub()
        setClubInfo(info)
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.response?.data?.detail || 'Failed to load club information',
        })
      } finally {
        setIsLoadingClub(false)
      }
    }
    fetchClubInfo()
  }, [toast])

  const handleScanSuccess = (order: Order) => {
    // Navigate to orders page and potentially highlight the scanned order
    router.push(`/bartender/orders?order=${order.id}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage orders and scan QR codes
        </p>
      </div>

      {/* Club Info Card */}
      {isLoadingClub ? (
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardContent className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : clubInfo ? (
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Club</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-base font-semibold">{clubInfo.club_name}</div>
            {(clubInfo.club_address || clubInfo.club_city) && (
              <p className="text-xs text-muted-foreground mt-1">
                {clubInfo.club_address || clubInfo.club_city}
                {clubInfo.club_address && clubInfo.club_city && `, ${clubInfo.club_city}`}
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

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
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => setIsScannerOpen(true)}
            >
              Open Scanner
            </Button>
          </CardContent>
        </Card>
      </div>

      <QRScannerModal
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  )
}

