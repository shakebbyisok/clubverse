'use client'

import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'

interface StatsCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon: LucideIcon
  iconColor?: string
  chartData?: number[]
  chartColor?: string
  loading?: boolean
  onClick?: () => void
}

export function StatsCard({
  title,
  value,
  change,
  changeLabel = 'vs last week',
  icon: Icon,
  iconColor = 'text-primary',
  chartData = [],
  chartColor = 'hsl(142, 71%, 45%)',
  loading,
  onClick,
}: StatsCardProps) {
  // Generate chart data points
  const data = chartData.length > 0 
    ? chartData.map((v) => ({ value: v }))
    : Array.from({ length: 7 }, () => ({ value: Math.random() * 100 }))

  const isPositive = change !== undefined && change >= 0

  if (loading) {
    return (
      <Card className="p-5 bg-card/50 border-border/40">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            <div className="h-3 w-20 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-16 w-24 bg-muted animate-pulse rounded" />
        </div>
      </Card>
    )
  }

  return (
    <Card 
      className={cn(
        'p-5 bg-card/50 border-border/40 transition-all duration-200',
        onClick && 'cursor-pointer hover:bg-card/80 hover:border-primary/20'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Icon className={cn('h-4 w-4', iconColor)} />
            <span>{title}</span>
          </div>
          <p className="text-2xl font-bold">{value}</p>
          {change !== undefined && (
            <div className={cn(
              'flex items-center gap-1.5 text-xs',
              isPositive ? 'text-emerald-500' : 'text-rose-500'
            )}>
              {isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span className="font-medium">{Math.abs(change).toFixed(1)}%</span>
              <span className="text-muted-foreground">{changeLabel}</span>
            </div>
          )}
        </div>
        <div className="h-14 w-20">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id={`gradient-${title.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColor} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={chartColor}
                strokeWidth={2}
                fill={`url(#gradient-${title.replace(/\s/g, '')})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  )
}

