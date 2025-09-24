import { contextBridge, ipcRenderer } from 'electron'
import path from 'path'
import fs from 'fs'

let sharp: any = null
let nativeMod: any = null

function loadNative(): any {
  if (nativeMod) return nativeMod
  try {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ngb = require('node-gyp-build')
      nativeMod = ngb(path.join(__dirname, '..', 'native'))
      if (nativeMod) return nativeMod
    } catch {}
    const candidate = path.join(process.cwd(), 'native', 'build', 'Release', 'photounikalizer_native.node')
    if (fs.existsSync(candidate)) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      nativeMod = require(candidate)
      return nativeMod
    }
  } catch {}
  try {
    const asarUnpacked = path.join(process.resourcesPath || '', 'app.asar.unpacked', 'native', 'build', 'Release', 'photounikalizer_native.node')
    if (asarUnpacked && fs.existsSync(asarUnpacked)) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      nativeMod = require(asarUnpacked)
      return nativeMod
    }
  } catch {}
  try {
    const platArch = `${process.platform}-${process.arch}`
    const prebuildA = path.join(__dirname, '..', 'native', 'prebuilds', platArch, 'node.napi.node')
    if (fs.existsSync(prebuildA)) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      nativeMod = require(prebuildA)
      return nativeMod
    }
    const prebuildB = path.join(__dirname, '..', 'native', 'prebuilds', platArch, 'photounikalizer-native.node')
    if (fs.existsSync(prebuildB)) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      nativeMod = require(prebuildB)
      return nativeMod
    }
  } catch {}
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    nativeMod = require('photounikalizer_native')
  } catch {
    nativeMod = null
  }
  return nativeMod
}

async function decodeGray8(filePath: string) {
  if (!sharp) {
    try { sharp = require('sharp') } catch { sharp = null }
  }
  if (!sharp) return null
  const res = await sharp(filePath).grayscale().raw().toBuffer({ resolveWithObject: true })
  const buf = new Uint8Array(res.data.buffer, res.data.byteOffset, res.data.byteLength)
  const width = res.info.width as number
  const height = res.info.height as number
  const stride = res.info.width * res.info.channels
  return { buf, width, height, stride }
}

async function decodeRgba(filePath: string) {
  if (!sharp) {
    try { sharp = require('sharp') } catch { sharp = null }
  }
  if (!sharp) return null
  const res = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const buf = new Uint8Array(res.data.buffer, res.data.byteOffset, res.data.byteLength)
  const width = res.info.width as number
  const height = res.info.height as number
  const stride = res.info.width * res.info.channels
  return { buf, width, height, stride }
}

contextBridge.exposeInMainWorld('api', {
  selectImages: () => ipcRenderer.invoke('select-images'),
  selectImageDir: () => ipcRenderer.invoke('select-image-dir'),
  selectOutputDir: () => ipcRenderer.invoke('select-output-dir'),
  processImages: (payload: unknown) => ipcRenderer.invoke('process-images', payload),
  selectTextFile: () => ipcRenderer.invoke('select-text-file'),
  readTextFileByPath: (p: string) => ipcRenderer.invoke('read-text-file-by-path', p),
  saveJson: (payload: unknown) => ipcRenderer.invoke('save-json', payload),
  saveJsonBatch: (payload: unknown) => ipcRenderer.invoke('save-json-batch', payload),
  savePreset: (payload: unknown) => ipcRenderer.invoke('save-preset', payload),
  loadPreset: () => ipcRenderer.invoke('load-preset'),
  cancel: () => ipcRenderer.invoke('cancel-process'),
  expandPaths: (paths: string[]) => ipcRenderer.invoke('expand-paths', paths),
  openPath: (p: string) => ipcRenderer.invoke('open-path', p),
  showInFolder: (p: string) => ipcRenderer.invoke('show-item-in-folder', p),
  renameFile: (path: string, newName: string) => ipcRenderer.invoke('file-rename', { path, newName }),
  deleteFile: (path: string) => ipcRenderer.invoke('file-delete', path),
  fileStats: (path: string) => ipcRenderer.invoke('file-stats', path),
  metaBeforeAfter: (src: string, out: string) => ipcRenderer.invoke('meta-before-after', { src, out }),
  onProgress: (cb: (data: unknown) => void) => {
    const listener = (_: unknown, data: unknown) => cb(data)
    ipcRenderer.on('process-progress', listener as any)
    return () => ipcRenderer.removeListener('process-progress', listener as any)
  },
  onComplete: (cb: () => void) => {
    const listener = () => cb()
    ipcRenderer.on('process-complete', listener as any)
    return () => ipcRenderer.removeListener('process-complete', listener as any)
  },
  onOsOpenFiles: (cb: (files: string[]) => void) => {
    const listener = (_: unknown, files: string[]) => cb(files)
    ipcRenderer.on('os-open-files', listener as any)
    return () => ipcRenderer.removeListener('os-open-files', listener as any)
  },
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  onUpdateAvailable: (cb: (info: unknown) => void) => {
    const listener = (_: unknown, info: unknown) => cb(info)
    ipcRenderer.on('update-available', listener as any)
    return () => ipcRenderer.removeListener('update-available', listener as any)
  },
  onUpdateNotAvailable: (cb: (info: unknown) => void) => {
    const listener = (_: unknown, info: unknown) => cb(info)
    ipcRenderer.on('update-not-available', listener as any)
    return () => ipcRenderer.removeListener('update-not-available', listener as any)
  },
  onUpdateError: (cb: (err: string) => void) => {
    const listener = (_: unknown, err: string) => cb(err)
    ipcRenderer.on('update-error', listener as any)
    return () => ipcRenderer.removeListener('update-error', listener as any)
  },
  onUpdateProgress: (cb: (p: { percent?: number }) => void) => {
    const listener = (_: unknown, p: { percent?: number }) => cb(p)
    ipcRenderer.on('update-download-progress', listener as any)
    return () => ipcRenderer.removeListener('update-download-progress', listener as any)
  },
  onUpdateDownloaded: (cb: (info: unknown) => void) => {
    const listener = (_: unknown, info: unknown) => cb(info)
    ipcRenderer.on('update-downloaded', listener as any)
    return () => ipcRenderer.removeListener('update-downloaded', listener as any)
  },
  onWhatsNew: (cb: (payload: unknown) => void) => {
    const listener = (_: unknown, payload: unknown) => cb(payload)
    ipcRenderer.on('show-whats-new', listener as any)
    return () => ipcRenderer.removeListener('show-whats-new', listener as any)
  },
  win: {
    minimize: () => ipcRenderer.invoke('win-minimize'),
    maximize: () => ipcRenderer.invoke('win-maximize'),
    toggleMaximize: () => ipcRenderer.invoke('win-toggle-maximize'),
    close: () => ipcRenderer.invoke('win-close'),
    isMaximized: () => ipcRenderer.invoke('win-is-maximized'),
    onMaximizeState: (cb: (v: { maximized: boolean }) => void) => {
      const listener = (_: unknown, v: { maximized: boolean }) => cb(v)
      ipcRenderer.on('win-maximize-state', listener as any)
      return () => ipcRenderer.removeListener('win-maximize-state', listener as any)
    }
  },
  onStep: (cb: (s: unknown) => void) => {
    const listener = (_: unknown, s: unknown) => cb(s)
    ipcRenderer.on('process-step', listener as any)
    return () => ipcRenderer.removeListener('process-step', listener as any)
  },
  getUpdateChangelog: () => ipcRenderer.invoke('get-update-changelog'),
  getFullChangelog: () => ipcRenderer.invoke('get-full-changelog'),
  getReadme: () => ipcRenderer.invoke('get-readme'),
  clearStatsCache: () => ipcRenderer.invoke('stats-cache-clear'),
  relaunchAsAdmin: () => ipcRenderer.invoke('relaunch-admin'),
  isAdmin: () => ipcRenderer.invoke('is-admin'),
  decodeGray8File: (p: string) => decodeGray8(p).then(dec => dec ? ({ width: dec.width, height: dec.height, stride: dec.stride, data: Array.from(dec.buf) }) : null),
  decodeRgbaFile: (p: string) => decodeRgba(p).then(dec => dec ? ({ width: dec.width, height: dec.height, stride: dec.stride, data: Array.from(dec.buf) }) : null),
  wasmCodecs: {
    ensure: (items: unknown[]) => ipcRenderer.invoke('ensure-wasm-codecs', { items }),
    load: (name: string) => ipcRenderer.invoke('load-wasm-file', name)
  },
  saveBytes: (payload: { data: number[]; defaultPath?: string }) => ipcRenderer.invoke('save-bytes', payload),
  ui: {
    saveState: (data: unknown) => ipcRenderer.invoke('ui-state-save', data),
    loadState: () => ipcRenderer.invoke('ui-state-load')
  },
  auth: {
    isRequired: () => ipcRenderer.invoke('auth-required'),
    login: (password: string, remember: boolean) => ipcRenderer.invoke('auth-login', { password, remember }),
    logout: () => ipcRenderer.invoke('auth-logout'),
  },
  dev: {
    onToggleAdminPanel: (cb: () => void) => { const listener = () => cb(); ipcRenderer.on('dev-admin-toggle', listener as any); return () => ipcRenderer.removeListener('dev-admin-toggle', listener as any) },
    onShowAdminPanel: (cb: () => void) => { const listener = () => cb(); ipcRenderer.on('dev-admin-show', listener as any); return () => ipcRenderer.removeListener('dev-admin-show', listener as any) },
    onHideAdminPanel: (cb: () => void) => { const listener = () => cb(); ipcRenderer.on('dev-admin-hide', listener as any); return () => ipcRenderer.removeListener('dev-admin-hide', listener as any) },
    onRequestUnlock: (cb: () => void) => { const listener = () => cb(); ipcRenderer.on('dev-admin-request-unlock', listener as any); return () => ipcRenderer.removeListener('dev-admin-request-unlock', listener as any) },
    onUnlocked: (cb: () => void) => { const listener = () => cb(); ipcRenderer.on('dev-admin-unlocked', listener as any); return () => ipcRenderer.removeListener('dev-admin-unlocked', listener as any) },
    toggleAdminPanel: () => ipcRenderer.invoke('dev-toggle-admin'),
    showAdminPanel: () => ipcRenderer.invoke('dev-show-admin'),
    hideAdminPanel: () => ipcRenderer.invoke('dev-hide-admin'),
    unlock: (password: string) => ipcRenderer.invoke('dev-unlock', password),
    isUnlocked: () => ipcRenderer.invoke('dev-is-unlocked'),
    lock: () => ipcRenderer.invoke('dev-lock')
  },
  admin: {
    getPassword: () => ipcRenderer.invoke('get-admin-password')
  },
  checkTokenVision: (payload: { endpoint?: string; token: string }) => ipcRenderer.invoke('check-token-vision', payload),
  native: {
    parseTxtProfiles: (text: string) => { const mod = loadNative(); return mod ? mod.parseTxtProfiles(String(text||'')) : null },
    computeFileHash: async (p: string) => { const mod = loadNative(); if (!mod) return null; const res = mod.computeFileHash(p); return typeof res === 'bigint' ? res.toString() : res },
    hammingDistance: (a: string | number, b: string | number) => { const mod = loadNative(); if (!mod) return null; return mod.hammingDistance(a, b) },
    scanDirectory: (dir: string, recursive = true) => { const mod = loadNative(); if (!mod) return []; return mod.scanDirectory(dir, !!recursive) },
    scanDirectoryFiltered: (dir: string, recursive = true, excludes: string[] = []) => { const mod = loadNative(); if (!mod) return []; return mod.scanDirectoryFiltered(dir, !!recursive, Array.isArray(excludes) ? excludes : []) },
    aHashFromGray8: (buf: Uint8Array, w: number, h: number, stride: number) => { const mod = loadNative(); if (!mod) return null; const res = mod.aHashFromGray8(new Uint8Array((buf as any).buffer, (buf as any).byteOffset, (buf as any).byteLength), w, h, stride); return typeof res === 'bigint' ? res.toString() : res },
    dHashFromGray8: (buf: Uint8Array, w: number, h: number, stride: number) => { const mod = loadNative(); if (!mod) return null; const res = mod.dHashFromGray8(new Uint8Array((buf as any).buffer, (buf as any).byteOffset, (buf as any).byteLength), w, h, stride); return typeof res === 'bigint' ? res.toString() : res },
    pHashFromGray8: (buf: Uint8Array, w: number, h: number, stride: number) => { const mod = loadNative(); if (!mod) return null; const res = mod.pHashFromGray8(new Uint8Array((buf as any).buffer, (buf as any).byteOffset, (buf as any).byteLength), w, h, stride); return typeof res === 'bigint' ? res.toString() : res },
    topKHamming: (hashes: Array<string | number>, query: string | number, k: number) => { const mod = loadNative(); if (!mod) return []; return mod.topKHamming(hashes, query, k) },
    fileAHash: async (filePath: string) => { const mod = loadNative(); if (!mod) return null; try { const dec = mod.wicDecodeGray8 ? mod.wicDecodeGray8(filePath) : null; if (dec && dec.buffer && typeof dec.width === 'number' && typeof dec.height === 'number' && typeof dec.stride === 'number') { const u8 = new Uint8Array(dec.buffer.buffer, dec.buffer.byteOffset, dec.buffer.byteLength); const res = mod.aHashFromGray8(u8, dec.width, dec.height, dec.stride); return typeof res === 'bigint' ? res.toString() : res } } catch {} const dec = await decodeGray8(filePath); if (!dec) return null; const res = mod.aHashFromGray8(dec.buf, dec.width, dec.height, dec.stride); return typeof res === 'bigint' ? res.toString() : res },
    fileDHash: async (filePath: string) => { const mod = loadNative(); if (!mod) return null; try { const dec = mod.wicDecodeGray8 ? mod.wicDecodeGray8(filePath) : null; if (dec && dec.buffer && typeof dec.width === 'number' && typeof dec.height === 'number' && typeof dec.stride === 'number') { const u8 = new Uint8Array(dec.buffer.buffer, dec.buffer.byteOffset, dec.buffer.byteLength); const res = mod.dHashFromGray8(u8, dec.width, dec.height, dec.stride); return typeof res === 'bigint' ? res.toString() : res } } catch {} const dec = await decodeGray8(filePath); if (!dec) return null; const res = mod.dHashFromGray8(dec.buf, dec.width, dec.height, dec.stride); return typeof res === 'bigint' ? res.toString() : res },
    filePHash: async (filePath: string) => { const mod = loadNative(); if (!mod) return null; try { const dec = mod.wicDecodeGray8 ? mod.wicDecodeGray8(filePath) : null; if (dec && dec.buffer && typeof dec.width === 'number' && typeof dec.height === 'number' && typeof dec.stride === 'number') { const u8 = new Uint8Array(dec.buffer.buffer, dec.buffer.byteOffset, dec.buffer.byteLength); const res = mod.pHashFromGray8(u8, dec.width, dec.height, dec.stride); return typeof res === 'bigint' ? res.toString() : res } } catch {} const dec = await decodeGray8(filePath); if (!dec) return null; const res = mod.pHashFromGray8(dec.buf, dec.width, dec.height, dec.stride); return typeof res === 'bigint' ? res.toString() : res },
    gpu: {
      init: () => { const mod = loadNative(); if (mod) mod.gpuInit() },
      shutdown: () => { const mod = loadNative(); if (mod) mod.gpuShutdown() },
      setEnabled: (v: boolean) => { const mod = loadNative(); if (mod) mod.gpuSetEnabled(!!v) },
      isEnabled: () => { const mod = loadNative(); return mod ? !!mod.gpuIsEnabled() : false },
      isSupported: () => { const mod = loadNative(); return mod ? !!mod.gpuSupported() : false },
      adapterName: () => { const mod = loadNative(); return mod && mod.gpuAdapterName ? String(mod.gpuAdapterName()) : '' }
    },
    writeMetadata: (p: string, meta: unknown) => { const mod = loadNative(); return mod ? !!mod.writeMetadata(p, meta) : false },
    stripMetadata: (p: string) => { const mod = loadNative(); return mod ? !!mod.stripMetadata(p) : false },
    createHammingIndex: (hashes: Array<string | number>) => { const mod = loadNative(); return mod ? mod.createHammingIndex(hashes) : -1 },
    queryHammingIndex: (id: number, query: string | number, k: number, maxDistance: number) => { const mod = loadNative(); return mod ? mod.queryHammingIndex(id, query, k, maxDistance) : [] },
    freeHammingIndex: (id: number) => { const mod = loadNative(); if (mod) mod.freeHammingIndex(id) },
    clusterByHamming: (hashes: Array<string | number>, threshold: number) => { const mod = loadNative(); return mod ? mod.clusterByHamming(hashes, threshold) : [] },
    wicDecodeGray8: (filePath: string) => { const mod = loadNative(); return mod ? mod.wicDecodeGray8(filePath) : null },
    parseTxtProfilesFromFile: (filePath: string) => { const mod = loadNative(); return mod ? mod.parseTxtProfilesFromFile(filePath) : null }
  },
  hashAHashBatch: (paths: string[]) => ipcRenderer.invoke('native-ahash-batch', { paths }),
  hashFileIncremental: (p: string) => ipcRenderer.invoke('hash-file-incremental', { path: p })
})


