import { apiClient } from './client'
import { Bartender } from '@/types'

export const bartendersApi = {
  /**
   * Scan QR code and get order
   */
  scanQRCode: async (qrCode: string): Promise<{ order: any }> => {
    const response = await apiClient.post('/bartenders/scan-qr', { qr_code: qrCode })
    return response.data
  },

  /**
   * Get orders for bartender's club
   */
  getClubOrders: async (clubId: string): Promise<any[]> => {
    const response = await apiClient.get(`/bartenders/clubs/${clubId}/orders`)
    return response.data
  },
}

