'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Wine } from 'lucide-react'
import type { TopDrink } from '@/lib/api/analytics'
import { migrateImagePath } from '@/lib/utils/image-path'

interface TopDrinksChartProps {
  data: TopDrink[]
  loading?: boolean
}

export function TopDrinksChart({ data, loading }: TopDrinksChartProps) {
  const maxCount = Math.max(...data.map(d => d.count), 1)

  if (loading) {
    return (
      <Card className="bg-card/50 border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Top Selling Drinks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-muted/30 animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card/50 border-border/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Top Selling Drinks</CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">This week</p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-muted-foreground">
            <Wine className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">No sales data yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((drink, index) => (
              <div key={drink.id} className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center overflow-hidden">
                  {drink.image_url ? (
                    <img
                      src={migrateImagePath(drink.image_url) || drink.image_url}
                      alt={drink.name}
                      className="w-6 h-6 object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : (
                    <Wine className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate">{drink.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {drink.count} sold • ${drink.revenue.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${(drink.count / maxCount) * 100}%`,
                        backgroundColor: index === 0 ? 'hsl(142, 71%, 45%)' : 
                                        index === 1 ? 'hsl(199, 89%, 48%)' :
                                        index === 2 ? 'hsl(262, 83%, 58%)' :
                                        index === 3 ? 'hsl(38, 92%, 50%)' :
                                        'hsl(var(--muted-foreground))'
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}


