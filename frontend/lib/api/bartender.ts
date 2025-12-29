import { apiClient } from './client'
import { Order, BartenderClubInfo } from '@/types'

export interface BartenderStats {
  club_name: string | null
  club_city: string | null
  today_orders: number
  pending_count: number
  preparing_count: number
  ready_count: number
  completed_count: number
  today_revenue: number
  recent_orders: Array<{
    id: string
    customer_name: string
    total_amount: number
    status: string
    items_count: number
    payment_method: string
    created_at: string
  }>
}

export const bartenderApi = {
  /**
   * Get dashboard stats for the bartender
   */
  getStats: async (): Promise<BartenderStats> => {
    const response = await apiClient.get<BartenderStats>('/bartender/stats')
    return response.data
  },

  /**
   * Get the club information for the current bartender
   */
  getMyClub: async (): Promise<BartenderClubInfo> => {
    const response = await apiClient.get<BartenderClubInfo>('/bartender/club')
    return response.data
  },

  /**
   * Get orders for bartender's club
   */
  getOrders: async (statusFilter?: string): Promise<Order[]> => {
    const params = statusFilter ? { status_filter: statusFilter } : {}
    const response = await apiClient.get<Order[]>('/bartender/orders', { params })
    return response.data
  },

  /**
   * Scan QR code
   */
  scanQR: async (qrCode: string): Promise<Order> => {
    const response = await apiClient.post<Order>('/bartender/scan', { qr_code: qrCode })
    return response.data
  },

  /**
   * Confirm cash payment received
   */
  confirmCashPayment: async (orderId: string): Promise<Order> => {
    const response = await apiClient.post<Order>(`/bartender/orders/${orderId}/confirm-payment`)
    return response.data
  },

  /**
   * Update order status
   */
  updateOrderStatus: async (orderId: string, status: string): Promise<Order> => {
    const response = await apiClient.put<Order>(`/bartender/orders/${orderId}/status`, { status })
    return response.data
  },

  /**
   * Mark order as given/completed (one-click complete)
   */
  markGiven: async (orderId: string): Promise<Order> => {
    const response = await apiClient.post<Order>(`/bartender/orders/${orderId}/given`)
    return response.data
  },
}

