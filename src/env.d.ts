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
  }
}