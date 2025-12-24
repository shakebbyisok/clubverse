'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts'
import type { OrdersByStatus } from '@/lib/api/analytics'

interface OrdersByStatusChartProps {
  data: OrdersByStatus
  loading?: boolean
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',   // amber
  paid: '#3b82f6',      // blue
  preparing: '#8b5cf6', // violet
  ready: '#22c55e',     // green
  completed: '#10b981', // emerald
  cancelled: '#ef4444', // red
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  paid: 'Paid',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export function OrdersByStatusChart({ data, loading }: OrdersByStatusChartProps) {
  const chartData = Object.entries(data).map(([status, count]) => ({
    status,
    label: STATUS_LABELS[status] || status,
    count,
    color: STATUS_COLORS[status] || '#888',
  })).filter(d => d.count > 0)

  const total = Object.values(data).reduce((sum, count) => sum + count, 0)

  if (loading) {
    return (
      <Card className="bg-card/50 border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Orders by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] bg-muted/30 animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card/50 border-border/40">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Orders by Status</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {total} orders this week
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground">
            <p className="text-sm">No orders yet</p>
          </div>
        ) : (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis 
                  type="category" 
                  dataKey="label" 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  width={70}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number | undefined) => [value ?? 0, 'Orders']}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

