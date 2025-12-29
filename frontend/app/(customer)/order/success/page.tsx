'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle2, AlertCircle, RefreshCw, PartyPopper } from 'lucide-react'
import { ClubverseLoader } from '@/components/common/clubverse-loader'
import { ordersApi } from '@/lib/api/orders'
import { Order, OrderStatus } from '@/types'
import { QRCodeSVG } from 'qrcode.react'
import Image from 'next/image'

// Wake Lock types for screen brightness
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

export default function OrderSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const sessionId = searchParams.get('session_id')
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  // Enable wake lock to keep screen on while showing QR
  const enableWakeLock = useCallback(async () => {
    const nav = navigator as unknown as NavigatorWithWakeLock
    if (nav.wakeLock && !wakeLockRef.current) {
      try {
        const wakeLock = await nav.wakeLock.request('screen')
        wakeLockRef.current = wakeLock
        wakeLock.addEventListener('release', () => {
          wakeLockRef.current = null
        })
      } catch (err) {
        console.log('Wake lock not supported:', err)
      }
    }
  }, [])

  // Disable wake lock
  const disableWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release()
        wakeLockRef.current = null
      } catch (err) {}
    }
  }, [])

  // Check if order is completed
  const isCompleted = order?.status === OrderStatus.COMPLETED || order?.status === 'completed'

  // Poll for order status updates (1 second interval)
  useEffect(() => {
    if (!order?.id || isCompleted) return

    const pollStatus = async () => {
      try {
        const updated = await ordersApi.getOrder(order.id)
        if (updated.status !== order.status) {
          setOrder(updated)
          // Haptic feedback when status changes to completed
          if (updated.status === OrderStatus.COMPLETED || updated.status === 'completed') {
            navigator.vibrate?.([100, 50, 100])
          }
        }
      } catch (err) {
        // Silently fail polling - don't disrupt user experience
      }
    }

    pollingRef.current = setInterval(pollStatus, 1000) // 1 second polling

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [order?.id, order?.status, isCompleted])

  // Manage wake lock based on QR visibility
  useEffect(() => {
    if (order?.qr_code && !isCompleted) {
      enableWakeLock()
    } else {
      disableWakeLock()
    }

    return () => {
      disableWakeLock()
    }
  }, [order?.qr_code, isCompleted, enableWakeLock, disableWakeLock])

  // Initial fetch
  useEffect(() => {
    if (!sessionId) {
      setError('No session ID found')
      setIsLoading(false)
      return
    }

    const fetchOrder = async () => {
      try {
        const orderData = await ordersApi.getOrderBySession(sessionId)
        setOrder(orderData)
        setError(null)
        
        // If order doesn't have QR code yet, webhook might not have processed
        // Retry a few times
        if (!orderData.qr_code && retryCount < 5) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1)
          }, 2000)
        }
      } catch (err: any) {
        if (retryCount < 3) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1)
          }, 2000)
        } else {
          setError(err.response?.data?.detail || 'Failed to load order')
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrder()
  }, [sessionId, retryCount])

  const handleRefresh = () => {
    setIsLoading(true)
    setRetryCount(prev => prev + 1)
  }

  if (isLoading && retryCount === 0) {
    return <ClubverseLoader fullScreen />
  }

  if (error) {
    return (
      <div className="min-h-screen pb-16 bg-[#0a0a0a] flex flex-col items-center justify-center px-6">
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
          <AlertCircle className="h-10 w-10 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-white text-center mb-2">
          Something went wrong
        </h1>
        <p className="text-white/50 text-center text-sm mb-6">
          {error}
        </p>
        <button
          onClick={() => router.push('/clubs')}
          className="px-6 py-3 rounded-full bg-white text-black font-semibold text-[14px]"
        >
          Back to Venues
        </button>
      </div>
    )
  }

  // Order completed view
  if (isCompleted) {
    return (
      <div className="min-h-screen pb-16 bg-[#0a0a0a] flex flex-col items-center justify-center px-6">
        {/* Completed Icon */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center animate-pulse">
            <PartyPopper className="h-10 w-10 text-emerald-400" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white text-center mb-2">
          Order Complete!
        </h1>
        
        <p className="text-white/50 text-center text-sm mb-8">
          Your drinks are ready. Enjoy! 🎉
        </p>

        {/* Order Summary */}
        {order && (
          <div className="w-full max-w-xs mb-8">
            <div className="bg-white/[0.04] rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Order</span>
                <span className="text-white/60 font-mono">#{order.id.slice(0, 8)}</span>
              </div>
              {order.items?.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-white/60">
                    {item.quantity}× {item.drink_name}
                  </span>
                  <span className="text-white/40 tabular-nums">
                    ${(parseFloat(item.price_at_purchase) * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="border-t border-white/10 pt-2 flex justify-between">
                <span className="text-white/60 font-medium">Total</span>
                <span className="text-white font-bold tabular-nums">
                  ${parseFloat(order.total_amount).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Back Button */}
        <button
          onClick={() => router.push('/clubs')}
          className="w-full max-w-xs py-3.5 rounded-full bg-white text-black font-semibold text-[15px] hover:bg-white/90 transition-colors"
        >
          Order More
        </button>
      </div>
    )
  }

  // QR Code view (default - waiting for bartender)
  return (
    <div className="min-h-screen pb-16 bg-[#0a0a0a] flex flex-col items-center justify-center px-6">
      {/* Success Header */}
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#0a0a0a] flex items-center justify-center">
          <Image
            src="/assets/whiteicon.svg"
            alt="Clubverse"
            width={14}
            height={14}
            className="opacity-80"
            unoptimized
          />
        </div>
      </div>

      <h1 className="text-xl font-bold text-white text-center mb-1">
        Payment Successful
      </h1>
      
      {order?.club_name && (
        <p className="text-white/40 text-sm mb-6">{order.club_name}</p>
      )}

      {/* QR Code - Brightness boosted container */}
      {order?.qr_code ? (
        <div 
          className="bg-white rounded-2xl p-4 mb-6"
          style={{ filter: 'brightness(1.15)' }} // Slight brightness boost for dark environments
        >
          <QRCodeSVG
            value={order.qr_code}
            size={260}
            level="L"
            includeMargin={true}
            marginSize={4}
            fgColor="#000000"
            bgColor="#ffffff"
          />
        </div>
      ) : (
        <div className="bg-white/[0.06] rounded-2xl p-8 mb-6 flex flex-col items-center">
          <RefreshCw className={`h-8 w-8 text-white/30 mb-3 ${isLoading ? 'animate-spin' : ''}`} />
          <p className="text-white/50 text-sm text-center">
            Generating QR code...
          </p>
          <button
            onClick={handleRefresh}
            className="mt-3 text-xs text-white/40 hover:text-white/60"
          >
            Tap to refresh
          </button>
        </div>
      )}

      {/* Order Details */}
      {order && (
        <div className="text-center mb-8">
          <p className="text-[11px] uppercase tracking-widest text-white/30 mb-1">Total Paid</p>
          <p className="text-2xl font-bold text-white tabular-nums">
            ${parseFloat(order.total_amount).toFixed(2)}
          </p>
          {order.qr_code && (
            <p className="text-xs text-white/40 mt-3">
              Show this QR code to the bartender
            </p>
          )}
        </div>
      )}

      {/* Order Items */}
      {order?.items && order.items.length > 0 && (
        <div className="w-full max-w-xs mb-8">
          <div className="bg-white/[0.04] rounded-xl p-4 space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-white/60">
                  {item.quantity}× {item.drink_name}
                </span>
                <span className="text-white/40 tabular-nums">
                  ${(parseFloat(item.price_at_purchase) * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Polling indicator */}
      {order?.qr_code && !isCompleted && (
        <p className="text-[10px] text-white/20 mb-4 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          Waiting for bartender...
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={() => router.push('/clubs')}
          className="w-full py-3.5 rounded-full bg-white text-black font-semibold text-[15px] hover:bg-white/90 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  )
}
