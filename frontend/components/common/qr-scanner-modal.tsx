'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, X, Camera, CameraOff } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Order } from '@/types'
import { bartenderApi } from '@/lib/api/bartender'

interface QRScannerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScanSuccess?: (order: Order) => void
}

export function QRScannerModal({
  open,
  onOpenChange,
  onScanSuccess,
}: QRScannerModalProps) {
  const { toast } = useToast()
  const [isScanning, setIsScanning] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const scannerRef = useRef<HTMLDivElement>(null)
  const html5QrCodeRef = useRef<any>(null)

  useEffect(() => {
    if (open) {
      startScanner()
    } else {
      stopScanner()
    }

    return () => {
      stopScanner()
    }
  }, [open])

  const startScanner = async () => {
    if (!scannerRef.current) return

    try {
      // Dynamically import html5-qrcode to avoid SSR issues
      const { Html5Qrcode } = await import('html5-qrcode')
      
      setIsScanning(true)
      
      const html5QrCode = new Html5Qrcode(scannerRef.current.id)
      html5QrCodeRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: 'environment' }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleQRCodeScanned(decodedText)
        },
        (errorMessage) => {
          // Ignore scanning errors (they're frequent during scanning)
        }
      )
    } catch (error: any) {
      console.error('Failed to start scanner:', error)
      toast({
        variant: 'destructive',
        title: 'Camera Error',
        description: error.message || 'Failed to access camera. Please check permissions.',
      })
      setIsScanning(false)
    }
  }

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop()
        await html5QrCodeRef.current.clear()
      } catch (error) {
        // Ignore errors when stopping
      }
      html5QrCodeRef.current = null
    }
    setIsScanning(false)
  }

  const handleQRCodeScanned = async (qrCode: string) => {
    if (isProcessing) return

    setIsProcessing(true)
    
    try {
      // Stop scanner while processing
      await stopScanner()

      // Call API to get order from QR code
      const order = await bartenderApi.scanQR(qrCode)
      
      toast({
        title: 'QR Code Scanned!',
        description: `Order #${order.id.slice(0, 8)} found`,
      })

      onScanSuccess?.(order)
      onOpenChange(false)
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Scan Failed',
        description: error.response?.data?.detail || 'Invalid QR code or order not found',
      })
      
      // Restart scanner after error
      if (open) {
        await startScanner()
      }
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle>Scan QR Code</DialogTitle>
          <DialogDescription>
            Point your camera at the customer&apos;s QR code
          </DialogDescription>
        </DialogHeader>

        <div className="relative px-4 pb-4">
          <div
            id="qr-scanner"
            ref={scannerRef}
            className="w-full aspect-square rounded-lg overflow-hidden bg-black/5 border border-border/40"
          />
          
          {!isScanning && !isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
              <div className="text-center text-white">
                <CameraOff className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Camera not active</p>
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
              <div className="text-center text-white">
                <Loader2 className="h-12 w-12 mx-auto mb-2 animate-spin" />
                <p className="text-sm">Processing QR code...</p>
              </div>
            </div>
          )}

          {isScanning && !isProcessing && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="border-2 border-primary rounded-lg w-[250px] h-[250px]">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br-lg" />
              </div>
            </div>
          )}
        </div>

        <div className="px-4 pb-4 flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          {isScanning && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={stopScanner}
              disabled={isProcessing}
            >
              <CameraOff className="h-4 w-4 mr-2" />
              Stop Scanner
            </Button>
          )}
          {!isScanning && !isProcessing && (
            <Button
              className="flex-1"
              onClick={startScanner}
            >
              <Camera className="h-4 w-4 mr-2" />
              Start Scanner
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

