import { apiClient } from './client'
import { DrinkList, DrinkListCreate, DrinkListUpdate, DrinkListWithDrinks } from '@/types'

export const drinkListsApi = {
  /**
   * Get all drink lists
   */
  getAll: async (): Promise<DrinkList[]> => {
    const response = await apiClient.get<DrinkList[]>('/drink-lists')
    return response.data
  },

  /**
   * Get a drink list with its drinks
   */
  getById: async (id: string): Promise<DrinkListWithDrinks> => {
    const response = await apiClient.get<DrinkListWithDrinks>(`/drink-lists/${id}`)
    return response.data
  },

  /**
   * Create a new drink list
   */
  create: async (data: DrinkListCreate): Promise<DrinkList> => {
    const response = await apiClient.post<DrinkList>('/drink-lists', data)
    return response.data
  },

  /**
   * Update a drink list
   */
  update: async (id: string, data: DrinkListUpdate): Promise<DrinkList> => {
    const response = await apiClient.put<DrinkList>(`/drink-lists/${id}`, data)
    return response.data
  },

  /**
   * Delete a drink list
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/drink-lists/${id}`)
  },

  /**
   * Associate a drink list with a club
   */
  associateClub: async (drinkListId: string, clubId: string): Promise<DrinkList> => {
    const response = await apiClient.post<DrinkList>(
      `/drink-lists/${drinkListId}/associate-club/${clubId}`
    )
    return response.data
  },

  /**
   * Disassociate a drink list from a club
   */
  disassociateClub: async (drinkListId: string, clubId: string): Promise<void> => {
    await apiClient.delete(`/drink-lists/${drinkListId}/associate-club/${clubId}`)
  },
}

