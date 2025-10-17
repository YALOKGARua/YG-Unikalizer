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
      ig: {
        status: () => Promise<{ ok: boolean; loggedIn?: boolean }>
        login: () => Promise<{ ok: boolean; loggedIn?: boolean; error?: string }>
      }
      probeVideo: (path: string) => Promise<{ ok: boolean; data?: any; error?: string }>
      videoThumbnails: (payload: { path: string; count?: number; cols?: number; rows?: number; width?: number }) => Promise<{ ok: boolean; image?: string; cols?: number; rows?: number; error?: string }>
      system: {
        info: () => Promise<{
          ok: boolean
          os?: { platform: string; type: string; release: string; arch: string; version?: string }
          app?: { version: string; electron: string; chrome: string; node: string; v8: string }
          cpu?: { model: string; speedMHz: number; logicalCores: number }
          memory?: { totalBytes: number; freeBytes: number; system?: any }
          gpu?: { name: string; vendor?: string; driverVersion?: string }
          admin?: boolean
        }>
      }
    }
  }
}