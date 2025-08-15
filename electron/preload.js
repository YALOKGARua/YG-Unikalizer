const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  selectImages: () => ipcRenderer.invoke('select-images'),
  selectImageDir: () => ipcRenderer.invoke('select-image-dir'),
  selectOutputDir: () => ipcRenderer.invoke('select-output-dir'),
  processImages: payload => ipcRenderer.invoke('process-images', payload),
  selectTextFile: () => ipcRenderer.invoke('select-text-file'),
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
  getUpdateChangelog: () => ipcRenderer.invoke('get-update-changelog')
})