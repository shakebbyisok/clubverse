import { apiClient } from './client'

export interface Soda {
  id: string
  club_id: string
  name: string
  brand_name?: string | null
  description?: string | null
  price: number
  price_addon: number  // Extra cost when mixed in cocktail
  image_url?: string | null
  display_order?: number
  is_available: boolean
  created_at: string
  updated_at?: string | null
}

export interface SodaCreate {
  club_id: string
  name: string
  brand_name?: string | null
  description?: string | null
  price?: number
  price_addon?: number
  image_url?: string | null
  display_order?: number
  is_available?: boolean
}

export interface SodaUpdate {
  name?: string
  brand_name?: string | null
  description?: string | null
  price?: number
  price_addon?: number
  image_url?: string | null
  display_order?: number
  is_available?: boolean
}

export interface BatchSodaCreate {
  name: string
  brand_name?: string | null
  price?: number
  price_addon?: number
  image_url?: string | null
}

export const sodasApi = {
  /**
   * Get all sodas for a club
   */
  getAll: async (clubId: string, includeUnavailable = false): Promise<Soda[]> => {
    const params = new URLSearchParams({ club_id: clubId })
    if (includeUnavailable) params.append('include_unavailable', 'true')
    const response = await apiClient.get<Soda[]>(`/sodas?${params}`)
    return response.data
  },

  /**
   * Get a single soda
   */
  get: async (sodaId: string): Promise<Soda> => {
    const response = await apiClient.get<Soda>(`/sodas/${sodaId}`)
    return response.data
  },

  /**
   * Create a new soda
   */
  create: async (data: SodaCreate): Promise<Soda> => {
    const response = await apiClient.post<Soda>('/sodas', data)
    return response.data
  },

  /**
   * Batch create sodas
   */
  batchCreate: async (clubId: string, sodas: BatchSodaCreate[]): Promise<Soda[]> => {
    const response = await apiClient.post<Soda[]>(
      `/sodas/batch?club_id=${clubId}`,
      { sodas }
    )
    return response.data
  },

  /**
   * Update a soda
   */
  update: async (sodaId: string, data: SodaUpdate): Promise<Soda> => {
    const response = await apiClient.put<Soda>(`/sodas/${sodaId}`, data)
    return response.data
  },

  /**
   * Delete a soda
   */
  delete: async (sodaId: string): Promise<void> => {
    await apiClient.delete(`/sodas/${sodaId}`)
  },

  /**
   * Toggle soda availability
   */
  toggleAvailability: async (sodaId: string, isAvailable: boolean): Promise<Soda> => {
    const response = await apiClient.patch<Soda>(
      `/sodas/${sodaId}/availability?is_available=${isAvailable}`
    )
    return response.data
  },
}

