'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ShoppingBag, 
  QrCode, 
  Building2, 
  Clock, 
  CheckCircle,
  DollarSign,
  ChefHat,
  Package,
  RefreshCw
} from 'lucide-react'
import { ClubverseLoader } from '@/components/common/clubverse-loader'
import { bartenderApi, BartenderStats } from '@/lib/api/bartender'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export default function BartenderDashboardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [stats, setStats] = useState<BartenderStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadStats = async () => {
    try {
      const data = await bartenderApi.getStats()
      setStats(data)
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to load dashboard',
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadStats()
    // Auto-refresh every 15 seconds
    const interval = setInterval(loadStats, 15000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRefresh = () => {
    setIsRefreshing(true)
    loadStats()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
      case 'preparing':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
      case 'ready':
        return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
      case 'pending_payment':
        return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
      default:
        return 'bg-muted text-muted-foreground'
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

  if (isLoading) {
    return <ClubverseLoader fullScreen />
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span className="text-sm">{stats?.club_name}</span>
            {stats?.club_city && (
              <span className="text-sm text-muted-foreground/60">• {stats.club_city}</span>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card 
          className="border-primary/30 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors"
          onClick={() => router.push('/bartender/scan')}
        >
          <CardContent className="flex items-center gap-4 p-6">
            <div className="p-3 rounded-xl bg-primary/10">
              <QrCode className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Scan Order</h3>
              <p className="text-sm text-muted-foreground">
                Scan customer QR code
              </p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-border/40 bg-card/50 cursor-pointer hover:bg-card/70 transition-colors"
          onClick={() => router.push('/bartender/orders')}
        >
          <CardContent className="flex items-center gap-4 p-6">
            <div className="p-3 rounded-xl bg-muted">
              <ShoppingBag className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">View Orders</h3>
              <p className="text-sm text-muted-foreground">
                Manage all orders
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/40 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending</p>
                <p className="text-2xl font-bold mt-1">{stats?.pending_count || 0}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Preparing</p>
                <p className="text-2xl font-bold mt-1">{stats?.preparing_count || 0}</p>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/10">
                <ChefHat className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Ready</p>
                <p className="text-2xl font-bold mt-1">{stats?.ready_count || 0}</p>
              </div>
              <div className="p-2 rounded-lg bg-green-500/10">
                <Package className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Completed</p>
                <p className="text-2xl font-bold mt-1">{stats?.completed_count || 0}</p>
              </div>
              <div className="p-2 rounded-lg bg-violet-500/10">
                <CheckCircle className="h-5 w-5 text-violet-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/40 bg-card/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today&apos;s Orders</p>
                <p className="text-3xl font-bold mt-1">{stats?.today_orders || 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <ShoppingBag className="h-8 w-8 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today&apos;s Revenue</p>
                <p className="text-3xl font-bold mt-1">${stats?.today_revenue.toFixed(2) || '0.00'}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <DollarSign className="h-8 w-8 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card className="border-border/40 bg-card/50">
        <CardHeader>
          <CardTitle className="text-base">Active Orders</CardTitle>
          <CardDescription>Orders that need attention</CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.recent_orders && stats.recent_orders.length > 0 ? (
            <div className="space-y-3">
              {stats.recent_orders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/40 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/bartender/orders?order=${order.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {order.customer_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.items_count} item{order.items_count !== 1 ? 's' : ''} • {formatTime(order.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={cn('text-xs', getStatusColor(order.status))}>
                      {order.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </Badge>
                    <span className="text-sm font-medium">${order.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No active orders</p>
              <p className="text-xs text-muted-foreground/60 mt-1">New orders will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
