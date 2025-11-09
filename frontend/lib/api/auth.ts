import { apiClient } from './client'
import { Token, UserLogin, UserCreate } from '@/types'

export const authApi = {
  /**
   * Login with email and password
   */
  login: async (email: string, password: string): Promise<Token> => {
    const response = await apiClient.post<Token>('/auth/login', {
      email,
      password,
    })
    return response.data
  },

  /**
   * Register new user
   */
  register: async (data: UserCreate): Promise<Token> => {
    const response = await apiClient.post<Token>('/auth/register', data)
    return response.data
  },

  /**
   * Get current user
   */
  getCurrentUser: async (): Promise<{ user: any }> => {
    const response = await apiClient.get('/auth/me')
    return response.data
  },
}

