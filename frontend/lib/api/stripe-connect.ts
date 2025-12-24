import { apiClient } from './client'

export interface StripeConnectStatus {
  stripe_account_id: string | null
  stripe_account_status: string | null  // 'active' | 'pending' | 'pending_verification' | 'restricted' | 'invalid' | 'disconnected' | null
  stripe_charges_enabled: boolean
  stripe_payouts_enabled: boolean
  details_submitted?: boolean
  onboarding_url?: string
}

export interface StripeConnectOnboardRequest {
  return_url: string
  refresh_url: string
}

export const stripeConnectApi = {
  /**
   * Start Stripe Connect onboarding
   */
  onboard: async (request: StripeConnectOnboardRequest): Promise<{ onboarding_url: string }> => {
    const response = await apiClient.post<{ onboarding_url: string }>(
      '/stripe-connect/onboard',
      request
    )
    return response.data
  },

  /**
   * Get Stripe Connect account status (fetches fresh from Stripe)
   */
  getStatus: async (): Promise<StripeConnectStatus> => {
    const response = await apiClient.get<StripeConnectStatus>('/stripe-connect/status')
    return response.data
  },

  /**
   * Force refresh Stripe Connect account status
   */
  refreshStatus: async (): Promise<StripeConnectStatus> => {
    const response = await apiClient.post<StripeConnectStatus>('/stripe-connect/refresh')
    return response.data
  },

  /**
   * Disconnect Stripe account (allows reconnecting with different account)
   */
  disconnect: async (): Promise<{ status: string }> => {
    const response = await apiClient.post<{ status: string }>('/stripe-connect/disconnect')
    return response.data
  },
}
