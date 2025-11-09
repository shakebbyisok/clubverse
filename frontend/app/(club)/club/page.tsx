'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Wine, ShoppingBag, TrendingUp } from 'lucide-react'

export default function ClubDashboardPage() {
  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Orders</CardTitle>
            <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">156</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              +12% from last week
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
            <CardTitle className="text-xs font-medium text-muted-foreground">Active Bartenders</CardTitle>
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">8</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Currently working
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Drinks</CardTitle>
            <Wine className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">42</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Available menu items
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
            <CardTitle className="text-xs font-medium text-muted-foreground">Revenue</CardTitle>
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">$2,450</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Today's sales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base">Recent Orders</CardTitle>
          <CardDescription>Latest orders from customers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-[13px] text-muted-foreground text-center py-6">
            No recent orders. They will appear here once customers start ordering.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

