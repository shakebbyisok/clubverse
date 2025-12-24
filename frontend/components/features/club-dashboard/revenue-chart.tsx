'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, TrendingUp } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { HourlyActivity } from '@/lib/api/analytics'

interface RevenueChartProps {
  data: HourlyActivity[]
  loading?: boolean
}

export function RevenueChart({ data, loading }: RevenueChartProps) {
  // Format hour for display
  const chartData = data.map(d => ({
    ...d,
    hourLabel: d.hour === 0 ? '12am' : d.hour === 12 ? '12pm' : d.hour > 12 ? `${d.hour - 12}pm` : `${d.hour}am`,
  }))

  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0)
  const totalOrders = data.reduce((sum, d) => sum + d.orders, 0)
  const peakHour = data.reduce((max, d) => d.orders > max.orders ? d : max, data[0] || { hour: 0, orders: 0 })
  const peakHourLabel = peakHour?.hour === 0 ? '12am' : peakHour?.hour === 12 ? '12pm' : peakHour?.hour > 12 ? `${peakHour.hour - 12}pm` : `${peakHour?.hour}am`

  if (loading) {
    return (
      <Card className="bg-card/50 border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Today's Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] bg-muted/30 animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    )
  }

  const hasData = data.some(d => d.orders > 0 || d.revenue > 0)

  return (
    <Card className="bg-card/50 border-border/40">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Today's Activity</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalOrders} orders • ${totalRevenue.toFixed(2)} revenue
            </p>
          </div>
          {peakHour && peakHour.orders > 0 && (
            <Badge variant="outline" className="text-xs gap-1 bg-background/50">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              Peak: {peakHourLabel}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground">
            <Activity className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">No activity today</p>
            <p className="text-xs opacity-70">Orders will appear here</p>
          </div>
        ) : (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="hourLabel" 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'revenue' ? `$${value.toFixed(2)}` : value,
                    name === 'revenue' ? 'Revenue' : 'Orders'
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="orders"
                  stackId="1"
                  stroke="hsl(262, 83%, 58%)"
                  strokeWidth={2}
                  fill="url(#ordersGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

