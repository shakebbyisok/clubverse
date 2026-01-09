import { apiClient } from './client'
import type { Drink } from './drinks'

export interface CocktailPreview {
  liquor_id: string
  liquor_name: string
  soda_id: string
  soda_name: string
  suggested_name: string
  suggested_price: number
  liquor_image_url?: string | null
}

export interface CocktailPreviewResponse {
  cocktails: CocktailPreview[]
  total_count: number
}

export interface CocktailCreate {
  club_id: string
  liquor_id: string
  soda_id: string
  name?: string
  price?: number
  description?: string
  image_url?: string
}

export interface CocktailBulkCreate {
  club_id: string
  liquor_ids: string[]
  soda_ids: string[]
  price_markup?: number
}

export const cocktailsApi = {
  /**
   * Preview all possible cocktail combinations
   */
  preview: async (
    clubId: string,
    liquorIds?: string[],
    sodaIds?: string[],
    priceMarkup = 2.0
  ): Promise<CocktailPreviewResponse> => {
    const params = new URLSearchParams({ club_id: clubId })
    if (liquorIds?.length) params.append('liquor_ids', liquorIds.join(','))
    if (sodaIds?.length) params.append('soda_ids', sodaIds.join(','))
    params.append('price_markup', priceMarkup.toString())
    
    const response = await apiClient.get<CocktailPreviewResponse>(`/cocktails/preview?${params}`)
    return response.data
  },

  /**
   * Create a single cocktail
   */
  create: async (data: CocktailCreate): Promise<Drink> => {
    const response = await apiClient.post<Drink>('/cocktails', data)
    return response.data
  },

  /**
   * Bulk create cocktails from selected liquors and sodas
   */
  bulkCreate: async (data: CocktailBulkCreate): Promise<Drink[]> => {
    const response = await apiClient.post<Drink[]>('/cocktails/bulk', data)
    return response.data
  },

  /**
   * Get all cocktails for a club
   */
  getAll: async (clubId: string, includeUnavailable = false): Promise<Drink[]> => {
    const params = new URLSearchParams({ club_id: clubId })
    if (includeUnavailable) params.append('include_unavailable', 'true')
    const response = await apiClient.get<Drink[]>(`/cocktails?${params}`)
    return response.data
  },

  /**
   * Delete a cocktail
   */
  delete: async (cocktailId: string): Promise<void> => {
    await apiClient.delete(`/cocktails/${cocktailId}`)
  },
}

