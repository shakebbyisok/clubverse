import { apiClient } from './client'
import { Club, ClubCreate, ClubUpdate } from '@/types'

export const clubsApi = {
  /**
   * Get all active clubs (public endpoint for customers)
   */
  getClubs: async (skip: number = 0, limit: number = 100): Promise<Club[]> => {
    const response = await apiClient.get<Club[]>('/clubs', {
      params: { skip, limit },
    })
    return response.data
  },

  /**
   * Get club by ID (public endpoint)
   */
  getClub: async (clubId: string): Promise<Club> => {
    const response = await apiClient.get<Club>(`/clubs/${clubId}`)
    return response.data
  },

  /**
   * Get current user's first club (for backward compatibility)
   */
  getMyClub: async (): Promise<Club> => {
    const response = await apiClient.get<Club>('/clubs/me')
    return response.data
  },

  /**
   * Get all clubs owned by the current user
   */
  getMyClubs: async (): Promise<Club[]> => {
    const response = await apiClient.get<Club[]>('/clubs/my-clubs')
    return response.data
  },

  /**
   * Create a new club
   */
  createClub: async (clubData: ClubCreate): Promise<Club> => {
    const response = await apiClient.post<Club>('/clubs', clubData)
    return response.data
  },

  /**
   * Update an existing club
   */
  updateClub: async (clubId: string, clubData: ClubUpdate): Promise<Club> => {
    const response = await apiClient.put<Club>(`/clubs/${clubId}`, clubData)
    return response.data
  },

  /**
   * Get drink list IDs associated with a club
   */
  getClubDrinkLists: async (clubId: string): Promise<string[]> => {
    const response = await apiClient.get<string[]>(`/clubs/${clubId}/drink-lists`)
    return response.data
  },
}
