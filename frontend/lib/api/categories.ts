import { apiClient } from './client'

export interface Subcategory {
  id: string
  category_id: string
  name: string
  description?: string | null
  display_order: number
  is_active: boolean
  created_at: string
  updated_at?: string | null
}

export interface Category {
  id: string
  club_id: string
  name: string
  description?: string | null
  display_order: number
  is_active: boolean
  subcategories: Subcategory[]
  created_at: string
  updated_at?: string | null
}

export interface CategoryTree {
  categories: Category[]
}

export interface CategoryCreate {
  name: string
  description?: string | null
  display_order?: number
}

export interface SubcategoryCreate {
  name: string
  description?: string | null
  display_order?: number
}

export const categoriesApi = {
  /**
   * Get all categories for a club with subcategories
   */
  getClubCategories: async (clubId: string): Promise<CategoryTree> => {
    const response = await apiClient.get<CategoryTree>(`/clubs/${clubId}/categories`)
    return response.data
  },

  /**
   * Create a new category
   */
  createCategory: async (clubId: string, data: CategoryCreate): Promise<Category> => {
    const response = await apiClient.post<Category>(`/clubs/${clubId}/categories`, data)
    return response.data
  },

  /**
   * Create a new subcategory
   */
  createSubcategory: async (categoryId: string, data: SubcategoryCreate): Promise<Subcategory> => {
    const response = await apiClient.post<Subcategory>(`/categories/${categoryId}/subcategories`, data)
    return response.data
  },

  /**
   * Update a category
   */
  updateCategory: async (categoryId: string, data: CategoryCreate): Promise<Category> => {
    const response = await apiClient.put<Category>(`/categories/${categoryId}`, data)
    return response.data
  },

  /**
   * Delete a category
   */
  deleteCategory: async (categoryId: string): Promise<void> => {
    await apiClient.delete(`/categories/${categoryId}`)
  },
}

