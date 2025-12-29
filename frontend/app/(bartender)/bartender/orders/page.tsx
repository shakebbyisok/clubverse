'use client'

import { useState, useEffect } from 'react'
import { bartenderApi } from '@/lib/api/bartender'
import { Order } from '@/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  CreditCard, 
  DollarSign, 
  CheckCircle, 
  ShoppingBag, 
  Clock,
  Package,
  ChefHat
} from 'lucide-react'
import { ClubverseLoader } from '@/components/common/clubverse-loader'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export default function BartenderOrdersPage() {
  const { toast } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadOrders()
    // Poll for updates
    const interval = setInterval(loadOrders, 10000)
    return () => clearInterval(interval)
  }, [])

  const loadOrders = async () => {
    try {
      const data = await bartenderApi.getOrders()
      setOrders(data)
    } catch (error: any) {
      if (!isLoading) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.response?.data?.detail || 'Failed to load orders',
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return <Clock className="h-4 w-4" />
      case 'paid':
        return <DollarSign className="h-4 w-4" />
      case 'preparing':
        return <ChefHat className="h-4 w-4" />
      case 'ready':
        return <Package className="h-4 w-4" />
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      default:
        return <ShoppingBag className="h-4 w-4" />
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
      case 'paid':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
      case 'preparing':
        return 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20'
      case 'ready':
        return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
      case 'completed':
        return 'bg-muted text-muted-foreground'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return 'Awaiting Payment'
      case 'paid':
        return 'Paid'
      case 'preparing':
        return 'Preparing'
      case 'ready':
        return 'Ready'
      case 'completed':
        return 'Completed'
      default:
        return status
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    }
    
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    }
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  if (isLoading) {
    return <ClubverseLoader fullScreen />
  }

  // Group orders by status
  const activeOrders = orders.filter(o => !['completed', 'cancelled'].includes(o.status))
  const completedOrders = orders.filter(o => o.status === 'completed')

  return (
    <div className="space-y-6 p-4">
      {/* Active Orders */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          Active Orders ({activeOrders.length})
        </h3>
        
        {activeOrders.length === 0 ? (
          <Card className="border-border/40 bg-card/50">
            <CardContent className="py-8 text-center">
              <CheckCircle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No active orders</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Scan a QR code to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {activeOrders.map((order) => (
              <Card key={order.id} className="border-border/40 bg-card/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left - Order Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={cn('text-xs gap-1', getStatusStyle(order.status))}>
                          {getStatusIcon(order.status)}
                          {getStatusLabel(order.status)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {order.payment_method === 'cash' ? (
                            <><DollarSign className="h-3 w-3 mr-1" />Cash</>
                          ) : (
                            <><CreditCard className="h-3 w-3 mr-1" />Card</>
                          )}
                        </Badge>
                      </div>
                      
                      {/* Items */}
                      <div className="space-y-0.5">
                        {order.items.map((item, idx) => (
                          <p key={idx} className="text-sm">
                            <span className="font-medium">{item.quantity}x</span>{' '}
                            <span className="text-muted-foreground">{item.drink_name || 'Drink'}</span>
                          </p>
                        ))}
                      </div>
                    </div>

                    {/* Right - Price & Time */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold">
                        ${parseFloat(String(order.total_amount)).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTime(order.created_at)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Completed Orders */}
      {completedOrders.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Completed ({completedOrders.length})
          </h3>
          
          <div className="space-y-2">
            {completedOrders.slice(0, 10).map((order) => (
              <Card key={order.id} className="border-border/40 bg-card/30 opacity-70">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="text-sm">
                          {order.items.map((item, idx) => (
                            <span key={idx}>
                              {idx > 0 && ', '}
                              {item.quantity}x {item.drink_name}
                            </span>
                          ))}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(order.created_at)} at {formatTime(order.created_at)}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-medium">
                      ${parseFloat(String(order.total_amount)).toFixed(2)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {orders.length === 0 && (
        <Card className="border-border/40 bg-card/50">
          <CardContent className="py-12 text-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No orders yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Orders you scan will appear here
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
