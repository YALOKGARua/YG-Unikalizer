interface Window {
  api: {
    selectImages: () => Promise<string[]>
    selectImageDir: () => Promise<string[]>
    selectOutputDir: () => Promise<string>
    processImages: (payload: unknown) => Promise<{ ok: boolean }>
    selectTextFile: () => Promise<{ ok: boolean; path?: string; content?: string }>
    readTextFileByPath: (p: string) => Promise<{ ok: boolean; path?: string; content?: string; error?: string }>
    saveJson: (payload: unknown) => Promise<{ ok: boolean; path?: string; error?: string }>
    saveJsonBatch: (payload: unknown) => Promise<{ ok: boolean; paths?: string[]; error?: string }>
    savePreset?: (payload: unknown) => Promise<{ ok: boolean; error?: string }>
    loadPreset?: () => Promise<{ ok: boolean; data?: unknown }>
    cancel: () => Promise<{ ok: boolean }>
    expandPaths: (paths: string[]) => Promise<string[]>
    openPath: (p: string) => Promise<{ ok: boolean; error?: string }>
    showInFolder: (p: string) => Promise<{ ok: boolean; error?: string }>
    renameFile?: (path: string, newName: string) => Promise<{ ok: boolean; path?: string; error?: string }>
    deleteFile?: (path: string) => Promise<{ ok: boolean; error?: string }>
    fileStats?: (path: string) => Promise<{ ok: boolean; stats?: any; error?: string }>
    onProgress: (cb: (data: any) => void) => () => void
    onComplete: (cb: () => void) => () => void
    onOsOpenFiles: (cb: (files: string[]) => void) => () => void
    onStep?: (cb: (s: unknown) => void) => () => void
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
    clearStatsCache: () => Promise<{ ok: boolean }>
    relaunchAsAdmin: () => Promise<{ ok: boolean; error?: string }>
    isAdmin: () => Promise<{ ok: boolean; admin: boolean }>
    decodeGray8File: (p: string) => Promise<{ width: number; height: number; stride: number; data: number[] } | null>
    decodeRgbaFile: (p: string) => Promise<{ width: number; height: number; stride: number; data: number[] } | null>
    wasmCodecs: {
      ensure: (payload: { items: { name: string; url: string; sha256?: string }[] }) => Promise<{ ok: boolean; dir?: string; error?: string }>
      load: (name: string) => Promise<{ ok: boolean; data?: Uint8Array; error?: string }>
    }
    saveBytes: (payload: { data: number[]; defaultPath?: string }) => Promise<{ ok: boolean; path?: string; error?: string }>
    ui: {
      saveState: (data: unknown) => Promise<{ ok: boolean }>
      loadState: () => Promise<{ ok: boolean; data?: unknown }>
    }
    auth: {
      isRequired: () => Promise<{ ok: boolean; required: boolean; authed: boolean }>
      login: (password: string, remember: boolean) => Promise<{ ok: boolean; authed: boolean }>
      logout: () => Promise<{ ok: boolean }>
    }
    dev: {
      onToggleAdminPanel: (cb: () => void) => () => void
      onShowAdminPanel: (cb: () => void) => () => void
      onHideAdminPanel: (cb: () => void) => () => void
      onRequestUnlock: (cb: () => void) => () => void
      onUnlocked: (cb: () => void) => () => void
      toggleAdminPanel: () => Promise<{ ok: boolean; error?: string }>
      showAdminPanel: () => Promise<{ ok: boolean; error?: string }>
      hideAdminPanel: () => Promise<{ ok: boolean; error?: string }>
      unlock: (password: string) => Promise<{ ok: boolean }>
      isUnlocked: () => Promise<{ ok: boolean; unlocked: boolean }>
      lock: () => Promise<{ ok: boolean }>
    }
    admin: {
      getPassword: () => Promise<{ ok: boolean; password: string }>
    }
    checkTokenVision: (payload: { endpoint?: string; token: string }) => Promise<{ ok: boolean; status?: number; body?: any; error?: string; exp?: number; sub?: string }>
    native: {
      parseTxtProfiles: (text: string) => { profiles: any[]; errors: number; errorsInvalidJson?: number; errorsUnsupported?: number; segments?: number; parsedSegments?: number } | null
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
      writeMetadata?: (p: string, meta: unknown) => boolean
      stripMetadata?: (p: string) => boolean
      createHammingIndex?: (hashes: Array<string | number>) => number
      queryHammingIndex?: (id: number, query: string | number, k: number, maxDistance: number) => any[]
      freeHammingIndex?: (id: number) => void
      clusterByHamming?: (hashes: Array<string | number>, threshold: number) => any[]
      wicDecodeGray8?: (filePath: string) => any
      parseTxtProfilesFromFile?: (filePath: string) => any
    }
    hashFileIncremental?: (payload: { path: string } | string) => Promise<{ ok: boolean; algo?: string; hash?: string }>
  }
}