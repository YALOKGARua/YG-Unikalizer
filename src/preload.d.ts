export interface RustAPI {
  hashImages(options: { backend: 'auto' | 'rust' | 'cpp', algorithm: 'ahash' | 'dhash' | 'phash', paths: string[] }): Promise<{ ok: boolean, hashes?: string[], backend?: string, error?: string }>
  loadRustModule(): Promise<any>
  rustAhashBatch(payload: { paths: string[], algorithm?: string }): Promise<{ ok: boolean, hashes?: string[], backend?: string, error?: string }>
}

declare global {
  interface Window {
    api: {
      invoke: (channel: string, ...args: any[]) => Promise<any>
      on: (channel: string, callback: (...args: any[]) => void) => void
      rust: RustAPI
    }
  }
}