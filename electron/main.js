const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const sharp = require('sharp')
const { exiftool } = require('exiftool-vendored')
const { randomUUID } = require('crypto')

let mainWindow

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
    '{date}': info.dateStr
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
      out.creatorTool = 'photoUniq'
    }
    return out
  } catch (_) {
    return null
  }
}

async function processOne(inputPath, index, total, options) {
  const srcBase = path.basename(inputPath)
  const baseName = srcBase.replace(/\.[^.]+$/, '')
  const ext = options.format === 'jpg' ? 'jpg' : options.format
  const dateStr = toDateString(new Date())
  const fileName = nameFromTemplate(options.naming, { baseName, index, ext, dateStr })
  const outPath = path.join(options.outputDir, fileName)

  const meta = await sharp(inputPath).metadata()
  const width = meta.width || undefined
  const scale = options.resizeDrift > 0 ? 1 + (Math.random() * 2 - 1) * (options.resizeDrift / 100) : 1
  const targetWidth = width ? Math.max(1, Math.round(width * scale)) : undefined

  let pipeline = sharp(inputPath, { failOn: 'none' })
  if (targetWidth) pipeline = pipeline.resize({ width: targetWidth, withoutEnlargement: true, fit: 'inside' })

  if (options.colorDrift > 0) {
    const amount = options.colorDrift / 100
    const brightness = 1 + (Math.random() * 2 - 1) * amount
    const saturation = 1 + (Math.random() * 2 - 1) * amount
    const hue = Math.round((Math.random() * 2 - 1) * 10)
    pipeline = pipeline.modulate({ brightness, saturation, hue })
  }

  if (options.format === 'jpg') pipeline = pipeline.jpeg({ quality: options.quality, mozjpeg: true })
  else if (options.format === 'png') {
    const level = Math.max(0, Math.min(9, Math.round((100 - options.quality) / 10)))
    pipeline = pipeline.png({ compressionLevel: level })
  } else if (options.format === 'webp') pipeline = pipeline.webp({ quality: options.quality })
  else if (options.format === 'avif') pipeline = pipeline.avif({ quality: options.quality })

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
    await exiftool.write(outPath, {}, ['-all=', '-overwrite_original'])
  }
  if (Object.keys(tags).length) await exiftool.write(outPath, tags, ['-overwrite_original'])

  mainWindow.webContents.send('process-progress', { index, total, file: srcBase, status: 'ok', outPath })
}

async function processBatch(inputFiles, options) {
  for (let i = 0; i < inputFiles.length; i += 1) {
    const p = inputFiles[i]
    try {
      await processOne(p, i, inputFiles.length, options)
    } catch (e) {
      mainWindow.webContents.send('process-progress', { index: i, total: inputFiles.length, file: path.basename(p), status: 'error', message: String(e && e.message ? e.message : e) })
    }
  }
  mainWindow.webContents.send('process-complete', {})
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.yalokgar.photouniq')
  createWindow()

  ipcMain.handle('select-images', async () => {
    const res = await dialog.showOpenDialog(mainWindow, { properties: ['openFile', 'multiSelections'], filters: [{ name: 'Изображения', extensions: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'tif', 'tiff'] }] })
    if (res.canceled) return []
    return res.filePaths
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
    processBatch(payload.inputFiles, payload)
    return { ok: true }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  exiftool.end()
})