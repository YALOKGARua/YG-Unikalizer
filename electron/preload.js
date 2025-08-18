const { contextBridge, ipcRenderer } = require('electron')
const path = require('path')
const fs = require('fs')
let sharp = null
let native = null
function loadNative() {
  if (native) return native
  try {
    try {
      const ngb = require('node-gyp-build')
      native = ngb(path.join(__dirname, '..', 'native'))
      if (native) return native
    } catch (_) {}
    const candidate = path.join(process.cwd(), 'native', 'build', 'Release', 'photounikalizer_native.node')
    if (fs.existsSync(candidate)) {
      native = require(candidate)
      return native
    }
  } catch (_) {}
  try {
    const asarUnpacked = path.join(process.resourcesPath || '', 'app.asar.unpacked', 'native', 'build', 'Release', 'photounikalizer_native.node')
    if (asarUnpacked && fs.existsSync(asarUnpacked)) {
      native = require(asarUnpacked)
      return native
    }
  } catch (_) {}
  try {
    native = require('photounikalizer_native')
  } catch (_) {
    native = null
  }
  return native
}

async function decodeGray8(filePath) {
  if (!sharp) {
    try { sharp = require('sharp') } catch (_) { sharp = null }
  }
  if (!sharp) return null
  const res = await sharp(filePath).grayscale().raw().toBuffer({ resolveWithObject: true })
  const buf = new Uint8Array(res.data.buffer, res.data.byteOffset, res.data.byteLength)
  const width = res.info.width
  const height = res.info.height
  const stride = res.info.width * res.info.channels
  return { buf, width, height, stride }
}

contextBridge.exposeInMainWorld('api', {
  selectImages: () => ipcRenderer.invoke('select-images'),
  selectImageDir: () => ipcRenderer.invoke('select-image-dir'),
  selectOutputDir: () => ipcRenderer.invoke('select-output-dir'),
  processImages: payload => ipcRenderer.invoke('process-images', payload),
  selectTextFile: () => ipcRenderer.invoke('select-text-file'),
  readTextFileByPath: (p) => ipcRenderer.invoke('read-text-file-by-path', p),
  saveJson: payload => ipcRenderer.invoke('save-json', payload),
  saveJsonBatch: payload => ipcRenderer.invoke('save-json-batch', payload),
  savePreset: payload => ipcRenderer.invoke('save-preset', payload),
  loadPreset: () => ipcRenderer.invoke('load-preset'),
  cancel: () => ipcRenderer.invoke('cancel-process'),
  expandPaths: paths => ipcRenderer.invoke('expand-paths', paths),
  openPath: p => ipcRenderer.invoke('open-path', p),
  showInFolder: p => ipcRenderer.invoke('show-item-in-folder', p),
  onProgress: cb => {
    const listener = (_, data) => cb(data)
    ipcRenderer.on('process-progress', listener)
    return () => ipcRenderer.removeListener('process-progress', listener)
  },
  onComplete: cb => {
    const listener = () => cb()
    ipcRenderer.on('process-complete', listener)
    return () => ipcRenderer.removeListener('process-complete', listener)
  },
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  onUpdateAvailable: cb => {
    const listener = (_, info) => cb(info)
    ipcRenderer.on('update-available', listener)
    return () => ipcRenderer.removeListener('update-available', listener)
  },
  onUpdateNotAvailable: cb => {
    const listener = (_, info) => cb(info)
    ipcRenderer.on('update-not-available', listener)
    return () => ipcRenderer.removeListener('update-not-available', listener)
  },
  onUpdateError: cb => {
    const listener = (_, err) => cb(err)
    ipcRenderer.on('update-error', listener)
    return () => ipcRenderer.removeListener('update-error', listener)
  },
  onUpdateProgress: cb => {
    const listener = (_, p) => cb(p)
    ipcRenderer.on('update-download-progress', listener)
    return () => ipcRenderer.removeListener('update-download-progress', listener)
  },
  onUpdateDownloaded: cb => {
    const listener = (_, info) => cb(info)
    ipcRenderer.on('update-downloaded', listener)
    return () => ipcRenderer.removeListener('update-downloaded', listener)
  },
  getUpdateChangelog: () => ipcRenderer.invoke('get-update-changelog'),
  getReadme: () => ipcRenderer.invoke('get-readme'),
  native: {
    parseTxtProfiles: (text) => { const mod = loadNative(); return mod ? mod.parseTxtProfiles(String(text||'')) : null },
    computeFileHash: async p => {
      const mod = loadNative()
      if (!mod) return null
      const res = mod.computeFileHash(p)
      return typeof res === 'bigint' ? res.toString() : res
    },
    hammingDistance: (a, b) => {
      const mod = loadNative()
      if (!mod) return null
      return mod.hammingDistance(a, b)
    },
    scanDirectory: (dir, recursive = true) => {
      const mod = loadNative()
      if (!mod) return []
      return mod.scanDirectory(dir, !!recursive)
    },
    scanDirectoryFiltered: (dir, recursive = true, excludes = []) => {
      const mod = loadNative()
      if (!mod) return []
      return mod.scanDirectoryFiltered(dir, !!recursive, Array.isArray(excludes) ? excludes : [])
    },
    aHashFromGray8: (buf, w, h, stride) => {
      const mod = loadNative()
      if (!mod) return null
      const res = mod.aHashFromGray8(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength), w, h, stride)
      return typeof res === 'bigint' ? res.toString() : res
    },
    dHashFromGray8: (buf, w, h, stride) => {
      const mod = loadNative()
      if (!mod) return null
      const res = mod.dHashFromGray8(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength), w, h, stride)
      return typeof res === 'bigint' ? res.toString() : res
    },
    pHashFromGray8: (buf, w, h, stride) => {
      const mod = loadNative()
      if (!mod) return null
      const res = mod.pHashFromGray8(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength), w, h, stride)
      return typeof res === 'bigint' ? res.toString() : res
    },
    topKHamming: (hashes, query, k) => {
      const mod = loadNative()
      if (!mod) return []
      return mod.topKHamming(hashes, query, k)
    },
    fileAHash: async (filePath) => {
      const mod = loadNative()
      if (!mod) return null
      const dec = await decodeGray8(filePath)
      if (!dec) return null
      const res = mod.aHashFromGray8(dec.buf, dec.width, dec.height, dec.stride)
      return typeof res === 'bigint' ? res.toString() : res
    },
    fileDHash: async (filePath) => {
      const mod = loadNative()
      if (!mod) return null
      const dec = await decodeGray8(filePath)
      if (!dec) return null
      const res = mod.dHashFromGray8(dec.buf, dec.width, dec.height, dec.stride)
      return typeof res === 'bigint' ? res.toString() : res
    },
    filePHash: async (filePath) => {
      const mod = loadNative()
      if (!mod) return null
      const dec = await decodeGray8(filePath)
      if (!dec) return null
      const res = mod.pHashFromGray8(dec.buf, dec.width, dec.height, dec.stride)
      return typeof res === 'bigint' ? res.toString() : res
    },
    gpu: {
      init: () => { const mod = loadNative(); if (mod) mod.gpuInit() },
      shutdown: () => { const mod = loadNative(); if (mod) mod.gpuShutdown() },
      setEnabled: (v) => { const mod = loadNative(); if (mod) mod.gpuSetEnabled(!!v) },
      isEnabled: () => { const mod = loadNative(); return mod ? !!mod.gpuIsEnabled() : false },
      isSupported: () => { const mod = loadNative(); return mod ? !!mod.gpuSupported() : false },
      adapterName: () => { const mod = loadNative(); return mod && mod.gpuAdapterName ? String(mod.gpuAdapterName()) : '' }
    },
    writeMetadata: (p, meta) => { const mod = loadNative(); return mod ? !!mod.writeMetadata(p, meta) : false },
    stripMetadata: (p) => { const mod = loadNative(); return mod ? !!mod.stripMetadata(p) : false },
    createHammingIndex: (hashes) => { const mod = loadNative(); return mod ? mod.createHammingIndex(hashes) : -1 },
    queryHammingIndex: (id, query, k, maxDistance) => { const mod = loadNative(); return mod ? mod.queryHammingIndex(id, query, k, maxDistance) : [] },
    freeHammingIndex: (id) => { const mod = loadNative(); if (mod) mod.freeHammingIndex(id) },
    clusterByHamming: (hashes, threshold) => { const mod = loadNative(); return mod ? mod.clusterByHamming(hashes, threshold) : [] },
    wicDecodeGray8: (filePath) => { const mod = loadNative(); return mod ? mod.wicDecodeGray8(filePath) : null },
    parseTxtProfilesFromFile: (filePath) => { const mod = loadNative(); return mod ? mod.parseTxtProfilesFromFile(filePath) : null }
  }
})