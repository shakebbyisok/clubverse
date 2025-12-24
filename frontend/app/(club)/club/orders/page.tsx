'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ShoppingBag,
  Clock,
  CreditCard,
  Banknote,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ClubverseLoader } from '@/components/common/clubverse-loader'
import { analyticsApi, ClubOrder } from '@/lib/api/analytics'
import { clubsApi } from '@/lib/api/clubs'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready' },
  { value: 'completed', label: 'Completed' },
]

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

const PAGE_SIZE = 20

export default function OrdersPage() {
  const { toast } = useToast()
  const [clubId, setClubId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalOrders, setTotalOrders] = useState(0)

  const [allOrders, setAllOrders] = useState<ClubOrder[]>([])

  const loadOrders = useCallback(async () => {
    if (!clubId) return

    try {
      // Always fetch all orders, filtering is done client-side for instant feedback
      const data = await analyticsApi.getClubOrders(clubId, 'all')
      setAllOrders(data)
      setTotalOrders(data.length)
    } catch (error: any) {
      console.error('Failed to load orders:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to load orders',
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [clubId, toast])

  useEffect(() => {
    const fetchClub = async () => {
      try {
        const club = await clubsApi.getMyClub()
        if (club?.id) {
          setClubId(club.id)
        }
      } catch (error) {
        console.error('Failed to fetch club:', error)
        setIsLoading(false)
      }
    }
    fetchClub()
  }, [])


  useEffect(() => {
    if (clubId) {
      loadOrders()
      const interval = setInterval(() => {
        loadOrders()
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [clubId, loadOrders])

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter])

  const handleRefresh = () => {
    setIsRefreshing(true)
    loadOrders()
  }

  const filteredOrders = useMemo(() => {
    return statusFilter === 'all'
      ? allOrders
      : allOrders.filter(o => o.status === statusFilter)
  }, [allOrders, statusFilter])

  const filteredCount = filteredOrders.length
  const totalPages = Math.ceil(filteredCount / PAGE_SIZE)

  // Calculate displayed orders (no useEffect needed, just compute directly)
  const displayedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE
    const endIndex = startIndex + PAGE_SIZE
    return filteredOrders.slice(startIndex, endIndex)
  }, [filteredOrders, currentPage])

  if (isLoading) {
    return <ClubverseLoader fullScreen />
  }

  return (
    <div className="space-y-4 p-4 lg:space-y-6 lg:p-6">
      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:justify-between">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <Tabs value={statusFilter} onValueChange={(v) => {
            setStatusFilter(v)
            setCurrentPage(1)
          }}>
            <TabsList className="bg-card/50 border border-border/40 h-9 w-max sm:w-auto">
              {STATUS_TABS.map(tab => {
                const count = tab.value === 'all'
                  ? allOrders.length
                  : allOrders.filter(o => o.status === tab.value).length
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="text-xs gap-1.5 h-7 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    {tab.label}
                    {count > 0 && (
                      <span className="text-[10px] opacity-70">({count})</span>
                    )}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </Tabs>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2 h-9"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Orders Table */}
      {filteredOrders.length === 0 ? (
        <Card className="bg-card/50 border-border/40">
          <CardContent className="py-16">
            <div className="text-center">
              <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground/30" />
              <h3 className="mt-4 text-base font-medium">No orders</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {statusFilter === 'all'
                  ? 'Orders will appear here'
                  : `No ${STATUS_LABELS[statusFilter]?.toLowerCase() || statusFilter} orders`}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card/50 border-border/40 overflow-hidden flex flex-col">
          {/* Scrollable Table Container */}
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-400px)]">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-muted/30 backdrop-blur-sm">
                <tr className="border-b border-border/40">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Customer</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Items</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Total</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Payment</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {displayedOrders.map(order => {
                  const style = STATUS_STYLES[order.status] || STATUS_STYLES.pending_payment
                  const timeAgo = formatDistanceToNow(new Date(order.created_at), { addSuffix: true })
                  const itemsSummary = order.items.map(i => `${i.quantity}x ${i.drink_name || 'Item'}`).join(', ')

                  return (
                    <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium">
                          {order.customer_name || 'Customer'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted-foreground truncate max-w-[200px] block" title={itemsSummary}>
                          {itemsSummary.length > 40 ? `${itemsSummary.slice(0, 40)}...` : itemsSummary}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold tabular-nums">
                          ${parseFloat(String(order.total_amount)).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          {order.payment_method === 'card' ? (
                            <CreditCard className="h-3.5 w-3.5" />
                          ) : (
                            <Banknote className="h-3.5 w-3.5" />
                          )}
                          <span className="capitalize">{order.payment_method}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={cn('text-[10px] px-2 py-0.5 font-medium', style.bg, style.text)}>
                          {STATUS_LABELS[order.status] || order.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{timeAgo}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:justify-between px-4 py-3 border-t border-border/40 bg-muted/20">
              <div className="text-xs text-muted-foreground">
                Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, filteredCount)} of {filteredCount} orders
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 gap-1"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </Button>
                <div className="text-xs text-muted-foreground px-2">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 gap-1"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground">
        {filteredCount} order{filteredCount !== 1 ? 's' : ''} • Auto-refreshes every 30s
      </div>
    </div>
  )
}
