'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Loader2, 
  Camera, 
  CheckCircle, 
  DollarSign, 
  ArrowLeft,
  ArrowRight,
  Banknote,
  CreditCard,
  X
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

type Mode = 'scanning' | 'processing'

const COOLDOWN_MS = 1000 // 1 second cooldown between scans

export default function ScanPage() {
  const { toast } = useToast()
  
  // Mode state
  const [mode, setMode] = useState<Mode>('scanning')
  
  // Scanning state
  const [isScanning, setIsScanning] = useState(false)
  const [showScannedOverlay, setShowScannedOverlay] = useState(false)
  const [scannedOrders, setScannedOrders] = useState<Order[]>([])
  
  // Processing state
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set())
  const [isCompletingAll, setIsCompletingAll] = useState(false)
  
  // Refs
  const scannerRef = useRef<HTMLDivElement>(null)
  const html5QrCodeRef = useRef<any>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const isMountedRef = useRef(true)
  const scannedQRsRef = useRef<Set<string>>(new Set())
  const lastScanTimeRef = useRef(0)
  const isProcessingScanRef = useRef(false)

  // Wake lock
  const enableWakeLock = useCallback(async () => {
    const nav = navigator as unknown as NavigatorWithWakeLock
    if (nav.wakeLock && !wakeLockRef.current) {
      try {
        const wakeLock = await nav.wakeLock.request('screen')
        wakeLockRef.current = wakeLock
      } catch (err) {}
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

  // Scanner controls
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

  // Handle QR scan with cooldown and deduplication
  const handleQRCodeScanned = async (qrCode: string) => {
    const now = Date.now()
    
    // Check 1: Cooldown
    if (now - lastScanTimeRef.current < COOLDOWN_MS) return
    
    // Check 2: Already scanned in this session
    if (scannedQRsRef.current.has(qrCode)) return
    
    // Check 3: Already processing a scan
    if (isProcessingScanRef.current) return
    
    // Lock and set timestamp
    isProcessingScanRef.current = true
    lastScanTimeRef.current = now
    scannedQRsRef.current.add(qrCode)
    
    // Haptic feedback
    navigator.vibrate?.(50)
    
    // Show scanned overlay
    setShowScannedOverlay(true)
    
    try {
      const order = await bartenderApi.scanQR(qrCode)
      
      // Add to list
      setScannedOrders(prev => [...prev, order])
      
      // Hide overlay after delay
      setTimeout(() => {
        setShowScannedOverlay(false)
      }, 600)
      
    } catch (error: any) {
      // Remove from set if failed (allow retry)
      scannedQRsRef.current.delete(qrCode)
      
      const errorMsg = error.response?.data?.detail || 'Invalid QR code'
      
      // Hide overlay
      setShowScannedOverlay(false)
      
      // Only show error if not a duplicate/already completed
      if (!errorMsg.toLowerCase().includes('already') && !errorMsg.toLowerCase().includes('completed')) {
        toast({
          variant: 'destructive',
          title: 'Scan Failed',
          description: errorMsg,
        })
      }
    } finally {
      isProcessingScanRef.current = false
    }
  }

  // Transition to processing mode
  const handleDoneScanning = async () => {
    await stopScanner()
    setMode('processing')
  }

  // Go back to scanning mode
  const handleBackToScan = async () => {
    setMode('scanning')
    // Don't clear orders - keep them
    setTimeout(() => {
      startScanner()
    }, 100)
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
      
      // Remove from list
      setScannedOrders(prev => prev.filter(o => o.id !== order.id))
      scannedQRsRef.current.delete(order.qr_code || '')
      
      // Success haptic
      navigator.vibrate?.(100)
      
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to complete order',
      })
    } finally {
      setCompletingIds(prev => {
        const next = new Set(prev)
        next.delete(order.id)
        return next
      })
    }
  }

  // Complete all card orders
  const handleCompleteAllCard = async () => {
    const cardOrders = scannedOrders.filter(o => 
      o.payment_method !== 'cash' || o.status !== 'pending_payment'
    )
    
    if (cardOrders.length === 0) return
    
    setIsCompletingAll(true)
    
    try {
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

  // Remove order from queue
  const handleRemoveOrder = (order: Order) => {
    setScannedOrders(prev => prev.filter(o => o.id !== order.id))
    scannedQRsRef.current.delete(order.qr_code || '')
  }

  // Start new session (clear all)
  const handleNewSession = () => {
    setScannedOrders([])
    scannedQRsRef.current.clear()
    setMode('scanning')
    setTimeout(() => {
      startScanner()
    }, 100)
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

  // Auto-restart camera on visibility (only in scanning mode)
  useEffect(() => {
    if (mode !== 'scanning') return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isScanning) {
        startScanner()
      }
    }

    const handleFocus = () => {
      setTimeout(() => {
        if (!isScanning && isMountedRef.current) {
          startScanner()
        }
      }, 100)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [mode, isScanning, startScanner])

  // Calculate totals
  const totalAmount = scannedOrders.reduce((sum, o) => sum + parseFloat(String(o.total_amount)), 0)
  const cardOrders = scannedOrders.filter(o => o.payment_method !== 'cash' || o.status !== 'pending_payment')
  const cashOrders = scannedOrders.filter(o => o.payment_method === 'cash' && o.status === 'pending_payment')

  // ============================================
  // PROCESSING MODE UI
  // ============================================
  if (mode === 'processing') {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border/40">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={handleBackToScan}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Scan More
            </button>
            <h1 className="font-semibold">Process Orders</h1>
            <div className="w-20" /> {/* Spacer */}
          </div>
        </div>

        {/* Orders List */}
        <div className="p-4 space-y-3 pb-32">
          {scannedOrders.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-lg font-medium mb-1">All done!</p>
              <p className="text-muted-foreground text-sm mb-4">No more orders to process</p>
              <Button onClick={handleNewSession}>
                <Camera className="h-4 w-4 mr-2" />
                Start New Session
              </Button>
            </div>
          ) : (
            scannedOrders.map((order) => {
              const isCash = order.payment_method === 'cash'
              const isPendingPayment = order.status === 'pending_payment'
              const isCompleting = completingIds.has(order.id)
              
              return (
                <div
                  key={order.id}
                  className={cn(
                    "bg-card border border-border/40 rounded-xl p-4 transition-all",
                    isCompleting && "opacity-50 scale-[0.98]"
                  )}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-muted-foreground">
                        #{order.id.slice(0, 8)}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs",
                          isCash 
                            ? "border-amber-500/30 text-amber-500" 
                            : "border-blue-500/30 text-blue-500"
                        )}
                      >
                        {isCash ? (
                          <><Banknote className="h-3 w-3 mr-1" /> CASH</>
                        ) : (
                          <><CreditCard className="h-3 w-3 mr-1" /> CARD</>
                        )}
                      </Badge>
                    </div>
                    <button
                      onClick={() => handleRemoveOrder(order)}
                      className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      disabled={isCompleting}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Items */}
                  <div className="space-y-1.5 mb-3">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>
                          <span className="font-semibold text-primary">{item.quantity}×</span>{' '}
                          {item.drink_name}
                        </span>
                        <span className="text-muted-foreground tabular-nums">
                          ${(parseFloat(item.price_at_purchase) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-border/40">
                    <div>
                      <p className="text-lg font-bold tabular-nums">
                        ${parseFloat(String(order.total_amount)).toFixed(2)}
                      </p>
                    </div>
                    
                    <Button
                      onClick={() => handleCompleteOrder(order)}
                      disabled={isCompleting}
                      className={cn(
                        "gap-2",
                        isCash && isPendingPayment
                          ? "bg-amber-500 hover:bg-amber-600"
                          : "bg-emerald-500 hover:bg-emerald-600"
                      )}
                    >
                      {isCompleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isCash && isPendingPayment ? (
                        <>
                          <DollarSign className="h-4 w-4" />
                          Cash Received
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Given
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Complete All Button */}
        {scannedOrders.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border/40">
            {cardOrders.length > 0 && (
              <Button
                onClick={handleCompleteAllCard}
                disabled={isCompletingAll}
                className="w-full h-14 text-lg font-bold gap-2 bg-emerald-500 hover:bg-emerald-600 mb-2"
              >
                {isCompletingAll ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    COMPLETE ALL CARD ({cardOrders.length})
                  </>
                )}
              </Button>
            )}
            {cashOrders.length > 0 && (
              <p className="text-center text-xs text-muted-foreground">
                {cashOrders.length} cash order{cashOrders.length > 1 ? 's' : ''} need individual confirmation
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  // ============================================
  // SCANNING MODE UI
  // ============================================
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Scanner */}
      <div className="relative flex-shrink-0 aspect-square max-h-[50vh] bg-black">
        <div
          id="qr-scanner-page"
          ref={scannerRef}
          className="w-full h-full"
        />
        
        {/* Loading overlay */}
        {!isScanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center text-white">
              <Loader2 className="h-12 w-12 mx-auto mb-2 animate-spin" />
              <p className="text-sm">Starting camera...</p>
            </div>
          </div>
        )}

        {/* Scanned overlay */}
        {showScannedOverlay && (
          <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/90 z-10">
            <div className="text-center text-white">
              <CheckCircle className="h-16 w-16 mx-auto mb-2" />
              <p className="text-xl font-bold">Scanned!</p>
            </div>
          </div>
        )}

        {/* Scanning frame */}
        {isScanning && !showScannedOverlay && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="border-2 border-white/80 rounded-lg w-[70%] max-w-[280px] aspect-square relative">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
            </div>
          </div>
        )}
      </div>

      {/* Summary bar */}
      <div className="flex-shrink-0 bg-card border-y border-border/40 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold">{scannedOrders.length}</span>
            <div className="text-sm">
              <p className="font-medium">orders scanned</p>
              {scannedOrders.length > 0 && (
                <p className="text-muted-foreground">${totalAmount.toFixed(2)} total</p>
              )}
            </div>
          </div>
          {cashOrders.length > 0 && (
            <Badge variant="outline" className="border-amber-500/30 text-amber-500">
              {cashOrders.length} cash
            </Badge>
          )}
        </div>
      </div>

      {/* Scanned orders list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {scannedOrders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Point camera at customer QR codes</p>
            <p className="text-xs mt-1">Orders will appear here</p>
          </div>
        ) : (
          scannedOrders.map((order) => {
            const isCash = order.payment_method === 'cash'
            
            return (
              <div
                key={order.id}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-xs text-muted-foreground">
                      #{order.id.slice(0, 6)}
                    </span>
                    {isCash ? (
                      <Banknote className="h-3 w-3 text-amber-500" />
                    ) : (
                      <CreditCard className="h-3 w-3 text-blue-500" />
                    )}
                  </div>
                  <p className="text-sm truncate">
                    {order.items?.map(i => `${i.quantity}× ${i.drink_name}`).join(', ')}
                  </p>
                </div>
                <p className="font-bold tabular-nums">
                  ${parseFloat(String(order.total_amount)).toFixed(2)}
                </p>
              </div>
            )
          })
        )}
      </div>

      {/* Done Scanning button */}
      <div className="flex-shrink-0 p-4 bg-background border-t border-border/40">
        <Button
          onClick={handleDoneScanning}
          disabled={scannedOrders.length === 0}
          className="w-full h-14 text-lg font-bold gap-2"
        >
          <ArrowRight className="h-5 w-5" />
          DONE SCANNING ({scannedOrders.length})
        </Button>
      </div>
    </div>
  )
}
