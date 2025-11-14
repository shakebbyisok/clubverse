declare module 'html5-qrcode' {
  export class Html5Qrcode {
    constructor(elementId: string)
    start(
      videoConstraints: { facingMode: string },
      config: {
        fps: number
        qrbox: (width: number, height: number) => { width: number; height: number }
        aspectRatio: number
      },
      onSuccess: (decodedText: string) => void,
      onError: (errorMessage: string) => void
    ): Promise<void>
    stop(): Promise<void>
    clear(): Promise<void>
  }
}

