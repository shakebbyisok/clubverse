import { apiClient } from './client'
import { Order, OrderCreate, OrderStatusUpdate } from '@/types'

export interface PaginatedOrders {
  orders: Order[]
  has_more: boolean
}

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
   * Get order by Stripe session ID (for success page)
   */
  getOrderBySession: async (sessionId: string): Promise<Order> => {
    const response = await apiClient.get<Order>(`/orders/session/${sessionId}`)
    return response.data
  },

  /**
   * Get current user's orders (paginated)
   * @param skip - Number of orders to skip (for pagination)
   * @param limit - Number of orders to fetch (default 20)
   */
  getMyOrders: async (skip: number = 0, limit: number = 20): Promise<PaginatedOrders> => {
    const response = await apiClient.get<PaginatedOrders>('/orders/me/history', {
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
