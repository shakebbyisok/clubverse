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
  club_id?: string | null  // Nullable for system categories
  name: string
  description?: string | null
  icon?: string | null  // Emoji icon for category
  display_order: number
  is_system: boolean  // True for predefined system categories
  is_active: boolean
  subcategories: Subcategory[]
  created_at: string
  updated_at?: string | null
}

export interface CategoryTree {
  system_categories: Category[]  // Predefined categories shared across all clubs
  custom_categories: Category[]  // Club-specific custom categories
}

export interface CategoryCreate {
  name: string
  description?: string | null
  icon?: string | null
  display_order?: number
}

export interface SubcategoryCreate {
  name: string
  description?: string | null
  display_order?: number
}

export const categoriesApi = {
  /**
   * Get all categories for a club (both system and custom).
   * Returns { system_categories, custom_categories }
   */
  getClubCategories: async (clubId: string): Promise<CategoryTree> => {
    const response = await apiClient.get<CategoryTree>(`/clubs/${clubId}/categories`)
    return response.data
  },

  /**
   * Get all categories as a flat array (system + custom combined).
   * Useful for dropdowns and selectors.
   */
  getAllCategoriesFlat: async (clubId: string): Promise<Category[]> => {
    const tree = await categoriesApi.getClubCategories(clubId)
    return [...tree.system_categories, ...tree.custom_categories]
  },

  /**
   * Create a new custom category for a club.
   * Note: System categories cannot be created by club owners.
   */
  createCategory: async (clubId: string, data: CategoryCreate): Promise<Category> => {
    const response = await apiClient.post<Category>(`/clubs/${clubId}/categories`, data)
    return response.data
  },

  /**
   * Create a new subcategory within a category
   */
  createSubcategory: async (categoryId: string, data: SubcategoryCreate): Promise<Subcategory> => {
    const response = await apiClient.post<Subcategory>(`/categories/${categoryId}/subcategories`, data)
    return response.data
  },

  /**
   * Update a custom category.
   * Note: System categories cannot be modified.
   */
  updateCategory: async (categoryId: string, data: CategoryCreate): Promise<Category> => {
    const response = await apiClient.put<Category>(`/categories/${categoryId}`, data)
    return response.data
  },

  /**
   * Delete a custom category.
   * Note: System categories cannot be deleted.
   */
  deleteCategory: async (categoryId: string): Promise<void> => {
    await apiClient.delete(`/categories/${categoryId}`)
  },
}

