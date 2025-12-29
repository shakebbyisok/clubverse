import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ordersApi, PaginatedOrders } from '../api/orders'
import { Order, OrderCreate, OrderStatusUpdate } from '@/types'
import { toast } from '@/hooks/use-toast'

export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
  myOrders: () => [...orderKeys.all, 'my'] as const,
}

/**
 * Get order by ID
 */
export function useOrder(orderId: string) {
  return useQuery({
    queryKey: orderKeys.detail(orderId),
    queryFn: () => ordersApi.getOrder(orderId),
    enabled: !!orderId,
    staleTime: 10000, // 10 seconds (orders change frequently)
    refetchInterval: 5000, // Poll every 5 seconds for real-time updates
  })
}

/**
 * Get current user's orders (paginated)
 * Returns { orders, has_more } from the API
 */
export function useMyOrders(skip: number = 0, limit: number = 20) {
  return useQuery<PaginatedOrders>({
    queryKey: [...orderKeys.myOrders(), skip, limit],
    queryFn: () => ordersApi.getMyOrders(skip, limit),
    staleTime: 30000,
  })
}

/**
 * Get just the orders array (convenience hook for simple usage)
 * Use this when you only need the orders and don't care about pagination
 */
export function useMyOrdersList(limit: number = 20) {
  const query = useMyOrders(0, limit)
  return {
    ...query,
    data: query.data?.orders ?? [],
  }
}

/**
 * Create order
 */
export function useCreateOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: OrderCreate) => ordersApi.createOrder(data),
    onSuccess: (newOrder) => {
      queryClient.setQueryData(orderKeys.detail(newOrder.id), newOrder)
      queryClient.invalidateQueries({ queryKey: orderKeys.myOrders() })
      
      toast({
        title: 'Order created!',
        description: 'Your order has been placed successfully.',
      })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to create order',
        description: error.response?.data?.detail || 'An error occurred',
      })
    },
  })
}

/**
 * Update order status (bartender/club owner)
 */
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: OrderStatusUpdate }) =>
      ordersApi.updateOrderStatus(orderId, data),
    onSuccess: (updatedOrder) => {
      queryClient.setQueryData(orderKeys.detail(updatedOrder.id), updatedOrder)
      queryClient.invalidateQueries({ queryKey: orderKeys.myOrders() })
      
      toast({
        title: 'Order updated',
        description: `Order status changed to ${updatedOrder.status}.`,
      })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to update order',
        description: error.response?.data?.detail || 'An error occurred',
      })
    },
  })
}
