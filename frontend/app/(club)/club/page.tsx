'use client'

import { useState, useEffect } from 'react'
import { DollarSign, ShoppingBag, Clock, Users, Wine, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ClubverseLoader } from '@/components/common/clubverse-loader'
import { analyticsApi, ClubAnalytics } from '@/lib/api/analytics'
import { useToast } from '@/hooks/use-toast'
import {
  StatsCard,
  RevenueChart,
  TopDrinksChart,
  RecentOrdersList,
} from '@/components/features/club-dashboard'

export default function ClubDashboardPage() {
  const { toast } = useToast()
  const [analytics, setAnalytics] = useState<ClubAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadAnalytics = async () => {
    try {
      const data = await analyticsApi.getAnalytics()
      setAnalytics(data)
    } catch (error: any) {
      console.error('Failed to load analytics:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to load analytics',
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadAnalytics()
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadAnalytics, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleRefresh = () => {
    setIsRefreshing(true)
    loadAnalytics()
  }

  // Generate sparkline data from hourly activity
  const generateSparkline = (key: 'orders' | 'revenue') => {
    if (!analytics?.hourly_activity) return []
    return analytics.hourly_activity.map(h => h[key])
  }

  if (isLoading) {
    return <ClubverseLoader fullScreen />
  }

  return (
    <div className="space-y-4 p-4 lg:space-y-6 lg:p-6">
      {/* Actions */}
      <div className="flex items-center justify-end">
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

      {/* Stats Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Today's Revenue"
          value={`$${analytics?.today_revenue.toFixed(2) || '0.00'}`}
          change={analytics?.revenue_change_percent}
          icon={DollarSign}
          iconColor="text-emerald-500"
          chartColor="hsl(142, 71%, 45%)"
          chartData={generateSparkline('revenue')}
        />
        <StatsCard
          title="Today's Orders"
          value={analytics?.today_orders || 0}
          change={analytics?.orders_change_percent}
          icon={ShoppingBag}
          iconColor="text-blue-500"
          chartColor="hsl(217, 91%, 60%)"
          chartData={generateSparkline('orders')}
        />
        <StatsCard
          title="Pending Orders"
          value={analytics?.pending_orders || 0}
          icon={Clock}
          iconColor="text-amber-500"
          chartColor="hsl(38, 92%, 50%)"
        />
        <StatsCard
          title="Active Bartenders"
          value={analytics?.active_bartenders || 0}
          icon={Users}
          iconColor="text-violet-500"
          chartColor="hsl(262, 83%, 58%)"
        />
      </div>

      {/* Today's Activity Chart */}
      <RevenueChart
        data={analytics?.hourly_activity || []}
        loading={isLoading}
      />

      {/* Bottom Row */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Top Drinks */}
        <TopDrinksChart
          data={analytics?.top_drinks || []}
          loading={isLoading}
        />

        {/* Recent Orders */}
        <RecentOrdersList
          data={analytics?.recent_orders || []}
          loading={isLoading}
        />
      </div>

      {/* Quick Stats Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-8 py-4 border-t border-border/40">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Wine className="h-4 w-4" />
          <span>{analytics?.total_drinks || 0} drinks available</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShoppingBag className="h-4 w-4" />
          <span>{analytics?.week_orders || 0} orders this week</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <DollarSign className="h-4 w-4" />
          <span>${analytics?.week_revenue.toFixed(2) || '0.00'} this week</span>
        </div>
      </div>
    </div>
  )
}
