import { apiClient } from './client'
import { Order } from '@/types'

export const bartenderApi = {
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
}

