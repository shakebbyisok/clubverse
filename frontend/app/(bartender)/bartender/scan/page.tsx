'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Loader2, 
  Camera, 
  CheckCircle, 
  DollarSign, 
  ChevronUp, 
  ChevronDown,
  X,
  Banknote,
  CreditCard
} from 'lucide-react'
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
  
  // Batch scanning state
  const [scannedOrders, setScannedOrders] = useState<Order[]>([])
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set())
  const [isCompletingAll, setIsCompletingAll] = useState(false)
  const [isTrayExpanded, setIsTrayExpanded] = useState(true)
  
  const scannerRef = useRef<HTMLDivElement>(null)
  const html5QrCodeRef = useRef<any>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const isMountedRef = useRef(true)
  const scannedQRsRef = useRef<Set<string>>(new Set()) // Track scanned QR codes to prevent duplicates

  const enableWakeLock = useCallback(async () => {
    const nav = navigator as unknown as NavigatorWithWakeLock
    if (nav.wakeLock) {
      try {
        const wakeLock = await nav.wakeLock.request('screen')
        wakeLockRef.current = wakeLock
      } catch (err) {
        console.log('Wake lock not supported:', err)
      }
    }
  }, [])

  const disableWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release()
        wakeLockRef.current = null
      } catch (err) {}
    }
  }, [])

  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop()
        await html5QrCodeRef.current.clear()
      } catch (error) {}
      html5QrCodeRef.current = null
    }
    if (isMountedRef.current) {
      setIsScanning(false)
    }
  }, [])

  const startScanner = useCallback(async () => {
    if (!scannerRef.current || html5QrCodeRef.current) return

    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      
      if (isMountedRef.current) {
        setIsScanning(true)
      }
      
      const html5QrCode = new Html5Qrcode(scannerRef.current.id)
      html5QrCodeRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 30,
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
      if (isMountedRef.current) {
        setIsScanning(false)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast])

  // Handle QR scan - adds to queue, camera keeps running
  const handleQRCodeScanned = async (qrCode: string) => {
    // Check if already scanned (duplicate prevention)
    if (scannedQRsRef.current.has(qrCode)) {
      return // Silently ignore duplicates
    }

    if (isProcessing) return

    // Haptic feedback
    navigator.vibrate?.(50)
    
    setIsProcessing(true)
    
    try {
      const order = await bartenderApi.scanQR(qrCode)
      
      // Add to scanned set and orders array
      scannedQRsRef.current.add(qrCode)
      setScannedOrders(prev => [...prev, order])
      
      // Expand tray if collapsed
      setIsTrayExpanded(true)
      
      // Brief visual feedback
      toast({
        title: `+1 Order`,
        description: `${order.items?.map(i => `${i.quantity}× ${i.drink_name}`).join(', ') || 'Added to queue'}`,
      })
    } catch (error: any) {
      // Don't show error for already completed orders
      const errorMsg = error.response?.data?.detail || 'Invalid QR code'
      if (!errorMsg.includes('already')) {
        toast({
          variant: 'destructive',
          title: 'Scan Failed',
          description: errorMsg,
        })
      }
    } finally {
      setIsProcessing(false)
      // Camera keeps running - no need to restart
    }
  }

  // Complete a single order
  const handleCompleteOrder = async (order: Order) => {
    if (completingIds.has(order.id)) return
    
    setCompletingIds(prev => new Set(prev).add(order.id))
    
    try {
      const isCash = order.payment_method === 'cash'
      const isPendingPayment = order.status === 'pending_payment'
      
      if (isCash && isPendingPayment) {
        await bartenderApi.confirmCashPayment(order.id)
      }
      await bartenderApi.markGiven(order.id)
      
      // Remove from list with animation delay
      setTimeout(() => {
        setScannedOrders(prev => prev.filter(o => o.id !== order.id))
        scannedQRsRef.current.delete(order.qr_code || '')
        setCompletingIds(prev => {
          const next = new Set(prev)
          next.delete(order.id)
          return next
        })
      }, 300)
      
      // Success haptic
      navigator.vibrate?.(100)
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to complete order',
      })
      setCompletingIds(prev => {
        const next = new Set(prev)
        next.delete(order.id)
        return next
      })
    }
  }

  // Complete all card-paid orders at once
  const handleCompleteAll = async () => {
    const cardOrders = scannedOrders.filter(o => 
      o.payment_method !== 'cash' || o.status !== 'pending_payment'
    )
    
    if (cardOrders.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No orders to complete',
        description: 'Cash orders need individual confirmation',
      })
      return
    }
    
    setIsCompletingAll(true)
    
    try {
      // Process all in parallel
      await Promise.all(cardOrders.map(async (order) => {
        setCompletingIds(prev => new Set(prev).add(order.id))
        await bartenderApi.markGiven(order.id)
      }))
      
      // Remove completed orders
      const completedIds = new Set(cardOrders.map(o => o.id))
      setScannedOrders(prev => prev.filter(o => !completedIds.has(o.id)))
      cardOrders.forEach(o => scannedQRsRef.current.delete(o.qr_code || ''))
      
      // Success feedback
      navigator.vibrate?.([100, 50, 100])
      toast({
        title: `${cardOrders.length} orders completed!`,
      })
      
      setCompletingIds(new Set())
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Some orders failed to complete',
      })
    } finally {
      setIsCompletingAll(false)
    }
  }

  // Remove order from queue without completing
  const handleRemoveOrder = (order: Order) => {
    setScannedOrders(prev => prev.filter(o => o.id !== order.id))
    scannedQRsRef.current.delete(order.qr_code || '')
  }

  // Initial mount
  useEffect(() => {
    isMountedRef.current = true
    startScanner()
    enableWakeLock()

    return () => {
      isMountedRef.current = false
      disableWakeLock()
      stopScanner()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-restart camera on visibility/focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isScanning && !isProcessing) {
        startScanner()
      }
    }

    const handleFocus = () => {
      setTimeout(() => {
        if (!isScanning && !isProcessing && isMountedRef.current) {
          startScanner()
        }
      }, 100)
    }

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted && !isScanning && !isProcessing) {
        startScanner()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('pageshow', handlePageShow)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [isScanning, isProcessing, startScanner])

  const pendingCashOrders = scannedOrders.filter(o => 
    o.payment_method === 'cash' && o.status === 'pending_payment'
  )
  const completableOrders = scannedOrders.filter(o => 
    o.payment_method !== 'cash' || o.status !== 'pending_payment'
  )

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] overflow-hidden">
      {/* Order Tray */}
      {scannedOrders.length > 0 && (
        <div className="flex-shrink-0 bg-card border-b border-border/40">
          {/* Tray Header */}
          <button
            onClick={() => setIsTrayExpanded(!isTrayExpanded)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold">Orders</span>
              <Badge variant="secondary" className="rounded-full">
                {scannedOrders.length}
              </Badge>
              {pendingCashOrders.length > 0 && (
                <Badge variant="outline" className="rounded-full text-amber-500 border-amber-500/30">
                  {pendingCashOrders.length} cash
                </Badge>
              )}
            </div>
            {isTrayExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {/* Tray Content */}
          {isTrayExpanded && (
            <div className="max-h-48 overflow-y-auto px-3 pb-3 space-y-2">
              {scannedOrders.map((order) => {
                const isCash = order.payment_method === 'cash'
                const isPendingPayment = order.status === 'pending_payment'
                const isCompleting = completingIds.has(order.id)
                
                return (
                  <div
                    key={order.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg bg-muted/50 transition-all",
                      isCompleting && "opacity-50 scale-95"
                    )}
                  >
                    {/* Order Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-muted-foreground">
                          #{order.id.slice(0, 6)}
                        </span>
                        {isCash ? (
                          <Banknote className="h-3 w-3 text-amber-500" />
                        ) : (
                          <CreditCard className="h-3 w-3 text-blue-500" />
                        )}
                      </div>
                      <p className="text-sm font-medium truncate">
                        {order.items?.map(i => `${i.quantity}× ${i.drink_name}`).join(', ')}
                      </p>
                    </div>

                    {/* Total */}
                    <div className="text-right">
                      <p className="font-bold tabular-nums">
                        ${parseFloat(String(order.total_amount)).toFixed(2)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {/* Remove button */}
                      <button
                        onClick={() => handleRemoveOrder(order)}
                        className="p-2 rounded-full hover:bg-background/50 text-muted-foreground hover:text-foreground transition-colors"
                        disabled={isCompleting}
                      >
                        <X className="h-4 w-4" />
                      </button>

                      {/* Complete button */}
                      <button
                        onClick={() => handleCompleteOrder(order)}
                        disabled={isCompleting}
                        className={cn(
                          "p-2 rounded-full transition-colors",
                          isCash && isPendingPayment
                            ? "bg-amber-500 hover:bg-amber-600 text-white"
                            : "bg-emerald-500 hover:bg-emerald-600 text-white"
                        )}
                      >
                        {isCompleting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isCash && isPendingPayment ? (
                          <DollarSign className="h-4 w-4" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Scanner */}
      <div className="flex-1 min-h-0">
        <Card className="h-full border-0 rounded-none bg-transparent">
          <CardContent className="p-0 h-full">
            <div className="relative h-full">
              <div
                id="qr-scanner-page"
                ref={scannerRef}
                className="w-full h-full bg-black"
              />
              
              {/* Loading overlay */}
              {!isScanning && !isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                  <div className="text-center text-white">
                    <Loader2 className="h-12 w-12 mx-auto mb-2 animate-spin" />
                    <p className="text-sm">Starting camera...</p>
                  </div>
                </div>
              )}

              {/* Processing overlay - brief flash */}
              {isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/20 pointer-events-none">
                  <div className="w-24 h-24 rounded-full bg-emerald-500/30 flex items-center justify-center animate-ping">
                    <CheckCircle className="h-12 w-12 text-emerald-400" />
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

              {/* Scan hint */}
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <p className="text-white/60 text-sm bg-black/50 inline-block px-4 py-2 rounded-full">
                  {scannedOrders.length > 0 
                    ? `${scannedOrders.length} scanned • Keep scanning`
                    : 'Point at QR code'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Complete All Button */}
      {scannedOrders.length > 0 && (
        <div className="flex-shrink-0 p-4 bg-background border-t border-border/40">
          <Button
            onClick={handleCompleteAll}
            disabled={isCompletingAll || completableOrders.length === 0}
            className={cn(
              "w-full h-14 text-lg font-bold gap-2",
              completableOrders.length > 0
                ? "bg-emerald-500 hover:bg-emerald-600"
                : "bg-muted"
            )}
          >
            {isCompletingAll ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <CheckCircle className="h-5 w-5" />
                {completableOrders.length > 0 
                  ? `COMPLETE ALL (${completableOrders.length})`
                  : `${pendingCashOrders.length} CASH - TAP INDIVIDUALLY`
                }
              </>
            )}
          </Button>
          
          {pendingCashOrders.length > 0 && completableOrders.length > 0 && (
            <p className="text-center text-xs text-muted-foreground mt-2">
              {pendingCashOrders.length} cash order{pendingCashOrders.length > 1 ? 's' : ''} need individual confirmation
            </p>
          )}
        </div>
      )}

      {/* Start Camera Button (fallback) */}
      {!isScanning && scannedOrders.length === 0 && (
        <div className="flex-shrink-0 p-4">
          <Button className="w-full" onClick={startScanner}>
            <Camera className="h-4 w-4 mr-2" />
            Start Camera
          </Button>
        </div>
      )}
    </div>
  )
}
