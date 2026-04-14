// Runtime-injected window globals for the Mint desktop companion app.
// These are provided by a Capacitor/Electron bridge at runtime, not via NPM.

interface MintBridge {
  onExtractionProgress(
    cb: (data: { completed: number; total: number; stage: string }) => void
  ): () => void

  extractVideoFrames(params: {
    filePath: string
    interval: number
    maxFrames: number
    quality: 'low' | 'medium' | 'high'
  }): Promise<{
    outputDir: string
    frames: Array<{ index: number; timestamp: number; path: string }>
  }>

  fileUrl(path: string): Promise<string>

  cleanupExtraction(dir: string): Promise<void>
}

declare global {
  interface Window {
    mint: MintBridge
  }
}

export {}
