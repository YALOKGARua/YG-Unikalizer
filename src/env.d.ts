interface Window {
  api: {
    selectImages: () => Promise<string[]>
    selectImageDir: () => Promise<string[]>
    selectOutputDir: () => Promise<string>
    processImages: (payload: any) => Promise<{ ok: boolean }>
    cancel: () => Promise<{ ok: boolean }>
    expandPaths: (paths: string[]) => Promise<string[]>
    openPath: (p: string) => Promise<{ ok: boolean; error?: string }>
    showInFolder: (p: string) => Promise<{ ok: boolean; error?: string }>
    onProgress: (cb: (data: any) => void) => () => void
    onComplete: (cb: () => void) => () => void
    checkForUpdates: () => Promise<{ ok: boolean; info?: any; error?: string }>
    downloadUpdate: () => Promise<{ ok: boolean; error?: string }>
    quitAndInstall: () => Promise<{ ok: boolean; error?: string }>
    onUpdateAvailable: (cb: (info: any) => void) => () => void
    onUpdateNotAvailable: (cb: (info: any) => void) => () => void
    onUpdateError: (cb: (err: string) => void) => () => void
    onUpdateProgress: (cb: (p: { percent?: number }) => void) => () => void
    onUpdateDownloaded: (cb: (info: any) => void) => () => void
    getUpdateChangelog: () => Promise<{ ok: boolean; notes?: string }>
    getReadme: () => Promise<{ ok: boolean; data?: string; error?: string }>
    readTextFileByPath: (p: string) => Promise<{ ok: boolean; path?: string; content?: string; error?: string }>
    checkTokenVision: (payload: { endpoint?: string; token: string }) => Promise<{ ok: boolean; status?: number; body?: any; error?: string; exp?: number; sub?: string }>
    clearStatsCache: () => Promise<{ ok: boolean }>
    ui: {
      saveState: (data: any) => Promise<{ ok: boolean }>
      loadState: () => Promise<{ ok: boolean; data?: any }>
    }
    native: {
      parseTxtProfiles: (text: string) => { profiles: any[]; errors: number; errorsInvalidJson?: number; errorsUnsupported?: number; segments?: number; parsedSegments?: number } | null
      parseTxtProfilesFromFile: (path: string) => { profiles: any[]; errors: number; errorsInvalidJson?: number; errorsUnsupported?: number; segments?: number; parsedSegments?: number } | null
      computeFileHash: (path: string) => Promise<string | number | null>
      hammingDistance: (a: string | number, b: string | number) => number | null
      scanDirectory: (dir: string, recursive?: boolean) => string[]
      scanDirectoryFiltered: (dir: string, recursive?: boolean, excludes?: string[]) => string[]
      aHashFromGray8: (buf: Uint8Array, w: number, h: number, stride: number) => string | number | null
      dHashFromGray8: (buf: Uint8Array, w: number, h: number, stride: number) => string | number | null
      pHashFromGray8: (buf: Uint8Array, w: number, h: number, stride: number) => string | number | null
      topKHamming: (hashes: Array<string | number>, query: string | number, k: number) => Array<{ index: number; distance: number }>
      fileAHash: (path: string) => Promise<string | number | null>
      fileDHash: (path: string) => Promise<string | number | null>
      filePHash: (path: string) => Promise<string | number | null>
      gpu: {
        init: () => void
        shutdown: () => void
        setEnabled: (v: boolean) => void
        isEnabled: () => boolean
        isSupported: () => boolean
        adapterName: () => string
      }
    }
  }
}