import { apiClient } from './client'
import { Order, OrderCreate, OrderStatusUpdate } from '@/types'

export const ordersApi = {
  /**
   * Create new order (customer)
   */
  createOrder: async (data: OrderCreate): Promise<Order> => {
    const response = await apiClient.post<Order>('/orders', data)
    return response.data
  },

  /**
   * Get order by ID
   */
  getOrder: async (orderId: string): Promise<Order> => {
    const response = await apiClient.get<Order>(`/orders/${orderId}`)
    return response.data
  },

  /**
   * Get current user's orders
   */
  getMyOrders: async (skip: number = 0, limit: number = 50): Promise<Order[]> => {
    const response = await apiClient.get<Order[]>('/orders/me/history', {
      params: { skip, limit },
    })
    return response.data
  },

  /**
   * Update order status (bartender/club owner)
   */
  updateOrderStatus: async (orderId: string, data: OrderStatusUpdate): Promise<Order> => {
    const response = await apiClient.put<Order>(`/orders/${orderId}/status`, data)
    return response.data
  },
}

