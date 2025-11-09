import axios, { AxiosError, AxiosInstance } from 'axios'
import { ApiError } from '@/types'

// Get backend URL from environment
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
const API_BASE_URL = `${BACKEND_URL}/api/v1`

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
})

// Request interceptor - add auth headers
apiClient.interceptors.request.use(
  (config) => {
    // Remove Content-Type for FormData - axios will set it automatically
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }

    // Get auth token from localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null

    // Skip auth headers for auth endpoints
    const isAuthEndpoint = config.url?.includes('/auth/')

    if (!isAuthEndpoint && token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    // Handle 401 - redirect to login
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token')
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export { apiClient, API_BASE_URL, BACKEND_URL }

