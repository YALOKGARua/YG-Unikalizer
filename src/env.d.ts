interface Window {
  api: {
    selectImages: () => Promise<string[]>
    selectOutputDir: () => Promise<string>
    processImages: (payload: any) => Promise<{ ok: boolean }>
    onProgress: (cb: (data: any) => void) => () => void
    onComplete: (cb: () => void) => () => void
  }
}