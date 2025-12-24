'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ShoppingBag, Clock, CreditCard, Banknote, ArrowRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { RecentOrder } from '@/lib/api/analytics'
import { useRouter } from 'next/navigation'

interface RecentOrdersListProps {
  data: RecentOrder[]
  loading?: boolean
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  pending_payment: { bg: 'bg-amber-500/10', text: 'text-amber-500' },
  paid: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
  preparing: { bg: 'bg-violet-500/10', text: 'text-violet-500' },
  ready: { bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
  completed: { bg: 'bg-green-500/10', text: 'text-green-500' },
  cancelled: { bg: 'bg-red-500/10', text: 'text-red-500' },
}

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Pending',
  paid: 'Paid',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export function RecentOrdersList({ data, loading }: RecentOrdersListProps) {
  const router = useRouter()

  if (loading) {
    return (
      <Card className="bg-card/50 border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-muted/30 animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card/50 border-border/40">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1 h-7"
            onClick={() => router.push('/club/orders')}
          >
            View All
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-muted-foreground">
            <ShoppingBag className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">No orders yet</p>
            <p className="text-xs opacity-70">Orders will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.slice(0, 5).map((order) => {
              const style = STATUS_STYLES[order.status] || STATUS_STYLES.pending_payment
              const timeAgo = formatDistanceToNow(new Date(order.created_at), { addSuffix: true })

              return (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors cursor-pointer"
                  onClick={() => router.push('/club/orders')}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <ShoppingBag className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {order.customer_name || 'Customer'}
                        </span>
                        <Badge className={`${style.bg} ${style.text} text-[10px] px-1.5 py-0`}>
                          {STATUS_LABELS[order.status] || order.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{order.items_count} item{order.items_count !== 1 ? 's' : ''}</span>
                        <span>•</span>
                        {order.payment_method === 'card' ? (
                          <CreditCard className="h-3 w-3" />
                        ) : (
                          <Banknote className="h-3 w-3" />
                        )}
                        <Clock className="h-3 w-3 ml-1" />
                        <span>{timeAgo}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">${parseFloat(String(order.total_amount)).toFixed(2)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

