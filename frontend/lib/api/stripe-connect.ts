import { apiClient } from './client'

export interface StripeConnectStatus {
  stripe_account_id: string | null
  stripe_account_status: string | null
  stripe_charges_enabled: boolean
  stripe_payouts_enabled: boolean
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
   * Get Stripe Connect account status
   */
  getStatus: async (): Promise<StripeConnectStatus> => {
    const response = await apiClient.get<StripeConnectStatus>('/stripe-connect/status')
    return response.data
  },
}

