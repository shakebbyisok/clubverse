import { apiClient } from './client'

export type LiquorType = 'vodka' | 'gin' | 'rum' | 'whisky' | 'tequila' | 'brandy' | 'liqueur' | 'other'

export interface Liquor {
  id: string
  club_id: string
  name: string
  brand_name?: string | null
  liquor_type: LiquorType
  description?: string | null
  shot_price: number
  image_url?: string | null
  display_order?: number
  is_available: boolean
  created_at: string
  updated_at?: string | null
  shot_drink_id?: string | null
}

export interface LiquorCreate {
  club_id: string
  name: string
  brand_name?: string | null
  liquor_type?: LiquorType
  description?: string | null
  shot_price: number
  image_url?: string | null
  display_order?: number
  is_available?: boolean
  skip_shot_creation?: boolean
}

export interface LiquorUpdate {
  name?: string
  brand_name?: string | null
  liquor_type?: LiquorType
  description?: string | null
  shot_price?: number
  image_url?: string | null
  display_order?: number
  is_available?: boolean
}

export interface LiquorWithShot extends Liquor {
  shot_drink?: Record<string, unknown>
}

export interface BatchLiquorCreate {
  name: string
  brand_name?: string | null
  liquor_type?: LiquorType
  shot_price: number
  image_url?: string | null
}

export const liquorsApi = {
  /**
   * Get all liquors for a club
   */
  getAll: async (clubId: string, includeUnavailable = false): Promise<Liquor[]> => {
    const params = new URLSearchParams({ club_id: clubId })
    if (includeUnavailable) params.append('include_unavailable', 'true')
    const response = await apiClient.get<Liquor[]>(`/liquors?${params}`)
    return response.data
  },

  /**
   * Get a single liquor
   */
  get: async (liquorId: string): Promise<Liquor> => {
    const response = await apiClient.get<Liquor>(`/liquors/${liquorId}`)
    return response.data
  },

  /**
   * Create a new liquor (auto-creates shot drink)
   */
  create: async (data: LiquorCreate): Promise<LiquorWithShot> => {
    const response = await apiClient.post<LiquorWithShot>('/liquors', data)
    return response.data
  },

  /**
   * Batch create liquors
   */
  batchCreate: async (clubId: string, liquors: BatchLiquorCreate[]): Promise<LiquorWithShot[]> => {
    const response = await apiClient.post<LiquorWithShot[]>(
      `/liquors/batch?club_id=${clubId}`,
      { liquors }
    )
    return response.data
  },

  /**
   * Update a liquor
   */
  update: async (liquorId: string, data: LiquorUpdate, syncShotPrice = true): Promise<Liquor> => {
    const params = new URLSearchParams()
    if (!syncShotPrice) params.append('sync_shot_price', 'false')
    const url = params.toString() ? `/liquors/${liquorId}?${params}` : `/liquors/${liquorId}`
    const response = await apiClient.put<Liquor>(url, data)
    return response.data
  },

  /**
   * Delete a liquor (also deletes associated shot drink)
   */
  delete: async (liquorId: string): Promise<void> => {
    await apiClient.delete(`/liquors/${liquorId}`)
  },

  /**
   * Toggle liquor availability
   */
  toggleAvailability: async (liquorId: string, isAvailable: boolean): Promise<Liquor> => {
    const response = await apiClient.patch<Liquor>(
      `/liquors/${liquorId}/availability?is_available=${isAvailable}`
    )
    return response.data
  },
}

