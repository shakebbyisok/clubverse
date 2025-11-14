import { apiClient } from './client'
import { Club } from '@/types'

export interface UserClub {
  id: string
  user_id: string
  club_id: string
  points: number
  total_orders: number
  total_spent: number
  joined_at: string
  updated_at?: string
  club: Club
}

export const userClubsApi = {
  /**
   * Get all clubs the current user is registered with
   */
  getUserClubs: async (): Promise<UserClub[]> => {
    const response = await apiClient.get<UserClub[]>('/users/me/clubs')
    return response.data
  },

  /**
   * Register the current user to a club
   */
  registerToClub: async (clubId: string): Promise<UserClub> => {
    const response = await apiClient.post<UserClub>(`/users/me/clubs/${clubId}/register`)
    return response.data
  },
}

