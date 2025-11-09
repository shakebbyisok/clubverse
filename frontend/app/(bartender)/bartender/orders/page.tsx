'use client'

import { useState, useEffect } from 'react'
import { bartenderApi } from '@/lib/api/bartender'
import { Order, PaymentMethod } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, CreditCard, DollarSign, CheckCircle2, ShoppingBag } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export default function BartenderOrdersPage() {
  const { toast } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [confirmingPayment, setConfirmingPayment] = useState<string | null>(null)

  useEffect(() => {
    loadOrders()
    // Poll for new orders every 5 seconds
    const interval = setInterval(loadOrders, 5000)
    return () => clearInterval(interval)
  }, [])

  const loadOrders = async () => {
    try {
      const data = await bartenderApi.getOrders()
      setOrders(data)
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to load orders',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmPayment = async (orderId: string) => {
    setConfirmingPayment(orderId)
    try {
      await bartenderApi.confirmCashPayment(orderId)
      toast({
        title: 'Payment confirmed',
        description: 'Order marked as paid',
      })
      loadOrders()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to confirm payment',
      })
    } finally {
      setConfirmingPayment(null)
    }
  }

  const handleStatusUpdate = async (orderId: string, status: string) => {
    try {
      await bartenderApi.updateOrderStatus(orderId, status)
      toast({
        title: 'Status updated',
      })
      loadOrders()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to update status',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Orders</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage orders and confirm payments
        </p>
      </div>

      {orders.length === 0 ? (
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardContent className="py-12 text-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No orders at the moment</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const isCashPending = order.payment_method === PaymentMethod.CASH && order.status === 'pending_payment'
            const isPaid = order.status === 'paid'
            const isPreparing = order.status === 'preparing'
            const isReady = order.status === 'ready'

            return (
              <Card key={order.id} className="border-border/40 bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">
                        Order #{order.id.slice(0, 8)}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            order.payment_method === PaymentMethod.CASH
                              ? 'border-amber-500/50 text-amber-600 dark:text-amber-400'
                              : 'border-blue-500/50 text-blue-600 dark:text-blue-400'
                          )}
                        >
                          {order.payment_method === PaymentMethod.CASH ? (
                            <>
                              <DollarSign className="h-3 w-3 mr-1" />
                              Cash
                            </>
                          ) : (
                            <>
                              <CreditCard className="h-3 w-3 mr-1" />
                              Card
                            </>
                          )}
                        </Badge>
                        <Badge
                          className={cn(
                            'text-xs',
                            isCashPending && 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
                            isPaid && 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
                            isPreparing && 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
                            isReady && 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                          )}
                        >
                          {order.status === 'pending_payment' && 'Pending Payment'}
                          {order.status === 'paid' && 'Paid'}
                          {order.status === 'preparing' && 'Preparing'}
                          {order.status === 'ready' && 'Ready'}
                          {order.status === 'completed' && 'Completed'}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">
                        ${parseFloat(order.total_amount).toFixed(2)}
                      </div>
                      {order.qr_code && (
                        <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                          {order.qr_code.slice(0, 8)}...
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Order Items */}
                  <div className="space-y-1.5">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {item.quantity}x {item.drink_name || 'Unknown'}
                        </span>
                        <span className="font-medium">
                          ${(parseFloat(item.price_at_purchase) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-border/40">
                    {isCashPending && (
                      <Button
                        onClick={() => handleConfirmPayment(order.id)}
                        disabled={confirmingPayment === order.id}
                        className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                      >
                        {confirmingPayment === order.id ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Confirming...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Confirm Cash Payment
                          </>
                        )}
                      </Button>
                    )}
                    {isPaid && (
                      <Button
                        onClick={() => handleStatusUpdate(order.id, 'preparing')}
                        className="flex-1"
                        size="sm"
                      >
                        Start Preparing
                      </Button>
                    )}
                    {isPreparing && (
                      <Button
                        onClick={() => handleStatusUpdate(order.id, 'ready')}
                        className="flex-1"
                        size="sm"
                      >
                        Mark Ready
                      </Button>
                    )}
                    {isReady && (
                      <Button
                        onClick={() => handleStatusUpdate(order.id, 'completed')}
                        className="flex-1"
                        size="sm"
                      >
                        Complete Order
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

