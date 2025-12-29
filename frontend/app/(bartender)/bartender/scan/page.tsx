'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Camera, CameraOff, CheckCircle, DollarSign, Package } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Order } from '@/types'
import { bartenderApi } from '@/lib/api/bartender'
import { cn } from '@/lib/utils'

// Wake Lock types
interface WakeLockSentinel extends EventTarget {
  released: boolean
  type: 'screen'
  release(): Promise<void>
}

interface WakeLock {
  request(type: 'screen'): Promise<WakeLockSentinel>
}

interface NavigatorWithWakeLock {
  wakeLock?: WakeLock
}

export default function ScanPage() {
  const { toast } = useToast()
  const [isScanning, setIsScanning] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [scannedOrder, setScannedOrder] = useState<Order | null>(null)
  const [isCompleting, setIsCompleting] = useState(false)
  const scannerRef = useRef<HTMLDivElement>(null)
  const html5QrCodeRef = useRef<any>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    startScanner()
    enableWakeLock()

    return () => {
      disableWakeLock()
      stopScanner()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const enableWakeLock = async () => {
    const nav = navigator as unknown as NavigatorWithWakeLock
    if (nav.wakeLock) {
      try {
        const wakeLock = await nav.wakeLock.request('screen')
        wakeLockRef.current = wakeLock
      } catch (err) {
        console.log('Wake lock not supported:', err)
      }
    }
  }

  const disableWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release()
        wakeLockRef.current = null
      } catch (err) {}
    }
  }

  const startScanner = async () => {
    if (!scannerRef.current) return

    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      
      setIsScanning(true)
      
      const html5QrCode = new Html5Qrcode(scannerRef.current.id)
      html5QrCodeRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 30, // High FPS for faster scanning
          qrbox: function(viewfinderWidth: number, viewfinderHeight: number) {
            const minEdgePercentage = 0.7
            const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight)
            const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage)
            return { width: qrboxSize, height: qrboxSize }
          },
          aspectRatio: 1.0,
        },
        (decodedText: string) => {
          handleQRCodeScanned(decodedText)
        },
        () => {}
      )
    } catch (error: any) {
      console.error('Failed to start scanner:', error)
      toast({
        variant: 'destructive',
        title: 'Camera Error',
        description: error.message || 'Failed to access camera',
      })
      setIsScanning(false)
    }
  }

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop()
        await html5QrCodeRef.current.clear()
      } catch (error) {}
      html5QrCodeRef.current = null
    }
    setIsScanning(false)
  }

  const handleQRCodeScanned = async (qrCode: string) => {
    if (isProcessing || scannedOrder) return

    // Instant haptic feedback for perceived speed
    navigator.vibrate?.(50)
    
    setIsProcessing(true)
    
    try {
      await stopScanner()
      const order = await bartenderApi.scanQR(qrCode)
      setScannedOrder(order)
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Scan Failed',
        description: error.response?.data?.detail || 'Invalid QR code',
      })
      setIsProcessing(false)
      await startScanner()
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCashPaid = async () => {
    if (!scannedOrder || isCompleting) return
    
    setIsCompleting(true)
    try {
      // Confirm cash payment first
      await bartenderApi.confirmCashPayment(scannedOrder.id)
      // Then mark as given
      await bartenderApi.markGiven(scannedOrder.id)
      
      toast({
        title: 'Done!',
        description: 'Cash received, order completed',
      })
      
      // Reset for next scan
      setScannedOrder(null)
      await startScanner()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to complete order',
      })
    } finally {
      setIsCompleting(false)
    }
  }

  const handleGiven = async () => {
    if (!scannedOrder || isCompleting) return
    
    setIsCompleting(true)
    try {
      await bartenderApi.markGiven(scannedOrder.id)
      
      toast({
        title: 'Done!',
        description: 'Order completed',
      })
      
      // Reset for next scan
      setScannedOrder(null)
      await startScanner()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to complete order',
      })
    } finally {
      setIsCompleting(false)
    }
  }

  const handleScanNext = () => {
    setScannedOrder(null)
    startScanner()
  }

  // Show order view if we have a scanned order
  if (scannedOrder) {
    const isCash = scannedOrder.payment_method === 'cash'
    const isPendingPayment = scannedOrder.status === 'pending_payment'
    
    return (
      <div className="space-y-4 p-2">
        {/* Order Card */}
        <Card className="border-2 border-primary bg-card">
          <CardContent className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Order</p>
                <p className="font-mono text-sm">#{scannedOrder.id.slice(0, 8)}</p>
              </div>
              <Badge className={cn(
                'text-sm px-3 py-1',
                isCash 
                  ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
              )}>
                {isCash ? 'CASH' : 'CARD'}
              </Badge>
            </div>

            {/* Items */}
            <div className="border-t border-b border-border/40 py-3 space-y-2">
              {scannedOrder.items?.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-primary">{item.quantity}x</span>
                    <span className="font-medium">{item.drink_name || 'Drink'}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex items-center justify-between text-lg">
              <span className="font-medium">Total</span>
              <span className="font-bold">${parseFloat(String(scannedOrder.total_amount)).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Action Button */}
        {isCash && isPendingPayment ? (
          <Button 
            className="w-full h-16 text-xl font-bold gap-3 bg-amber-500 hover:bg-amber-600"
            onClick={handleCashPaid}
            disabled={isCompleting}
          >
            {isCompleting ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <DollarSign className="h-6 w-6" />
                CASH RECEIVED
              </>
            )}
          </Button>
        ) : (
          <Button 
            className="w-full h-16 text-xl font-bold gap-3 bg-emerald-500 hover:bg-emerald-600"
            onClick={handleGiven}
            disabled={isCompleting}
          >
            {isCompleting ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <CheckCircle className="h-6 w-6" />
                GIVEN
              </>
            )}
          </Button>
        )}

        {/* Scan Next */}
        <Button 
          variant="outline" 
          className="w-full"
          onClick={handleScanNext}
          disabled={isCompleting}
        >
          <Camera className="h-4 w-4 mr-2" />
          Scan Next Order
        </Button>
      </div>
    )
  }

  // Scanner View
  return (
    <div className="space-y-4">
      <Card className="border-border/40 bg-card/50 overflow-hidden">
        <CardContent className="p-0">
          <div className="relative aspect-square max-w-md mx-auto">
            <div
              id="qr-scanner-page"
              ref={scannerRef}
              className="w-full h-full bg-black/5"
            />
            
            {/* Loading */}
            {!isScanning && !isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-center text-white">
                  <Loader2 className="h-12 w-12 mx-auto mb-2 animate-spin" />
                  <p className="text-sm">Starting camera...</p>
                </div>
              </div>
            )}

            {/* Processing */}
            {isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-center text-white">
                  <Loader2 className="h-12 w-12 mx-auto mb-2 animate-spin" />
                  <p className="text-sm">Getting order...</p>
                </div>
              </div>
            )}

            {/* Scanning frame */}
            {isScanning && !isProcessing && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="border-2 border-primary rounded-lg w-[70%] max-w-[300px] aspect-square relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br-lg" />
                </div>
              </div>
            )}
          </div>

          <div className="p-4 text-center border-t border-border/40">
            <p className="text-sm text-muted-foreground">
              Point at customer&apos;s QR code
            </p>
          </div>
        </CardContent>
      </Card>

      {!isScanning && (
        <Button className="w-full" onClick={startScanner}>
          <Camera className="h-4 w-4 mr-2" />
          Start Camera
        </Button>
      )}
    </div>
  )
}
