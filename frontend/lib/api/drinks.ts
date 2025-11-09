import { apiClient } from './client'

export interface DrinkPreview {
  name: string
  price: number
  category?: string | null
  brand_name?: string | null
  logo_url?: string | null
}

export interface ParsePreviewResponse {
  drinks: DrinkPreview[]
}

export interface BatchDrinkCreate {
  name: string
  price: number
  category?: string | null
  brand_name?: string | null
  logo_url?: string | null
}

export interface Drink {
  id: string
  club_id: string
  name: string
  description?: string | null
  price: string
  category?: string | null
  image_url?: string | null
  brand_name?: string | null
  brand_colors?: any[] | null
  brand_fonts?: any[] | null
  is_available: boolean
  created_at: string
  updated_at?: string | null
}

export const drinksApi = {
  /**
   * Parse natural language drink input and get preview with brand data
   */
  parsePreview: async (text: string): Promise<ParsePreviewResponse> => {
    const response = await apiClient.post<ParsePreviewResponse>('/drinks/parse-preview', {
      text,
    })
    return response.data
  },

  /**
   * Batch create drinks
   */
  batchCreate: async (clubId: string, drinks: BatchDrinkCreate[]): Promise<Drink[]> => {
    const response = await apiClient.post<Drink[]>(`/drinks/batch?club_id=${clubId}`, {
      drinks,
    })
    return response.data
  },

  /**
   * Get all drinks for a club
   */
  getClubDrinks: async (clubId: string): Promise<Drink[]> => {
    const response = await apiClient.get<Drink[]>(`/clubs/${clubId}/drinks`)
    return response.data
  },

  /**
   * Delete a drink
   */
  delete: async (drinkId: string): Promise<void> => {
    await apiClient.delete(`/clubs/drinks/${drinkId}`)
  },
}
