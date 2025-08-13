const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  selectImages: () => ipcRenderer.invoke('select-images'),
  selectOutputDir: () => ipcRenderer.invoke('select-output-dir'),
  processImages: payload => ipcRenderer.invoke('process-images', payload),
  onProgress: cb => {
    const listener = (_, data) => cb(data)
    ipcRenderer.on('process-progress', listener)
    return () => ipcRenderer.removeListener('process-progress', listener)
  },
  onComplete: cb => {
    const listener = () => cb()
    ipcRenderer.on('process-complete', listener)
    return () => ipcRenderer.removeListener('process-complete', listener)
  }
})