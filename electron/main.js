const { app, BrowserWindow, ipcMain, dialog, shell, Notification } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const sharp = require('sharp')
const { randomUUID, createHash } = require('crypto')
const { autoUpdater } = require('electron-updater')

let mainWindow
let didInitUpdater = false
let currentBatchId = 0
let cancelRequested = false
const PRESET_FILE = path.join(app.getPath('userData'), 'preset.json')
let lastUpdateInfo = null

let nativeMod = null
function loadNative() {
  if (nativeMod) return nativeMod
  try {
    const ngb = require('node-gyp-build')
    nativeMod = ngb(path.join(__dirname, '..', 'native'))
    if (nativeMod) return nativeMod
  } catch (_) {}
  try {
    const candidate = path.join(process.cwd(), 'native', 'build', 'Release', 'photounikalizer_native.node')
    if (fs.existsSync(candidate)) {
      nativeMod = require(candidate)
      return nativeMod
    }
  } catch (_) {}
  try {
    const asarUnpacked = path.join(process.resourcesPath || '', 'app.asar.unpacked', 'native', 'build', 'Release', 'photounikalizer_native.node')
    if (asarUnpacked && fs.existsSync(asarUnpacked)) {
      nativeMod = require(asarUnpacked)
      return nativeMod
    }
  } catch (_) {}
  try {
    nativeMod = require('photounikalizer_native')
  } catch (_) {
    nativeMod = null
  }
  return nativeMod
}

function resolveHtmlPath() {
  const devUrl = process.env.VITE_DEV_SERVER_URL
  if (devUrl) return devUrl
  return 'file://' + path.join(__dirname, '..', 'dist', 'index.html').replace(/\\/g, '/')
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1024,
    minHeight: 700,
    title: 'PhotoUnikalizer',
    backgroundColor: '#0b1020',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false
    }
  })
  const url = resolveHtmlPath()
  if (url.startsWith('http')) mainWindow.loadURL(url)
  else mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
}

function initAutoUpdater() {
  if (didInitUpdater) return
  didInitUpdater = true
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', info => {
    lastUpdateInfo = info
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-available', info)
  })
  autoUpdater.on('update-not-available', info => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-not-available', info)
  })
  autoUpdater.on('error', err => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-error', String(err && err.message ? err.message : err))
  })
  autoUpdater.on('download-progress', p => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-download-progress', {
      percent: p.percent,
      bytesPerSecond: p.bytesPerSecond,
      transferred: p.transferred,
      total: p.total,
      online: true
    })
  })
  autoUpdater.on('update-downloaded', info => {
    lastUpdateInfo = info || lastUpdateInfo
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-downloaded', info)
  })
}

function toDateString(d) {
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}:${pad(d.getMonth() + 1)}:${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function sanitizeName(name) {
  return name.replace(/[\\/:*?"<>|]/g, '_')
}

function nameFromTemplate(template, info) {
  const tokens = {
    '{name}': info.baseName,
    '{index}': String(info.index + 1),
    '{ext}': info.ext,
    '{date}': info.dateStr,
    '{uuid}': info.uuid,
    '{rand}': info.rand
  }
  let out = template
  Object.entries(tokens).forEach(([k, v]) => {
    out = out.split(k).join(v)
  })
  return sanitizeName(out)
}

async function fetchJson(url, timeoutMs = 6000) {
  const ctrl = new AbortController()
  const id = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error('http ' + res.status)
    return await res.json()
  } finally {
    clearTimeout(id)
  }
}

async function getOnlineDefaults() {
  try {
    const [deviceP, addrP, userP] = await Promise.allSettled([
      fetchJson('https://random-data-api.com/api/v2/devices'),
      fetchJson('https://random-data-api.com/api/v2/addresses'),
      fetchJson('https://randomuser.me/api/')
    ])
    const out = {}
    if (deviceP.status === 'fulfilled' && deviceP.value) {
      out.make = deviceP.value.manufacturer || deviceP.value.brand || 'Generic'
      out.model = deviceP.value.model || (deviceP.value.device || 'Model')
      out.lens = deviceP.value.device || 'Lens'
      out.software = deviceP.value.platform || 'Firmware'
    }
    if (addrP.status === 'fulfilled' && addrP.value) {
      out.lat = Number(addrP.value.latitude)
      out.lon = Number(addrP.value.longitude)
      out.city = addrP.value.city
      out.state = addrP.value.state
      out.country = addrP.value.country
    }
    if (userP.status === 'fulfilled' && userP.value && userP.value.results && userP.value.results[0]) {
      const u = userP.value.results[0]
      out.author = `${u.name.first} ${u.name.last}`
      out.contact = out.author
      out.email = u.email
      out.url = `https://${u.login.username}.example.com`
      out.owner = out.author
      out.creatorTool = 'PhotoUnikalizer'
    }
    return out
  } catch (_) {
    return null
  }
}

async function processOne(inputPath, index, total, options, progressContext) {
  const srcBase = path.basename(inputPath)
  const baseName = srcBase.replace(/\.[^.]+$/, '')
  const ext = options.format === 'jpg' ? 'jpg' : options.format
  const dateStr = toDateString(new Date())
  const uuid = randomUUID()
  const rand = Math.random().toString(36).slice(2, 8)
  const fileName = nameFromTemplate(options.naming, { baseName, index, ext, dateStr, uuid, rand })
  const outPath = path.join(options.outputDir, fileName)

  const meta = await sharp(inputPath).metadata()
  const width = meta.width || undefined
  const scale = options.resizeDrift > 0 ? 1 + (Math.random() * 2 - 1) * (options.resizeDrift / 100) : 1
  let targetWidth = width ? Math.max(1, Math.round(width * scale)) : undefined
  if (typeof options.resizeMaxW === 'number' && options.resizeMaxW > 0 && width) {
    targetWidth = Math.min(targetWidth || width, options.resizeMaxW)
  }

  let pipeline = sharp(inputPath, { failOn: 'none' })
  pipeline = pipeline.withMetadata(false)
  try { pipeline = pipeline.toColourspace('srgb') } catch (_) {}
  if (targetWidth) pipeline = pipeline.resize({ width: targetWidth, withoutEnlargement: true, fit: 'inside' })

  if (options.format === 'jpg' && (meta.hasAlpha || meta.channels === 4)) {
    pipeline = pipeline.flatten({ background: '#ffffff' })
  }

  if (options.colorDrift > 0) {
    const amount = options.colorDrift / 100
    const brightness = 1 + (Math.random() * 2 - 1) * amount
    const saturation = 1 + (Math.random() * 2 - 1) * amount
    const hue = Math.round((Math.random() * 2 - 1) * 10)
    pipeline = pipeline.modulate({ brightness, saturation, hue })
  }

  if (options.gray) pipeline = pipeline.grayscale()
  if (options.normalize) pipeline = pipeline.normalize()

  if (options.format === 'jpg') pipeline = pipeline.jpeg({ quality: options.quality, mozjpeg: true, progressive: true })
  else if (options.format === 'png') {
    const level = Math.max(0, Math.min(9, Math.round((100 - options.quality) / 10)))
    pipeline = pipeline.png({ compressionLevel: level, palette: true })
  } else if (options.format === 'webp') pipeline = pipeline.webp({ quality: options.quality, effort: 6 })
  else if (options.format === 'avif') pipeline = pipeline.avif({ quality: options.quality, effort: 6 })

  await fs.promises.mkdir(options.outputDir, { recursive: true })
  await pipeline.toFile(outPath)

  const online = options.onlineDefaults || {}
  const tags = {}
  if (options.meta.author || online.author) tags.Artist = options.meta.author || online.author
  if (options.meta.description) tags.ImageDescription = options.meta.description
  if (options.meta.copyright) tags.Copyright = options.meta.copyright
  if (options.meta.keywords && Array.isArray(options.meta.keywords) && options.meta.keywords.length) tags.Keywords = options.meta.keywords
  if (options.meta.contactName || online.contact) tags.Contact = options.meta.contactName || online.contact
  if (options.meta.contactEmail || online.email) tags.Email = options.meta.contactEmail || online.email
  if (options.meta.website || online.url) tags.URL = options.meta.website || online.url
  if (options.meta.owner || online.owner) tags.OwnerName = options.meta.owner || online.owner
  if (options.meta.creatorTool || online.creatorTool) tags.CreatorTool = options.meta.creatorTool || online.creatorTool
  if (options.meta.removeGps) {
    tags.GPSLatitude = null
    tags.GPSLongitude = null
    tags.GPSAltitude = null
    tags.GPSPosition = null
    tags.GPSDateStamp = null
    tags.GPSTimeStamp = null
  }
  if (options.meta.dateStrategy === 'now') tags.AllDates = toDateString(new Date())
  if (options.meta.dateStrategy === 'offset') {
    const ms = Number(options.meta.dateOffsetMinutes || 0) * 60 * 1000
    tags.AllDates = toDateString(new Date(Date.now() + ms))
  }
  if (options.meta.uniqueId) tags.ImageUniqueID = randomUUID()
  if (options.meta.softwareTag !== false) tags.Software = 'PhotoUnikalizer'

  if (options.meta && options.meta.fake === true) {
    const seed = options.meta.fakePerFile ? randomUUID() : 'static'
    const strHash = s => {
      let h = 0
      for (let i = 0; i < s.length; i += 1) h = Math.imul(31, h) + s.charCodeAt(i) | 0
      return Math.abs(h)
    }
    const suffix = strHash(seed + baseName + index).toString(36)
    const profiles = {
      camera: { make: 'Canon', model: 'EOS 5D Mark IV', lens: 'EF 24-70mm f/2.8L II USM' },
      phone: { make: 'Xiaomi', model: 'Mi 11', lens: 'Wide 26mm f/1.9' },
      action: { make: 'GoPro', model: 'HERO 11', lens: 'UltraWide' },
      drone: { make: 'DJI', model: 'Mavic 3', lens: '24mm f/2.8' },
      scanner: { make: 'Epson', model: 'Perfection V600', lens: 'CCD' }
    }
    const prof = profiles[options.meta.fakeProfile] || profiles.camera
    if (options.meta.fakeAuto) {
      const baseMake = online.make || prof.make
      const baseModel = online.model || prof.model
      const baseLens = online.lens || prof.lens
      tags.Make = `${baseMake}-${suffix}`
      tags.Model = `${baseModel}-${suffix}`
      tags.LensModel = `${baseLens}-${suffix}`
      tags.BodySerialNumber = `SN-${suffix}`
      tags.ExposureTime = '1/200'
      tags.FNumber = 2.8
      tags.ISO = 200
      tags.FocalLength = 35
      tags.ExposureProgram = 3
      tags.MeteringMode = 5
      tags.Flash = 16
      tags.WhiteBalance = 0
      tags.ColorSpace = 'sRGB'
      tags.Rating = 5
      tags.Label = 'verified'
      tags.ObjectName = 'Title ' + suffix
      tags.City = online.city || 'City'
      tags.State = online.state || 'Region'
      tags.Country = online.country || 'Country'
    }
    if (options.meta.fakeMake || options.meta.fakeModel) {
      if (options.meta.fakeMake) tags.Make = `${options.meta.fakeMake}-${suffix}`
      if (options.meta.fakeModel) tags.Model = `${options.meta.fakeModel}-${suffix}`
    }
    if (options.meta.fakeLens) tags.LensModel = `${options.meta.fakeLens}-${suffix}`
    if (options.meta.fakeSoftware) tags.Software = `${options.meta.fakeSoftware}-${suffix}`
    if (options.meta.fakeSerial) tags.BodySerialNumber = `${options.meta.fakeSerial}-${suffix}`
    if (options.meta.fakeGps) {
      const lat = typeof options.meta.fakeLat === 'number' ? options.meta.fakeLat : (Number.isFinite(online.lat) ? online.lat : (Math.random() * 180 - 90))
      const lon = typeof options.meta.fakeLon === 'number' ? options.meta.fakeLon : (Number.isFinite(online.lon) ? online.lon : (Math.random() * 360 - 180))
      const alt = typeof options.meta.fakeAltitude === 'number' ? options.meta.fakeAltitude : Math.round(Math.random() * 3000)
      tags.GPSLatitude = lat
      tags.GPSLongitude = lon
      tags.GPSAltitude = alt
    }
    if (typeof options.meta.fakeIso === 'number') tags.ISO = options.meta.fakeIso
    if (options.meta.fakeExposureTime) tags.ExposureTime = options.meta.fakeExposureTime
    if (typeof options.meta.fakeFNumber === 'number') tags.FNumber = options.meta.fakeFNumber
    if (typeof options.meta.fakeFocalLength === 'number') tags.FocalLength = options.meta.fakeFocalLength
    if (typeof options.meta.fakeExposureProgram === 'number') tags.ExposureProgram = options.meta.fakeExposureProgram
    if (typeof options.meta.fakeMeteringMode === 'number') tags.MeteringMode = options.meta.fakeMeteringMode
    if (typeof options.meta.fakeFlash === 'number') tags.Flash = options.meta.fakeFlash
    if (typeof options.meta.fakeWhiteBalance === 'number') tags.WhiteBalance = options.meta.fakeWhiteBalance
    if (options.meta.fakeColorSpace) tags.ColorSpace = options.meta.fakeColorSpace
    if (typeof options.meta.fakeRating === 'number') tags.Rating = options.meta.fakeRating
    if (options.meta.fakeLabel) tags.Label = options.meta.fakeLabel
    if (options.meta.fakeTitle) tags.ObjectName = options.meta.fakeTitle
    if (options.meta.fakeCity) tags.City = options.meta.fakeCity
    if (options.meta.fakeState) tags.State = options.meta.fakeState
    if (options.meta.fakeCountry) tags.Country = options.meta.fakeCountry
  }

  if (options.meta && options.meta.removeAll) {
    try { const nat = loadNative(); if (nat && typeof nat.stripMetadata==='function') nat.stripMetadata(outPath) } catch (_) {}
  }
  if (!options.meta || options.meta.removeAll !== true) {
    try {
      const meta = {
        artist: tags.Artist || '',
        description: tags.ImageDescription || '',
        copyright: tags.Copyright || '',
        keywords: tags.Keywords || [],
        contact: tags.Contact || '',
        email: tags.Email || '',
        url: tags.URL || '',
        owner: tags.OwnerName || '',
        creatorTool: tags.CreatorTool || '',
        title: tags.ObjectName || '',
        label: tags.Label || '',
        rating: typeof tags.Rating === 'number' ? tags.Rating : -1,
        make: tags.Make || '',
        model: tags.Model || '',
        lensModel: tags.LensModel || '',
        bodySerial: tags.BodySerialNumber || '',
        exposureTime: tags.ExposureTime || '',
        fNumber: typeof tags.FNumber === 'number' ? tags.FNumber : -1,
        iso: typeof tags.ISO === 'number' ? tags.ISO : -1,
        focalLength: typeof tags.FocalLength === 'number' ? tags.FocalLength : -1,
        exposureProgram: typeof tags.ExposureProgram === 'number' ? tags.ExposureProgram : -1,
        meteringMode: typeof tags.MeteringMode === 'number' ? tags.MeteringMode : -1,
        flash: typeof tags.Flash === 'number' ? tags.Flash : -1,
        whiteBalance: typeof tags.WhiteBalance === 'number' ? tags.WhiteBalance : -1,
        colorSpace: tags.ColorSpace || '',
        gps: (typeof tags.GPSLatitude === 'number' && typeof tags.GPSLongitude === 'number') ? { lat: tags.GPSLatitude, lon: tags.GPSLongitude, alt: typeof tags.GPSAltitude==='number'?tags.GPSAltitude:0 } : undefined,
        city: tags.City || '',
        state: tags.State || '',
        country: tags.Country || '',
        dateCreated: tags.AllDates || ''
      }
      const nat = loadNative(); if (nat && typeof nat.writeMetadata==='function') nat.writeMetadata(outPath, meta)
    } catch (_) {}
  }

  if (progressContext && typeof progressContext.onFileDone === 'function') {
    try { progressContext.onFileDone(inputPath) } catch (_) {}
  }
  if (progressContext && typeof progressContext.emitProgress === 'function') {
    try { progressContext.emitProgress(index + 1, total, srcBase, outPath) } catch (_) {}
  } else if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('process-progress', { index, total, file: srcBase, status: 'ok', outPath })
  }
}

async function processBatch(inputFiles, options) {
  cancelRequested = false
  const thisBatchId = ++currentBatchId
  const total = inputFiles.length
  const cpuBased = Math.max(1, Math.min(4, (os.cpus() || []).length - 1 || 1))
  const concurrency = Math.max(1, Math.min(Number(options.maxConcurrency || cpuBased), 8))
  const sizesByPath = (options && options.sizesByPath) || {}
  const totalBytes = Number(options && options.totalBytes) || inputFiles.reduce((acc, p) => acc + (Number(sizesByPath[p]) || 0), 0)
  const startedAt = Date.now()
  let processedBytes = 0
  let completed = 0
  function calcProgress() {
    const elapsedMs = Math.max(1, Date.now() - startedAt)
    const speedBps = processedBytes * 1000 / elapsedMs
    const remainBytes = Math.max(0, totalBytes - processedBytes)
    const etaMs = speedBps > 0 ? Math.round(remainBytes / speedBps * 1000) : 0
    const percent = totalBytes > 0 ? (processedBytes / totalBytes) * 100 : (completed / Math.max(1, total)) * 100
    return { speedBps, etaMs, percent }
  }
  const progressContext = {
    onFileDone: (p) => { processedBytes += Number(sizesByPath[p]) || 0; completed += 1 },
    emitProgress: (idx, tot, fileName, outPath) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        const prog = calcProgress()
        mainWindow.webContents.send('process-progress', { index: idx - 1, total: tot, file: fileName, status: 'ok', speedBps: prog.speedBps, etaMs: prog.etaMs, percent: prog.percent, outPath })
      }
    }
  }
  let nextIndex = 0
  async function worker() {
    while (true) {
      if (cancelRequested || thisBatchId !== currentBatchId) return
      const i = nextIndex
      if (i >= total) return
      nextIndex += 1
      const p = inputFiles[i]
      try {
        await processOne(p, i, total, options, progressContext)
      } catch (e) {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('process-progress', { index: i, total, file: path.basename(p), status: 'error', message: String(e && e.message ? e.message : e) })
        }
      }
    }
  }
  const workers = new Array(concurrency).fill(0).map(() => worker())
  await Promise.all(workers)
  if (thisBatchId === currentBatchId) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('process-complete', { canceled: cancelRequested })
      try {
        new Notification({ title: 'PhotoUnikalizer', body: cancelRequested ? 'Обработка отменена' : 'Обработка завершена' }).show()
      } catch (_) {}
    }
  }
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.yalokgar.photounikalizer')
  if (!app.requestSingleInstanceLock()) {
    app.quit()
    return
  } else {
    app.on('second-instance', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.focus()
      }
    })
  }
  createWindow()
  initAutoUpdater()

  const devUrl = process.env.VITE_DEV_SERVER_URL
  if (!devUrl) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => {})
    }, 1500)
    setInterval(() => {
      try { initAutoUpdater(); autoUpdater.checkForUpdates().catch(()=>{}) } catch (_) {}
    }, 10 * 60 * 1000)
  }

  ipcMain.handle('select-images', async () => {
    const res = await dialog.showOpenDialog(mainWindow, { properties: ['openFile', 'multiSelections'], filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'tif', 'tiff'] }] })
    if (res.canceled) return []
    return res.filePaths
  })

  async function collectAllowedFromDir(dir) {
    const allowed = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff'])
    async function walk(d) {
      const out = []
      const items = await fs.promises.readdir(d, { withFileTypes: true })
      for (const it of items) {
        const p = path.join(d, it.name)
        if (it.isDirectory()) {
          const nested = await walk(p)
          out.push(...nested)
        } else {
          const ext = path.extname(it.name).toLowerCase()
          if (allowed.has(ext)) out.push(p)
        }
      }
      return out
    }
    return walk(dir)
  }

  async function collectAllowedFromPaths(paths) {
    const out = []
    const stats = await Promise.all(paths.map(p => fs.promises.stat(p).then(s => ({ p, s })).catch(() => null)))
    for (const it of stats) {
      if (!it) continue
      if (it.s.isDirectory()) {
        const nested = await collectAllowedFromDir(it.p)
        out.push(...nested)
      } else {
        const ext = path.extname(it.p).toLowerCase()
        if (['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff'].includes(ext)) out.push(it.p)
      }
    }
    return out
  }

  ipcMain.handle('select-image-dir', async () => {
    const res = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory', 'createDirectory'] })
    if (res.canceled) return []
    const dir = res.filePaths[0]
    try {
      return await collectAllowedFromDir(dir)
    } catch (_) {
      return []
    }
  })

  ipcMain.handle('expand-paths', async (_e, inputs) => {
    try {
      if (!Array.isArray(inputs) || !inputs.length) return []
      return await collectAllowedFromPaths(inputs)
    } catch (_) {
      return []
    }
  })

  ipcMain.handle('select-text-file', async () => {
    try {
      const res = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
          { name: 'Text', extensions: ['txt', 'log'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })
      if (res.canceled || !res.filePaths || !res.filePaths[0]) return { ok: false }
      const filePath = res.filePaths[0]
      const content = await fs.promises.readFile(filePath, 'utf-8')
      return { ok: true, path: filePath, content }
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) }
    }
  })

  ipcMain.handle('select-output-dir', async () => {
    const res = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory', 'createDirectory'] })
    if (res.canceled) return ''
    return res.filePaths[0]
  })

  ipcMain.handle('process-images', async (e, payload) => {
    const required = payload && Array.isArray(payload.inputFiles) && payload.inputFiles.length > 0 && payload.outputDir
    if (!required) return { ok: false }
    let onlineDefaults = null
    if (payload.meta && payload.meta.fake && payload.meta.onlineAuto) {
      onlineDefaults = await getOnlineDefaults()
    }
    payload.onlineDefaults = onlineDefaults || {}
    try {
      const stats = await Promise.all(payload.inputFiles.map(p => fs.promises.stat(p).then(s => ({ p, s })).catch(() => null)))
      const sizesByPath = {}
      let totalBytes = 0
      for (const it of stats) {
        if (!it || !it.s || !it.s.isFile()) continue
        sizesByPath[it.p] = Number(it.s.size) || 0
        totalBytes += Number(it.s.size) || 0
      }
      payload.sizesByPath = sizesByPath
      payload.totalBytes = totalBytes
    } catch (_) {}
    processBatch(payload.inputFiles, payload)
    return { ok: true }
  })

  ipcMain.handle('save-preset', async (_e, payload) => {
    try {
      await fs.promises.mkdir(path.dirname(PRESET_FILE), { recursive: true })
      await fs.promises.writeFile(PRESET_FILE, JSON.stringify(payload || {}, null, 2), 'utf-8')
      return { ok: true }
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) }
    }
  })

  ipcMain.handle('load-preset', async () => {
    try {
      const buf = await fs.promises.readFile(PRESET_FILE, 'utf-8')
      return { ok: true, data: JSON.parse(buf) }
    } catch (e) {
      return { ok: false }
    }
  })

  ipcMain.handle('cancel-process', async () => {
    cancelRequested = true
    return { ok: true }
  })

  ipcMain.handle('open-path', async (_e, p) => {
    if (!p) return { ok: false }
    try {
      await shell.openPath(p)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) }
    }
  })

  ipcMain.handle('show-item-in-folder', async (_e, p) => {
    try {
      shell.showItemInFolder(p)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) }
    }
  })

  ipcMain.handle('check-for-updates', async () => {
    try {
      initAutoUpdater()
      const res = await autoUpdater.checkForUpdates()
      return { ok: true, info: res && res.updateInfo ? res.updateInfo : null }
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) }
    }
  })

  ipcMain.handle('download-update', async () => {
    try {
      initAutoUpdater()
      await autoUpdater.downloadUpdate()
      return { ok: true }
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) }
    }
  })

  ipcMain.handle('quit-and-install', async () => {
    try {
      initAutoUpdater()
      setImmediate(() => autoUpdater.quitAndInstall())
      return { ok: true }
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) }
    }
  })

  ipcMain.handle('save-json', async (_e, payload) => {
    try {
      const defPath = (payload && payload.defaultPath) || path.join(app.getPath('documents'), 'data.json')
      const res = await dialog.showSaveDialog(mainWindow, {
        defaultPath: defPath,
        filters: [{ name: 'JSON', extensions: ['json'] }]
      })
      if (res.canceled || !res.filePath) return { ok: false }
      await fs.promises.writeFile(res.filePath, (payload && payload.data) || '', 'utf-8')
      return { ok: true, path: res.filePath }
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) }
    }
  })

  ipcMain.handle('get-update-changelog', async () => {
    try {
      const extract = (info) => {
        if (!info) return ''
        const rn = info.releaseNotes
        if (!rn) return ''
        if (typeof rn === 'string') return rn
        if (Array.isArray(rn)) return rn.map(x => (x && (x.note || x.notes || ''))).filter(Boolean).join('\n\n')
        if (typeof rn === 'object' && (rn.note || rn.notes)) return rn.note || rn.notes
        return ''
      }
      let notesGithub = extract(lastUpdateInfo)
      const version = (lastUpdateInfo && (lastUpdateInfo.version || lastUpdateInfo.tag)) || app.getVersion()
      const ownerRepo = 'YALOKGARua/PhotoUnikalizer'
      if (!notesGithub) {
        let data = null
        try {
          data = await fetchJson(`https://api.github.com/repos/${ownerRepo}/releases/tags/v${version}`, 8000)
        } catch (_) {}
        if (!data) {
          try {
            data = await fetchJson(`https://api.github.com/repos/${ownerRepo}/releases/latest`, 8000)
          } catch (_) {}
        }
        notesGithub = (data && (data.body || data.name || '')) || ''
      }
      let notesChangelog = ''
      try {
        const root = path.join(__dirname, '..')
        const changelogPath = path.join(root, 'CHANGELOG.md')
        const md = await fs.promises.readFile(changelogPath, 'utf-8')
        const ver = `v${version}`
        const lines = md.split(/\r?\n/)
        let start = -1
        let end = lines.length
        for (let i = 0; i < lines.length; i += 1) {
          if (lines[i].trim().toLowerCase().startsWith('##') && lines[i].includes(ver)) {
            start = i + 1
            for (let j = start; j < lines.length; j += 1) {
              if (lines[j].trim().toLowerCase().startsWith('##')) { end = j; break }
            }
            break
          }
        }
        if (start !== -1) notesChangelog = lines.slice(start, end).join('\n').trim()
        if (!notesChangelog) notesChangelog = md.trim()
      } catch (_) {}
      const combined = [notesGithub, notesChangelog].filter(Boolean).join('\n\n')
      return { ok: true, notes: combined, github: notesGithub || '', changelog: notesChangelog || '' }
    } catch (e) {
      return { ok: false, notes: '' }
    }
  })

  ipcMain.handle('get-readme', async () => {
    try {
      const root = path.join(__dirname, '..')
      const p = path.join(root, 'README.md')
      const data = await fs.promises.readFile(p, 'utf-8')
      return { ok: true, data }
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) }
    }
  })

  ipcMain.handle('save-json-batch', async (_e, payload) => {
    try {
      const items = (payload && Array.isArray(payload.items)) ? payload.items : []
      if (!items.length) return { ok: false }
      const res = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory', 'createDirectory'] })
      if (res.canceled || !res.filePaths || !res.filePaths[0]) return { ok: false }
      const dir = res.filePaths[0]
      await fs.promises.mkdir(dir, { recursive: true })
      const writes = items.map(async it => {
        const base = sanitizeName((it && it.name) || 'profile.json')
        const target = path.join(dir, base.endsWith('.json') ? base : base + '.json')
        await fs.promises.writeFile(target, (it && it.data) || '', 'utf-8')
        return target
      })
      const paths = await Promise.all(writes)
      return { ok: true, paths }
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) }
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {})