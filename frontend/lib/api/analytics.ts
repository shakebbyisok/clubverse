import { apiClient } from './client'

export interface HourlyActivity {
  hour: number
  orders: number
  revenue: number
}

export interface OrdersByStatus {
  pending: number
  paid: number
  preparing: number
  ready: number
  completed: number
  cancelled: number
}

export interface TopDrink {
  id: string
  name: string
  count: number
  revenue: number
  image_url?: string
}

export interface RecentOrder {
  id: string
  customer_name?: string
  total_amount: number
  status: string
  payment_method: string
  items_count: number
  created_at: string
}

export interface ClubAnalytics {
  today_revenue: number
  today_orders: number
  week_revenue: number
  week_orders: number
  pending_orders: number
  active_bartenders: number
  total_drinks: number
  orders_by_status: OrdersByStatus
  hourly_activity: HourlyActivity[]
  top_drinks: TopDrink[]
  recent_orders: RecentOrder[]
  revenue_change_percent: number
  orders_change_percent: number
}

export interface ClubOrder {
  id: string
  customer_id: string
  customer_name?: string
  club_id: string
  total_amount: number
  payment_method: string
  status: string
  qr_code?: string
  created_at: string
  updated_at?: string
  completed_at?: string
  items: {
    id: string
    drink_id: string
    drink_name?: string
    quantity: number
    price_at_purchase: number
  }[]
}

export const analyticsApi = {
  /**
   * Get analytics for club owner's clubs
   */
  getAnalytics: async (): Promise<ClubAnalytics> => {
    const response = await apiClient.get<ClubAnalytics>('/clubs/analytics')
    return response.data
  },

  /**
   * Get orders for a specific club
   */
  getClubOrders: async (clubId: string, statusFilter?: string): Promise<ClubOrder[]> => {
    const params = statusFilter && statusFilter !== 'all' ? { status_filter: statusFilter } : {}
    const response = await apiClient.get<ClubOrder[]>(`/clubs/${clubId}/orders`, { params })
    return response.data
  },

  /**
   * Update order status
   */
  updateOrderStatus: async (clubId: string, orderId: string, status: string): Promise<void> => {
    await apiClient.put(`/clubs/${clubId}/orders/${orderId}/status`, { status })
  },
}


