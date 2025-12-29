'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ordersApi } from '@/lib/api/orders'
import { Order, OrderStatus } from '@/types'
import { ClubverseLoader } from '@/components/common/clubverse-loader'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { QRCodeSVG } from 'qrcode.react'
import { 
  ArrowLeft, 
  QrCode, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ChefHat,
  Package,
  CreditCard,
  Banknote,
  RefreshCw,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

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

const STATUS_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  pending_payment: { icon: Clock, color: 'text-amber-500', label: 'Pending' },
  paid: { icon: CreditCard, color: 'text-blue-500', label: 'Paid' },
  preparing: { icon: ChefHat, color: 'text-violet-500', label: 'Preparing' },
  ready: { icon: Package, color: 'text-emerald-500', label: 'Ready' },
  completed: { icon: CheckCircle2, color: 'text-green-500', label: 'Completed' },
  cancelled: { icon: XCircle, color: 'text-red-500', label: 'Cancelled' },
}

const PAGE_SIZE = 20

export default function CustomerOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  // Enable wake lock when QR is shown
  const enableWakeLock = useCallback(async () => {
    const nav = navigator as unknown as NavigatorWithWakeLock
    if (nav.wakeLock && !wakeLockRef.current) {
      try {
        const wakeLock = await nav.wakeLock.request('screen')
        wakeLockRef.current = wakeLock
        wakeLock.addEventListener('release', () => {
          wakeLockRef.current = null
        })
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

  // Manage wake lock based on QR modal
  useEffect(() => {
    if (selectedOrder) {
      enableWakeLock()
    } else {
      disableWakeLock()
    }
    return () => {
      disableWakeLock()
    }
  }, [selectedOrder, enableWakeLock, disableWakeLock])

  // Initial load - first page
  const loadInitialOrders = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true)
    try {
      const data = await ordersApi.getMyOrders(0, PAGE_SIZE)
      setOrders(data.orders)
      setHasMore(data.has_more)
    } catch (error) {
      console.error('Failed to load orders:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  // Load more orders (pagination)
  const loadMoreOrders = async () => {
    if (isLoadingMore || !hasMore) return
    
    setIsLoadingMore(true)
    try {
      const data = await ordersApi.getMyOrders(orders.length, PAGE_SIZE)
      setOrders(prev => [...prev, ...data.orders])
      setHasMore(data.has_more)
    } catch (error) {
      console.error('Failed to load more orders:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }

  // Refresh active orders only (for status updates)
  const refreshActiveOrders = async () => {
    // Only refresh first page to check for status updates on active orders
    try {
      const data = await ordersApi.getMyOrders(0, PAGE_SIZE)
      setOrders(prev => {
        // Merge: update existing orders, prepend new ones
        const existingIds = new Set(prev.map(o => o.id))
        const newOrders = data.orders.filter(o => !existingIds.has(o.id))
        const updatedOrders = prev.map(order => {
          const updated = data.orders.find(o => o.id === order.id)
          return updated || order
        })
        return [...newOrders, ...updatedOrders]
      })
      setHasMore(data.has_more || orders.length > PAGE_SIZE)
    } catch (error) {
      // Silently fail polling
    }
  }

  useEffect(() => {
    loadInitialOrders()

    // Poll for updates every 10 seconds (less aggressive than before)
    pollingRef.current = setInterval(refreshActiveOrders, 10000)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update selected order when orders change (for status updates)
  useEffect(() => {
    if (selectedOrder) {
      const updated = orders.find(o => o.id === selectedOrder.id)
      if (updated && updated.status !== selectedOrder.status) {
        setSelectedOrder(updated)
        // Haptic feedback on status change
        if (updated.status === 'completed') {
          navigator.vibrate?.([100, 50, 100])
        }
      }
    }
  }, [orders, selectedOrder])

  const canShowQR = (order: Order) => {
    const status = order.status as string
    return order.qr_code && !['completed', 'cancelled'].includes(status)
  }

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status] || STATUS_CONFIG.pending_payment
  }

  if (isLoading) {
    return <ClubverseLoader fullScreen />
  }

  return (
    <div className="min-h-screen pb-20 bg-[#0a0a0a]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-white/[0.06]">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-full hover:bg-white/[0.06] transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <h1 className="text-lg font-semibold text-white">My Orders</h1>
          <button
            onClick={() => loadInitialOrders(true)}
            className="ml-auto p-2 rounded-full hover:bg-white/[0.06] transition-colors"
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4 text-white/60", isRefreshing && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Orders List */}
      <div className="px-4 py-4 space-y-3">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 text-white/20" />
            </div>
            <p className="text-white/40 text-sm">No orders yet</p>
            <button
              onClick={() => router.push('/clubs')}
              className="mt-4 px-6 py-2.5 rounded-full bg-white text-black font-medium text-sm"
            >
              Browse Venues
            </button>
          </div>
        ) : (
          <>
            {orders.map((order) => {
              const config = getStatusConfig(order.status as string)
              const StatusIcon = config.icon
              const showQR = canShowQR(order)
              
              return (
                <div
                  key={order.id}
                  className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]"
                >
                  {/* Order Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-white/40 text-[11px] uppercase tracking-wider">
                        {order.club_name || 'Order'}
                      </p>
                      <p className="text-white font-mono text-sm">
                        #{order.id.slice(0, 8)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {order.payment_method === 'cash' ? (
                        <Banknote className="h-3.5 w-3.5 text-amber-500/60" />
                      ) : (
                        <CreditCard className="h-3.5 w-3.5 text-blue-500/60" />
                      )}
                      <div className={cn("flex items-center gap-1.5 text-xs", config.color)}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        <span>{config.label}</span>
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-1.5 mb-3">
                    {order.items?.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-white/60">
                          {item.quantity}× {item.drink_name}
                        </span>
                        <span className="text-white/40 tabular-nums">
                          ${(parseFloat(item.price_at_purchase) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {(order.items?.length || 0) > 3 && (
                      <p className="text-white/30 text-xs">
                        +{order.items!.length - 3} more items
                      </p>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                    <div>
                      <p className="text-white font-semibold tabular-nums">
                        ${parseFloat(order.total_amount).toFixed(2)}
                      </p>
                      <p className="text-white/30 text-[11px]">
                        {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    
                    {showQR && (
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black font-medium text-sm hover:bg-white/90 transition-colors"
                      >
                        <QrCode className="h-4 w-4" />
                        Show QR
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Load More Button */}
            {hasMore && (
              <div className="pt-2">
                <Button
                  onClick={loadMoreOrders}
                  disabled={isLoadingMore}
                  variant="outline"
                  className="w-full border-white/10 text-white/60 hover:text-white hover:bg-white/[0.06]"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More Orders'
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* QR Code Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-xs bg-[#0a0a0a] border-white/[0.08] p-0 gap-0 overflow-hidden">
          {selectedOrder?.qr_code && (
            <>
              {/* Status indicator */}
              {selectedOrder.status === 'completed' ? (
                <div className="p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Order Complete!</h3>
                  <p className="text-white/50 text-sm">Your drinks are ready 🎉</p>
                </div>
              ) : (
                <>
                  <div className="p-5">
                    <div 
                      className="bg-white rounded-2xl p-3 flex items-center justify-center"
                      style={{ filter: 'brightness(1.15)' }}
                    >
                      <QRCodeSVG
                        value={selectedOrder.qr_code}
                        size={200}
                        level="L"
                        includeMargin={true}
                        marginSize={4}
                        fgColor="#000000"
                        bgColor="#ffffff"
                      />
                    </div>
                  </div>
                  
                  <div className="px-6 pb-4 text-center">
                    <p className="text-[11px] uppercase tracking-widest text-white/30 mb-1">Total</p>
                    <p className="text-2xl font-bold text-white tabular-nums">
                      ${parseFloat(selectedOrder.total_amount).toFixed(2)}
                    </p>
                    <p className="text-[12px] text-white/40 mt-2 flex items-center justify-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      Show QR to bartender
                    </p>
                  </div>
                </>
              )}

              <div className="px-5 pb-5">
                <button
                  onClick={() => setSelectedOrder(null)} 
                  className="w-full py-3 rounded-full bg-white text-black font-semibold text-[14px] hover:bg-white/90 transition-colors"
                >
                  {selectedOrder.status === 'completed' ? 'Done' : 'Close'}
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
