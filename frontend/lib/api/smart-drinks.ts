import { apiClient } from './client'

// ============== Types ==============

export interface LiquorPreviewItem {
  name: string
  price: number
  liquor_type: string
  is_new: boolean
  image_url?: string | null
  existing_id?: string | null
}

export interface SodaPreviewItem {
  name: string
  price: number
  price_addon: number
  is_new: boolean
  image_url?: string | null
  existing_id?: string | null
}

export interface CocktailPreviewItem {
  name: string
  price: number
  liquor_name: string
  liquor_exists: boolean
  liquor_id?: string | null
  soda_name: string
  soda_exists: boolean
  soda_id?: string | null
  image_url?: string | null
}

export interface DrinkPreviewItem {
  name: string
  price: number
  category: string
  image_url?: string | null
}

export interface CategoryPreview {
  name: string
  is_new: boolean
  reason?: string | null
}

export interface SmartParseResponse {
  liquors: LiquorPreviewItem[]
  sodas: SodaPreviewItem[]
  cocktails: CocktailPreviewItem[]
  drinks: DrinkPreviewItem[]
  category?: CategoryPreview | null
  summary: string
}

export interface SmartSaveRequest {
  liquors: LiquorPreviewItem[]
  sodas: SodaPreviewItem[]
  cocktails: CocktailPreviewItem[]
  drinks: DrinkPreviewItem[]
  category?: CategoryPreview | null
}

export interface SmartSaveResponse {
  liquors_created: number
  sodas_created: number
  shots_created: number
  cocktails_created: number
  drinks_created: number
  category_created: boolean
  category_name?: string | null
}

// ============== API ==============

export const smartDrinksApi = {
  /**
   * Smart parse natural language into structured drink data.
   * 
   * Understands:
   * - Pure liquors: "Absolut $8, Beefeater $9"
   * - Pure sodas: "Coca-Cola $3, Red Bull $4"
   * - Cocktails: "Gin Tonic $10, Vodka Red Bull $12" (auto-creates missing ingredients)
   * - Explicit categories: "...under Premium Whisky"
   */
  parse: async (clubId: string, text: string): Promise<SmartParseResponse> => {
    const response = await apiClient.post<SmartParseResponse>(
      `/smart/parse?club_id=${clubId}`,
      { text }
    )
    return response.data
  },

  /**
   * Save parsed items to database.
   * Creates liquors (with auto-shots), sodas, cocktails, drinks, and category.
   */
  save: async (clubId: string, data: SmartSaveRequest): Promise<SmartSaveResponse> => {
    const response = await apiClient.post<SmartSaveResponse>(
      `/smart/save?club_id=${clubId}`,
      data
    )
    return response.data
  },
}

