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
}

