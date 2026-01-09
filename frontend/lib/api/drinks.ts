import { apiClient } from './client'

export type DrinkType = 'shot' | 'cocktail' | 'beer' | 'wine' | 'soda' | 'other'

export interface DrinkPreview {
  name: string
  price: number
  category?: string | null  // Text category name
  category_id?: string | null  // Matched system/custom category ID
  category_icon?: string | null  // Category emoji icon
  brand_name?: string | null
  logo_url?: string | null
}

export interface ParsePreviewResponse {
  drinks: DrinkPreview[]
}

export interface BatchDrinkCreate {
  name: string
  price: number
  category?: string | null  // Text category name
  category_id?: string | null  // System/custom category ID
  brand_name?: string | null
  logo_url?: string | null
}

export interface Drink {
  id: string
  club_id: string
  name: string
  description?: string | null
  price: string
  drink_type?: DrinkType | null
  liquor_id?: string | null
  soda_id?: string | null
  liquor_name?: string | null
  soda_name?: string | null
  category?: string | null  // Legacy text category
  category_id?: string | null  // FK to categories table
  category_name?: string | null  // Resolved category name
  category_icon?: string | null  // Resolved category emoji icon
  image_url?: string | null
  brand_name?: string | null
  brand_colors?: any[] | null
  brand_fonts?: any[] | null
  is_available: boolean
  created_at: string
  updated_at?: string | null
}

// Ingredient parsing types
export type LiquorType = 'vodka' | 'gin' | 'rum' | 'whisky' | 'tequila' | 'brandy' | 'liqueur' | 'other'

export interface LiquorPreview {
  name: string
  price: number
  liquor_type: string
  brand_name?: string | null
  image_url?: string | null
}

export interface SodaPreview {
  name: string
  price: number
  price_addon: number
  brand_name?: string | null
  image_url?: string | null
}

export interface ParseIngredientsResponse {
  liquors: LiquorPreview[]
  sodas: SodaPreview[]
}

export interface BatchIngredientsCreate {
  liquors: LiquorPreview[]
  sodas: SodaPreview[]
}

export interface BatchIngredientsResponse {
  liquors_created: number
  sodas_created: number
  shots_created: number
  liquor_ids: string[]
  soda_ids: string[]
}

export const drinksApi = {
  /**
   * Parse natural language drink input and get preview with brand data
   */
  parsePreview: async (text: string, clubId?: string): Promise<ParsePreviewResponse> => {
    const url = clubId 
      ? `/drinks/parse-preview?club_id=${clubId}`
      : '/drinks/parse-preview'
    const response = await apiClient.post<ParsePreviewResponse>(url, {
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
   * Update a drink
   */
  update: async (drinkId: string, data: Partial<Drink>): Promise<Drink> => {
    const response = await apiClient.put<Drink>(`/clubs/drinks/${drinkId}`, data)
    return response.data
  },

  /**
   * Delete a drink
   */
  delete: async (drinkId: string): Promise<void> => {
    await apiClient.delete(`/clubs/drinks/${drinkId}`)
  },

  /**
   * Parse natural language input into liquors and sodas
   */
  parseIngredients: async (text: string, clubId?: string): Promise<ParseIngredientsResponse> => {
    const url = clubId
      ? `/drinks/parse-ingredients?club_id=${clubId}`
      : '/drinks/parse-ingredients'
    const response = await apiClient.post<ParseIngredientsResponse>(url, { text })
    return response.data
  },

  /**
   * Batch create ingredients (liquors and sodas) with auto-shot creation
   */
  batchCreateIngredients: async (
    clubId: string,
    data: BatchIngredientsCreate
  ): Promise<BatchIngredientsResponse> => {
    const response = await apiClient.post<BatchIngredientsResponse>(
      `/drinks/batch-ingredients?club_id=${clubId}`,
      data
    )
    return response.data
  },
}
