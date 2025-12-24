import { apiClient } from './client'
import { Bartender, BartenderCreate } from '@/types'

export const bartendersApi = {
  /**
   * Create a new bartender (club owner only)
   */
  create: async (data: BartenderCreate): Promise<Bartender> => {
    const response = await apiClient.post<Bartender>('/bartenders', data)
    return response.data
  },

  /**
   * Get all bartenders for a club
   */
  getByClub: async (clubId: string): Promise<Bartender[]> => {
    const response = await apiClient.get<Bartender[]>(`/bartenders/club/${clubId}`)
    return response.data
  },

  /**
   * Update bartender active status
   */
  updateStatus: async (bartenderId: string, isActive: boolean): Promise<Bartender> => {
    const response = await apiClient.put<Bartender>(`/bartenders/${bartenderId}/status`, null, {
      params: { is_active: isActive }
    })
    return response.data
  },

  /**
   * Remove a bartender from a club
   */
  remove: async (bartenderId: string): Promise<void> => {
    await apiClient.delete(`/bartenders/${bartenderId}`)
  },

  /**
   * Update bartender's club association
   */
  updateClub: async (bartenderId: string, newClubId: string): Promise<Bartender> => {
    const response = await apiClient.put<Bartender>(`/bartenders/${bartenderId}/club`, null, {
      params: { new_club_id: newClubId }
    })
    return response.data
  },
}

