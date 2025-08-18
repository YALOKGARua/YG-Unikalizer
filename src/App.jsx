import { useEffect, useMemo, useState } from 'react'
import ProgressLine from './components/ProgressLine'

function toFileUrl(p) {
  let s = p.replace(/\\/g, '/')
  if (!s.startsWith('/')) s = '/' + s
  return encodeURI('file://' + s)
}

export default function App() {
  const [files, setFiles] = useState([])
  const [outputDir, setOutputDir] = useState('')
  const [format, setFormat] = useState('jpg')
  const [quality, setQuality] = useState(85)
  const [colorDrift, setColorDrift] = useState(2)
  const [resizeDrift, setResizeDrift] = useState(2)
  const [author, setAuthor] = useState('')
  const [description, setDescription] = useState('')
  const [copyright, setCopyright] = useState('')
  const [keywords, setKeywords] = useState('')
  const [removeGps, setRemoveGps] = useState(true)
  const [dateStrategy, setDateStrategy] = useState('now')
  const [dateOffsetMinutes, setDateOffsetMinutes] = useState(0)
  const [uniqueId, setUniqueId] = useState(true)
  const [naming, setNaming] = useState('{name}_{index}.{ext}')
  const [removeAllMeta, setRemoveAllMeta] = useState(false)
  const [profile, setProfile] = useState('custom')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, lastFile: '', etaMs: 0, speedBps: 0 })
  const [results, setResults] = useState([])
  const [activeTab, setActiveTab] = useState('files')
  const [txtPath, setTxtPath] = useState('')
  const [txtContent, setTxtContent] = useState('')
  const [jsonPreview, setJsonPreview] = useState('')
  const [parseInfo, setParseInfo] = useState({ lines: 0, ok: 0, errors: 0 })
  const [parseError, setParseError] = useState('')
  const [profiles, setProfiles] = useState([])
  const [selectedProfiles, setSelectedProfiles] = useState(new Set())
  const [search, setSearch] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [owner, setOwner] = useState('')
  const [creatorTool, setCreatorTool] = useState('')
  const [fakeMeta, setFakeMeta] = useState(false)
  const [fakePerFile, setFakePerFile] = useState(true)
  const [fakeMake, setFakeMake] = useState('')
  const [fakeModel, setFakeModel] = useState('')
  const [fakeLens, setFakeLens] = useState('')
  const [fakeSoftware, setFakeSoftware] = useState('')
  const [fakeSerial, setFakeSerial] = useState('')
  const [fakeGps, setFakeGps] = useState(false)
  const [fakeLat, setFakeLat] = useState('')
  const [fakeLon, setFakeLon] = useState('')
  const [fakeAltitude, setFakeAltitude] = useState('')
  const [fakeAuto, setFakeAuto] = useState(true)
  const [fakeProfile, setFakeProfile] = useState('camera')
  const [onlineAuto, setOnlineAuto] = useState(true)
  const [fakeIso, setFakeIso] = useState('')
  const [fakeExposureTime, setFakeExposureTime] = useState('')
  const [fakeFNumber, setFakeFNumber] = useState('')
  const [fakeFocalLength, setFakeFocalLength] = useState('')
  const [fakeExposureProgram, setFakeExposureProgram] = useState('')
  const [fakeMeteringMode, setFakeMeteringMode] = useState('')
  const [fakeFlash, setFakeFlash] = useState('')
  const [fakeWhiteBalance, setFakeWhiteBalance] = useState('')
  const [fakeColorSpace, setFakeColorSpace] = useState('')
  const [fakeRating, setFakeRating] = useState('')
  const [fakeLabel, setFakeLabel] = useState('')
  const [fakeTitle, setFakeTitle] = useState('')
  const [fakeCity, setFakeCity] = useState('')
  const [fakeState, setFakeState] = useState('')
  const [fakeCountry, setFakeCountry] = useState('')
  const [locationPreset, setLocationPreset] = useState('none')
  const renderFakeBelow = false

  const [upd, setUpd] = useState({ available: false, info: null, downloading: false, percent: 0, error: null, downloaded: false, notes: '' })
  const [netLost, setNetLost] = useState(false)
  const [currentNotesOpen, setCurrentNotesOpen] = useState(false)
  const [currentNotes, setCurrentNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [gpuSupported, setGpuSupported] = useState(false)
  const [gpuEnabled, setGpuEnabled] = useState(false)
  const [gpuName, setGpuName] = useState('')

  const GEAR_PRESETS = {
    camera: {
      makes: ['Canon', 'Nikon', 'Sony', 'Fujifilm', 'Panasonic'],
      modelsByMake: {
        Canon: ['EOS R5', 'EOS 5D Mark IV', 'EOS 90D', 'EOS R6 Mark II'],
        Nikon: ['Z7 II', 'D850', 'Z6', 'Z8'],
        Sony: ['Alpha A7 IV', 'Alpha A7R III', 'Alpha A6400', 'Alpha A1'],
        Fujifilm: ['X‑T5', 'X‑S10', 'X100V', 'GFX 50S'],
        Panasonic: ['Lumix S5 II', 'Lumix GH6', 'Lumix G9']
      },
      lensesByMake: {
        Canon: ['RF 24‑70mm f/2.8L', 'EF 50mm f/1.8 STM', 'RF 70‑200mm f/2.8L', 'RF 35mm f/1.8'],
        Nikon: ['Z 24‑70mm f/2.8', 'AF‑S 50mm f/1.8G', 'Z 70‑200mm f/2.8', 'Z 35mm f/1.8'],
        Sony: ['FE 24‑70mm f/2.8 GM', 'FE 50mm f/1.8', 'FE 85mm f/1.8', 'FE 35mm f/1.8'],
        Fujifilm: ['XF 23mm f/1.4', 'XF 18‑55mm f/2.8‑4', 'XF 56mm f/1.2', 'XF 35mm f/1.4'],
        Panasonic: ['LUMIX S 24‑105mm f/4', 'LEICA 12‑60mm f/2.8‑4', 'LUMIX G 25mm f/1.7']
      }
    },
    phone: {
      makes: ['Apple', 'Samsung', 'Xiaomi', 'Google', 'Huawei'],
      modelsByMake: {
        Apple: ['iPhone 15 Pro', 'iPhone 14 Pro', 'iPhone 13'],
        Samsung: ['Galaxy S24', 'Galaxy S23', 'Galaxy Note 20'],
        Xiaomi: ['Mi 13', 'Mi 11', 'Redmi Note 12'],
        Google: ['Pixel 8 Pro', 'Pixel 7', 'Pixel 6a'],
        Huawei: ['P60 Pro', 'P50', 'Mate 40']
      },
      lenses: ['Wide 26mm f/1.9', 'UltraWide 13mm f/2.2', 'Tele 77mm f/2.8']
    },
    action: {
      makes: ['GoPro', 'Insta360', 'DJI'],
      modelsByMake: {
        GoPro: ['HERO 12 Black', 'HERO 11', 'HERO 10'],
        Insta360: ['X3', 'ONE R', 'GO 3'],
        DJI: ['Osmo Action 4', 'Osmo Action 3']
      },
      lenses: ['UltraWide', 'Wide']
    },
    drone: {
      makes: ['DJI', 'Autel', 'Parrot'],
      modelsByMake: {
        DJI: ['Mavic 3', 'Air 2S', 'Mini 3 Pro'],
        Autel: ['EVO Lite+', 'EVO II'],
        Parrot: ['Anafi']
      },
      lenses: ['24mm f/2.8', '22mm f/2.8']
    },
    scanner: {
      makes: ['Epson', 'Canon', 'Plustek'],
      modelsByMake: {
        Epson: ['Perfection V600', 'Perfection V850'],
        Canon: ['CanoScan 9000F', 'LiDE 400'],
        Plustek: ['OpticFilm 8200i', 'ePhoto Z300']
      },
      lenses: ['CCD', 'CIS']
    }
  }

  const SOFTWARE_PRESETS = ['Adobe Photoshop', 'Adobe Lightroom', 'Affinity Photo', 'GIMP', 'Capture One', 'Luminar Neo', 'Darktable', 'DxO PhotoLab', 'PhotoUnikalizer by YALOKGAR']
  const SERIAL_PRESETS = ['SN-001', 'SN-002', 'SN-AF21', 'SN-X9Z7', 'SN-77AA', 'SN-2024', 'SN-ULTRA', 'SN-PRO', 'SN-PRIME', 'SN-ELITE', 'SN-ALPHA', 'SN-OMEGA', 'SN-GOLD', 'SN-ZETA', 'SN-GAMMA']
  const ISO_PRESETS = [50, 64, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6400]
  const EXPOSURE_TIMES = ['1/8000', '1/4000', '1/2000', '1/1000', '1/500', '1/250', '1/200', '1/160', '1/125', '1/80', '1/60', '1/30', '1/15', '1/8', '1/4', '1/2', '1', '2', '5', '10']
  const FNUMBERS = [1.2, 1.4, 1.8, 2, 2.2, 2.8, 3.5, 4, 5.6, 8, 11, 16, 22]
  const FOCALS = [12, 14, 16, 18, 20, 24, 28, 30, 35, 40, 50, 55, 70, 85, 105, 135, 200, 300]
  const EXPOSURE_PROGRAMS = [
    { v: 1, label: 'Ручной' },
    { v: 2, label: 'Программа' },
    { v: 3, label: 'Приоритет диафрагмы' },
    { v: 4, label: 'Приоритет выдержки' },
    { v: 5, label: 'Творческий' },
    { v: 6, label: 'Действие' },
    { v: 7, label: 'Портрет' },
    { v: 8, label: 'Пейзаж' }
  ]
  const METERING_MODES = [
    { v: 0, label: 'Не задано' },
    { v: 1, label: 'Средний' },
    { v: 2, label: 'Центровзвешенный' },
    { v: 3, label: 'Точечный' },
    { v: 4, label: 'Мульти‑точечный' },
    { v: 5, label: 'Матрица' },
    { v: 6, label: 'Частичный' },
    { v: 255, label: 'Другое' }
  ]
  const FLASH_MODES = [
    { v: 0, label: 'Нет вспышки' },
    { v: 1, label: 'Сработала' },
    { v: 5, label: 'Сработала (без возврата)' },
    { v: 7, label: 'Сработала (возврат)' },
    { v: 9, label: 'Сработала (принудительно)' },
    { v: 16, label: 'Выключена' }
  ]
  const WHITE_BALANCES = [
    { v: 0, label: 'Авто' },
    { v: 1, label: 'Ручной' }
  ]
  const COLOR_SPACES = ['sRGB', 'AdobeRGB', 'Display P3', 'ProPhoto RGB']
  const RATINGS = [0, 1, 2, 3, 4, 5]
  const LABELS = ['red', 'yellow', 'green', 'blue', 'purple', 'approved', 'rejected', 'personal']
  const TITLES = ['Sample', 'Portfolio', 'Preview', 'Draft', 'Final', 'Promo', 'Test', 'Wallpapers']
  const LOCATION_PRESETS = [
    { id: 'none', label: '— Без пресета —' },
    { id: 'kyiv', label: 'Киев, Украина', lat: 50.4501, lon: 30.5234, alt: 179, city: 'Kyiv', state: 'Kyiv', country: 'Ukraine' },
    { id: 'lviv', label: 'Львов, Украина', lat: 49.8397, lon: 24.0297, alt: 296, city: 'Lviv', state: 'Lviv', country: 'Ukraine' },
    { id: 'warsaw', label: 'Варшава, Польша', lat: 52.2297, lon: 21.0122, alt: 100, city: 'Warsaw', state: 'Mazovia', country: 'Poland' },
    { id: 'berlin', label: 'Берлин, Германия', lat: 52.52, lon: 13.405, alt: 34, city: 'Berlin', state: 'Berlin', country: 'Germany' },
    { id: 'london', label: 'Лондон, Великобритания', lat: 51.5074, lon: -0.1278, alt: 35, city: 'London', state: 'England', country: 'United Kingdom' },
    { id: 'paris', label: 'Париж, Франция', lat: 48.8566, lon: 2.3522, alt: 35, city: 'Paris', state: 'Île‑de‑France', country: 'France' },
    { id: 'newyork', label: 'Нью‑Йорк, США', lat: 40.7128, lon: -74.006, alt: 10, city: 'New York', state: 'NY', country: 'USA' },
    { id: 'la', label: 'Лос‑Анджелес, США', lat: 34.0522, lon: -118.2437, alt: 71, city: 'Los Angeles', state: 'CA', country: 'USA' },
    { id: 'tokyo', label: 'Токио, Япония', lat: 35.6762, lon: 139.6503, alt: 40, city: 'Tokyo', state: 'Tokyo', country: 'Japan' },
    { id: 'sydney', label: 'Сидней, Австралия', lat: -33.8688, lon: 151.2093, alt: 58, city: 'Sydney', state: 'NSW', country: 'Australia' }
  ]

  const currentGear = GEAR_PRESETS[fakeProfile]
  const makeOptions = currentGear?.makes || []
  const modelOptions = (currentGear?.modelsByMake?.[fakeMake]) || []
  const lensOptions = (currentGear?.lensesByMake?.[fakeMake]) || currentGear?.lenses || []

  useEffect(() => {
    const p = GEAR_PRESETS[fakeProfile]
    if (!p) return
    const mk = p.makes[0] || ''
    setFakeMake(mk)
    const md = (p.modelsByMake?.[mk] || [])[0] || ''
    setFakeModel(md)
    const ln = (p.lensesByMake?.[mk] || p.lenses || [])[0] || ''
    setFakeLens(ln)
  }, [fakeProfile])

  useEffect(() => {
    const p = GEAR_PRESETS[fakeProfile]
    if (!p) return
    const md = (p.modelsByMake?.[fakeMake] || [])[0] || ''
    setFakeModel(md)
    const ln = (p.lensesByMake?.[fakeMake] || p.lenses || [])[0] || ''
    setFakeLens(ln)
  }, [fakeMake])

  useEffect(() => {
    if (locationPreset === 'none') return
    const loc = LOCATION_PRESETS.find(l => l.id === locationPreset)
    if (!loc) return
    setFakeGps(true)
    setFakeLat(String(loc.lat))
    setFakeLon(String(loc.lon))
    setFakeAltitude(loc.alt ? String(loc.alt) : '')
    setFakeCity(loc.city || '')
    setFakeState(loc.state || '')
    setFakeCountry(loc.country || '')
  }, [locationPreset])

  useEffect(() => {
    const off = window.api.onProgress(d => {
      setProgress({ current: d.index + 1, total: d.total, lastFile: d.file, etaMs: Number(d.etaMs||0), speedBps: Number(d.speedBps||0) })
      if (d && d.status === 'ok' && d.outPath) setResults(prev => [...prev, { src: d.file, out: d.outPath }])
    })
    const done = window.api.onComplete(() => {
      setBusy(false)
      setActiveTab('ready')
    })
    return () => {
      off()
      done()
    }
  }, [])

  useEffect(() => {
    const offAvail = window.api.onUpdateAvailable(info => {
      setUpd({ available: true, info, downloading: false, percent: 0, error: null, downloaded: false, notes: '' })
      window.api.getUpdateChangelog().then(r => {
        const notes = (r && r.ok && r.notes) ? r.notes : ''
        setUpd(prev => ({ ...prev, notes }))
      }).catch(()=>{})
    })
    const offNA = window.api.onUpdateNotAvailable(() => setUpd(prev => ({ ...prev, available: false })))
    const offErr = window.api.onUpdateError(err => setUpd(prev => ({ ...prev, error: String(err) })))
    const offProg = window.api.onUpdateProgress(p => {
      setNetLost(false)
      setUpd(prev => ({ ...prev, downloading: true, percent: p.percent || 0 }))
    })
    const offDl = window.api.onUpdateDownloaded(info => setUpd(prev => ({ ...prev, downloaded: true, downloading: false, percent: 100, info })))
    window.api.checkForUpdates().catch(()=>{})
    return () => {
      offAvail()
      offNA()
      offErr()
      offProg()
      offDl()
    }
  }, [])

  useEffect(() => {
    let tm
    function onOffline() {
      setNetLost(true)
    }
    function onOnline() {
      setNetLost(false)
    }
    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)
    return () => {
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
      if (tm) clearTimeout(tm)
    }
  }, [])

  useEffect(() => {
    const g = window.api?.native?.gpu
    if (!g) return
    g.init()
    const s = !!g.isSupported()
    setGpuSupported(s)
    const e = !!g.isEnabled()
    const final = s && e
    if (e !== final) g.setEnabled(final)
    setGpuEnabled(final)
    try { setGpuName(String(g.adapterName() || '')) } catch (_) {}
    return () => { try { g.shutdown() } catch (_) {} }
  }, [])

  const handleAdd = async () => {
    const paths = await window.api.selectImages()
    if (!paths || !paths.length) return
    setFiles(prev => Array.from(new Set([...prev, ...paths])))
  }

  const handleOutput = async () => {
    const dir = await window.api.selectOutputDir()
    if (dir) setOutputDir(dir)
  }

  const handleClear = () => {
    setFiles([])
    setProgress({ current: 0, total: 0, lastFile: '' })
  }

  const canStart = useMemo(() => files.length > 0 && outputDir && !busy, [files, outputDir, busy])
  const canCancel = useMemo(() => busy, [busy])

  useEffect(() => {
    if (profile === 'soft') {
      setQuality(90)
      setColorDrift(1)
      setResizeDrift(1)
    } else if (profile === 'strong') {
      setQuality(80)
      setColorDrift(3)
      setResizeDrift(3)
    }
  }, [profile])

  const dedupeByContent = async (paths) => {
    const nat = window.api?.native
    if (!nat || typeof nat.computeFileHash !== 'function') return Array.from(new Set(paths))
    const limit = Math.min(8, Math.max(1, (navigator.hardwareConcurrency || 4)))
    const seen = new Set()
    const unique = []
    let idx = 0
    const workers = new Array(limit).fill(0).map(async () => {
      while (true) {
        const i = idx
        idx += 1
        if (i >= paths.length) break
        const p = paths[i]
        let h = await nat.computeFileHash(p)
        if (typeof h === 'number') h = String(h)
        const key = h ? ('hash:' + h) : ('path:' + p)
        if (!seen.has(key)) {
          seen.add(key)
          unique.push(p)
        }
      }
    })
    await Promise.all(workers)
    return unique
  }

  const start = async () => {
    if (!canStart) return
    setBusy(true)
    const inputFiles = await dedupeByContent(files)
    setFiles(inputFiles)
    setProgress({ current: 0, total: inputFiles.length, lastFile: '', etaMs: 0, speedBps: 0 })
    setResults([])
    const payload = {
      inputFiles,
      outputDir,
      format,
      quality: Number(quality),
      colorDrift: Number(colorDrift),
      resizeDrift: Number(resizeDrift),
      naming,
      meta: {
        author,
        description,
        copyright,
        keywords: keywords.split(',').map(s => s.trim()).filter(Boolean),
        contactName,
        contactEmail,
        website,
        owner,
        creatorTool,
        removeGps,
        dateStrategy,
        dateOffsetMinutes: Number(dateOffsetMinutes),
        uniqueId,
        removeAll: removeAllMeta,
        softwareTag: true,
        fake: fakeMeta,
        fakePerFile,
        fakeAuto,
        fakeProfile,
        onlineAuto,
        fakeMake,
        fakeModel,
        fakeLens,
        fakeSoftware,
        fakeSerial,
        fakeGps,
        fakeLat: fakeLat === '' ? null : Number(fakeLat),
        fakeLon: fakeLon === '' ? null : Number(fakeLon),
        fakeAltitude: fakeAltitude === '' ? null : Number(fakeAltitude),
        fakeIso: fakeIso === '' ? null : Number(fakeIso),
        fakeExposureTime: fakeExposureTime || null,
        fakeFNumber: fakeFNumber === '' ? null : Number(fakeFNumber),
        fakeFocalLength: fakeFocalLength === '' ? null : Number(fakeFocalLength),
        fakeExposureProgram: fakeExposureProgram === '' ? null : Number(fakeExposureProgram),
        fakeMeteringMode: fakeMeteringMode === '' ? null : Number(fakeMeteringMode),
        fakeFlash: fakeFlash === '' ? null : Number(fakeFlash),
        fakeWhiteBalance: fakeWhiteBalance === '' ? null : Number(fakeWhiteBalance),
        fakeColorSpace: fakeColorSpace || null,
        fakeRating: fakeRating === '' ? null : Number(fakeRating),
        fakeLabel: fakeLabel || null,
        fakeTitle: fakeTitle || null,
        fakeCity: fakeCity || null,
        fakeState: fakeState || null,
        fakeCountry: fakeCountry || null
      }
    }
    await window.api.processImages(payload)
  }

  const cancel = async () => {
    if (!canCancel) return
    await window.api.cancel()
  }

  const addFolder = async () => {
    const paths = await window.api.selectImageDir()
    if (!paths || !paths.length) return
    setFiles(prev => Array.from(new Set([...prev, ...paths])))
  }

  const onDrop = async e => {
    e.preventDefault()
    const items = Array.from(e.dataTransfer.files || [])
    if (!items.length) return
    const paths = items.map(f => f.path)
    const expanded = await window.api.expandPaths(paths)
    if (expanded && expanded.length) setFiles(prev => Array.from(new Set([...prev, ...expanded])))
  }

  const onDragOver = e => {
    e.preventDefault()
  }

  const downloadUpdate = async () => {
    if (!upd.available || upd.downloading) return
    setUpd(prev => ({ ...prev, downloading: true, error: null }))
    const r = await window.api.downloadUpdate()
    if (!r || !r.ok) setUpd(prev => ({ ...prev, error: (r && r.error) || 'Ошибка загрузки' }))
  }

  const installUpdate = async () => {
    if (!upd.downloaded) return
    await window.api.quitAndInstall()
  }

  const fillMyData = () => {
    setAuthor('YALOKGAR')
    setContactName('YALOKGAR')
    setContactEmail('yalokgar@gmail.com')
    setWebsite('https://github.com/YALOKGARua')
    setOwner('YALOKGAR')
    setCreatorTool('PhotoUnikalizer by YALOKGAR')
    setCopyright('© YALOKGAR')
    setKeywords('YALOKGAR, YALOKGARua, PhotoUnikalizer')
  }

  const chooseTxtFile = async () => {
    const r = await window.api.selectTextFile()
    if (!r || !r.ok) return
    setTxtPath(r.path || '')
    setTxtContent(r.content || '')
    setActiveTab('converter')
  }

  const parseTxt = () => {
    try {
      setParseError('')
      const text = txtContent || ''
      const segments = []
      let start = -1
      let depth = 0
      for (let i = 0; i < text.length; i += 1) {
        const ch = text[i]
        if (ch === '[') {
          if (depth === 0) start = i
          depth += 1
        } else if (ch === ']') {
          depth -= 1
          if (depth === 0 && start !== -1) {
            segments.push({ start, end: i + 1 })
            start = -1
          }
        }
      }
      const out = []
      let ok = 0
      let errors = 0
      const processSegment = (seg) => {
        let cookies
        let head = ''
        let jsonStr = ''
        if (seg) {
          jsonStr = text.slice(seg.start, seg.end)
          const lineStart = text.lastIndexOf('\n', seg.start - 1) + 1
          head = text.slice(lineStart, seg.start).trim()
        } else {
          jsonStr = text.trim()
        }
        try {
          cookies = JSON.parse(jsonStr)
        } catch (_) {
          errors += 1
          return
        }
        const parts = head ? head.split(' | ').map(s => s.trim()) : []
        const url = parts[0] || ''
        const login = parts[1] || ''
        const password = parts[2] || ''
        const firstName = parts[3] || ''
        const lastName = parts[4] || ''
        const birthday = parts[5] || ''
        const cUser = Array.isArray(cookies) ? cookies.find(c => c && c.name === 'c_user') : null
        const idMatch = url.match(/id=(\d+)/)
        const profileId = (idMatch && idMatch[1]) || (cUser && String(cUser.value)) || ''
        const important = new Set(['c_user', 'xs', 'datr'])
        const cookiesMarked = Array.isArray(cookies) ? cookies.map(c => ({ ...c, important: important.has(c.name) })) : []
        out.push({ profileId, url, account: { login, password, firstName, lastName, birthday }, cookies: cookiesMarked })
        ok += 1
      }
      if (segments.length) {
        segments.forEach(processSegment)
      } else if (text.trim()) {
        processSegment(null)
      }
      const filtered = out.filter(it => it && (it.profileId || it.url || (Array.isArray(it.cookies) && it.cookies.length)))
      filtered.sort((a, b) => {
        const al = (a.profileId || '').length
        const bl = (b.profileId || '').length
        if (al !== bl) return al - bl
        return (a.profileId || '').localeCompare(b.profileId || '')
      })
      const totalLines = (txtContent || '').split(/\r?\n/).filter(l => l.trim()).length
      setParseInfo({ lines: totalLines, ok: filtered.length, errors })
      setProfiles(filtered)
      setSelectedProfiles(new Set(filtered.map((_, i) => i)))
      setJsonPreview(JSON.stringify(filtered, null, 2))
    } catch (e) {
      setParseError(String(e))
    }
  }

  const saveJson = async () => {
    if (!jsonPreview) return
    const def = txtPath ? txtPath.replace(/\.[^.]+$/, '.json') : 'data.json'
    await window.api.saveJson({ data: jsonPreview, defaultPath: def })
  }

  const saveJsonPerProfile = async () => {
    const list = Array.from(selectedProfiles)
      .sort((a, b) => a - b)
      .map(i => {
        const p = profiles[i]
        const name = (p && p.profileId ? `profile_${p.profileId}.json` : `profile_${i + 1}.json`)
        return { name, data: JSON.stringify(p, null, 2) }
      })
    if (!list.length) return
    await window.api.saveJsonBatch({ items: list })
  }

  const saveCookiesJson = async () => {
    if (!profiles.length) return
    const items = Array.from(selectedProfiles).sort((a, b) => a - b).map(i => {
      const p = profiles[i]
      return { profileId: p.profileId || String(i + 1), cookies: p.cookies || [] }
    })
    const data = JSON.stringify(items, null, 2)
    const def = txtPath ? txtPath.replace(/\.[^.]+$/, '.cookies.json') : 'cookies.json'
    await window.api.saveJson({ data, defaultPath: def })
  }

  const saveCookiesPerProfile = async () => {
    const list = Array.from(selectedProfiles)
      .sort((a, b) => a - b)
      .map(i => {
        const p = profiles[i]
        const name = (p && p.profileId ? `cookies_${p.profileId}.json` : `cookies_${i + 1}.json`)
        return { name, data: JSON.stringify((p && p.cookies) || [], null, 2) }
      })
    if (!list.length) return
    await window.api.saveJsonBatch({ items: list })
  }

  return (
    <div className="h-full text-slate-100">
      <header className="px-6 py-4 flex items-center justify-between">
        <div className="text-2xl font-semibold tracking-tight">PhotoUnikalizer</div>
        <div className="flex items-center gap-3">
          <div className="text-xs neon">by YALOKGAR</div>
          <button onClick={async()=>{
            try {
              if (!currentNotes) {
                const r = await window.api.getUpdateChangelog().catch(()=>({ok:false}))
                const notes = (r && r.ok && r.notes) ? r.notes : 'Нет заметок'
                setCurrentNotes(notes)
              }
              setCurrentNotesOpen(v=>!v)
            } catch (_) {
              setCurrentNotesOpen(v=>!v)
            }
          }} className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs">Что нового в текущей версии</button>
        </div>
      </header>

      {currentNotesOpen && (
        <div className="mx-6 mb-4 p-3 rounded bg-slate-900/60 border border-white/10 text-slate-200">
          <div className="flex items-start justify-between gap-3">
            <div className="text-sm">Что нового</div>
            <button onClick={()=>setCurrentNotesOpen(false)} className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs">Закрыть</button>
          </div>
          <div className="mt-2 text-[11px] whitespace-pre-wrap max-h-56 overflow-auto opacity-90">
            {currentNotes || 'Нет заметок'}
          </div>
        </div>
      )}

      {upd.available && (
        <div className="mx-6 mb-4 p-3 rounded bg-amber-900/40 border border-amber-600/40 text-amber-200">
          <div className="flex items-start justify-between gap-3">
            <div className="text-sm">Доступно обновление {upd.info && upd.info.version ? `v${upd.info.version}` : ''}</div>
            <div className="flex gap-2">
              {!upd.downloading && !upd.downloaded && (
                <button onClick={downloadUpdate} className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-xs">Скачать</button>
              )}
              {upd.downloaded && (
                <button onClick={installUpdate} className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-xs">Установить</button>
              )}
              <button onClick={()=>setShowNotes(v=>!v)} className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs">{showNotes ? 'Скрыть' : 'Что нового?'}</button>
            </div>
          </div>
          {!!upd.notes && showNotes && (
            <div className="mt-2 text-[11px] whitespace-pre-wrap max-h-48 overflow-auto border-t border-amber-600/20 pt-2 opacity-90">
              {upd.notes}
            </div>
          )}
          {upd.downloading && !upd.downloaded && (
            <div className="w-full flex items-center gap-3 mt-2">
              <div className="text-xs whitespace-nowrap">Скачивание… {Math.round(upd.percent)}%</div>
              <div className="flex-1 h-2 bg-black/30 rounded overflow-hidden">
                <div className="h-2 bg-amber-500" style={{ width: `${Math.max(0, Math.min(100, Math.round(upd.percent)))}%` }} />
              </div>
            </div>
          )}
          {upd.error && <div className="text-xs opacity-80 mt-2">{upd.error}</div>}
        </div>
      )}

      <main className="px-6 pb-6 grid grid-cols-12 gap-6" onDrop={onDrop} onDragOver={onDragOver}>
        <section className="col-span-4 glass rounded-xl p-5 border border-white/10">
          <div className="text-sm font-semibold mb-4">Вывод</div>
          <div className="flex gap-2">
            <button onClick={handleOutput} className="px-3 py-2 rounded bg-brand-600 hover:bg-brand-500 text-white">Выбрать папку</button>
            <div className="text-xs truncate opacity-80 self-center max-w-[260px]" title={outputDir}>{outputDir || 'Не выбрана'}</div>
            {!!outputDir && <button onClick={()=>window.api.openPath(outputDir)} className="px-2 py-2 rounded bg-slate-800 hover:bg-slate-700 text-xs">Открыть</button>}
          </div>

          <div className="h-px bg-white/10 my-5" />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs mb-1">Профиль</div>
              <select className="w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={profile} onChange={e => setProfile(e.target.value)}>
                <option value="custom">Свои настройки</option>
                <option value="soft">Мягкая уникализация</option>
                <option value="strong">Сильная уникализация</option>
              </select>
            </div>
            <div>
              <div className="text-xs mb-1">Формат</div>
              <select className="w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={format} onChange={e => setFormat(e.target.value)}>
                <option value="jpg">JPG</option>
                <option value="png">PNG</option>
                <option value="webp">WEBP</option>
                <option value="avif">AVIF</option>
              </select>
            </div>
            <div>
              <div className="text-xs mb-1">Качество</div>
              <select className="w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={quality} onChange={e => setQuality(Number(e.target.value))}>
                <option value={70}>70</option>
                <option value={75}>75</option>
                <option value={80}>80</option>
                <option value={85}>85</option>
                <option value={90}>90</option>
                <option value={95}>95</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div>
              <div className="text-xs mb-1">Цветовой дрейф %</div>
              <select className="w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={colorDrift} onChange={e => setColorDrift(Number(e.target.value))}>
                <option value={0}>0</option>
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5</option>
              </select>
            </div>
            <div>
              <div className="text-xs mb-1">Размерный дрейф %</div>
              <select className="w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={resizeDrift} onChange={e => setResizeDrift(Number(e.target.value))}>
                <option value={0}>0</option>
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5</option>
              </select>
            </div>
            <div className="col-span-2">
              <div className="text-xs mb-1">Схема имени</div>
              <input className="w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={naming} onChange={e => setNaming(e.target.value)} />
              <div className="text-[10px] opacity-60 mt-1">Токены: {'{name}'} {'{index}'} {'{ext}'} {'{date}'} {'{uuid}'} {'{rand}'}</div>
            </div>

            <div className="col-span-2 h-px bg-white/10 my-5" />

            <div className="col-span-2 flex items-center justify-between">
              <div className="text-xs">GPU ускорение (тестируется)</div>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" disabled={!gpuSupported} checked={gpuEnabled && gpuSupported} onChange={e => {
                  const g = window.api?.native?.gpu
                  if (!g) return
                  const next = !!e.target.checked
                  g.setEnabled(next)
                  setGpuEnabled(next)
                }} />
                <span className="opacity-70">{gpuSupported ? (gpuEnabled ? `Включено • ${gpuName||'GPU'}` : 'Выключено') : 'Недоступно'}</span>
              </label>
            </div>

            <div className="col-span-2">
              <div className="text-sm font-semibold mb-3">Метаданные</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <div className="text-xs mb-1">Автор</div>
                  <input className="w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={author} onChange={e => setAuthor(e.target.value)} />
                </div>
                <div className="col-span-2 flex items-center justify-between">
                  <div className="text-xs opacity-80">Мои данные</div>
                  <button onClick={fillMyData} className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs">Заполнить</button>
                </div>
                <div>
                  <div className="text-xs mb-1">Контактное имя</div>
                  <input className="w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={contactName} onChange={e => setContactName(e.target.value)} />
                </div>
                <div>
                  <div className="text-xs mb-1">Email</div>
                  <input className="w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
                </div>
                <div>
                  <div className="text-xs mb-1">Сайт/URL</div>
                  <input className="w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={website} onChange={e => setWebsite(e.target.value)} />
                </div>
                <div>
                  <div className="text-xs mb-1">Владелец</div>
                  <input className="w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={owner} onChange={e => setOwner(e.target.value)} />
                </div>
                <div className="col-span-2">
                  <div className="text-xs mb-1">Инструмент/ПО</div>
                  <input className="w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={creatorTool} onChange={e => setCreatorTool(e.target.value)} />
                </div>
                <div className="col-span-2">
                  <div className="text-xs mb-1">Описание</div>
                  <input className="w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={description} onChange={e => setDescription(e.target.value)} />
                </div>
                <div className="col-span-2">
                  <div className="text-xs mb-1">Права</div>
                  <input className="w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={copyright} onChange={e => setCopyright(e.target.value)} />
                </div>
                <div className="col-span-2">
                  <div className="text-xs mb-1">Ключевые слова</div>
                  <input placeholder="через запятую" className="w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={keywords} onChange={e => setKeywords(e.target.value)} />
                </div>
                <div>
                  <div className="text-xs mb-1">Даты</div>
                  <select className="w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={dateStrategy} onChange={e => setDateStrategy(e.target.value)}>
                    <option value="keep">Оставить</option>
                    <option value="now">Текущее время</option>
                    <option value="offset">Смещение</option>
                  </select>
                </div>
                <div>
                  <div className="text-xs mb-1">Смещение, мин</div>
                  <input type="number" className="w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={dateOffsetMinutes} onChange={e => setDateOffsetMinutes(e.target.value)} />
                </div>
                <div className="col-span-2 flex items-center gap-4 mt-2">
                  <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={removeGps} onChange={e => setRemoveGps(e.target.checked)} /> Убрать GPS</label>
                  <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={uniqueId} onChange={e => setUniqueId(e.target.checked)} /> Уникальный ID</label>
                  <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={removeAllMeta} onChange={e => setRemoveAllMeta(e.target.checked)} /> Удалить все метаданные</label>
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-white/10 my-5" />

          <div className="text-sm font-semibold mb-3">Фейковые метаданные</div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 flex items-center justify-end">
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={fakeMeta} onChange={e => setFakeMeta(e.target.checked)} /> Включить</label>
            </div>

            {!renderFakeBelow && (
            <div className="col-span-2 grid grid-cols-3 gap-4 p-3 rounded bg-slate-900/40 border border-white/5">
              <div>
                <div className="text-[10px] opacity-60 mb-1">Кто</div>
                <div className="text-xs">Автор: <span className="opacity-80">{author || '—'}</span></div>
                <div className="text-xs">Владелец: <span className="opacity-80">{owner || '—'}</span></div>
                <div className="text-xs">Email: <span className="opacity-80">{contactEmail || '—'}</span></div>
              </div>
              <div>
                <div className="text-[10px] opacity-60 mb-1">Аппарат</div>
                <div className="text-xs">{fakeMake || 'Производитель'} • {fakeModel || 'Модель'}</div>
                <div className="text-xs">{fakeLens || 'Объектив'}</div>
                <div className="text-[10px] opacity-60 mt-1">Профиль: {fakeProfile}</div>
              </div>
              <div>
                <div className="text-[10px] opacity-60 mb-1">Контакты</div>
                <div className="text-xs">Сайт: <span className="opacity-80">{website || '—'}</span></div>
                <div className="text-xs">ПО: <span className="opacity-80">{fakeSoftware || creatorTool || '—'}</span></div>
              </div>
            </div>
            )}

            <div className="grid grid-cols-2 gap-4 col-span-2">
              <label className="text-xs">Производитель
                <select className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeMake} onChange={e => setFakeMake(e.target.value)} disabled={!fakeMeta}>
                  {makeOptions.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <label className="text-xs">Модель
                <select className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeModel} onChange={e => setFakeModel(e.target.value)} disabled={!fakeMeta}>
                  {modelOptions.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <label className="text-xs">Объектив
                <select className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeLens} onChange={e => setFakeLens(e.target.value)} disabled={!fakeMeta}>
                  {lensOptions.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <label className="text-xs">ПО
                <select className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeSoftware} onChange={e => setFakeSoftware(e.target.value)} disabled={!fakeMeta}>
                  {SOFTWARE_PRESETS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <label className="text-xs">Серийный номер
                <select className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeSerial} onChange={e => setFakeSerial(e.target.value)} disabled={!fakeMeta}>
                  {SERIAL_PRESETS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <div className="col-span-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={fakePerFile} onChange={e => setFakePerFile(e.target.checked)} disabled={!fakeMeta} /> Уникально на файл</label>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={fakeGps} onChange={e => setFakeGps(e.target.checked)} disabled={!fakeMeta} /> Подменить GPS</label>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={fakeAuto} onChange={e => setFakeAuto(e.target.checked)} disabled={!fakeMeta} /> Автозаполнение</label>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={onlineAuto} onChange={e => setOnlineAuto(e.target.checked)} disabled={!fakeMeta} /> Подтянуть из интернета</label>
              </div>
              <label className="text-xs">Профиль
                <select className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeProfile} onChange={e => setFakeProfile(e.target.value)} disabled={!fakeMeta}>
                  <option value="camera">Камера</option>
                  <option value="phone">Смартфон</option>
                  <option value="action">Экшн‑камера</option>
                  <option value="drone">Дрон</option>
                  <option value="scanner">Сканер</option>
                </select>
              </label>
              <label className="text-xs">Локация
                <select className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={locationPreset} onChange={e => setLocationPreset(e.target.value)} disabled={!fakeMeta}>
                  {LOCATION_PRESETS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>
              </label>
              <div />
              <label className="text-xs">Широта
                <input type="number" step="0.000001" className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeLat} onChange={e => setFakeLat(e.target.value)} placeholder="оставь пусто для случайного" disabled={!fakeMeta || !fakeGps} />
              </label>
              <label className="text-xs">Долгота
                <input type="number" step="0.000001" className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeLon} onChange={e => setFakeLon(e.target.value)} placeholder="оставь пусто для случайного" disabled={!fakeMeta || !fakeGps} />
              </label>
              <label className="text-xs">Высота
                <input type="number" step="1" className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeAltitude} onChange={e => setFakeAltitude(e.target.value)} placeholder="м" disabled={!fakeMeta || !fakeGps} />
              </label>
              <label className="text-xs">ISO
                <select className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeIso} onChange={e => setFakeIso(e.target.value)} disabled={!fakeMeta}>
                  <option value="">—</option>
                  {ISO_PRESETS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <label className="text-xs">Выдержка
                <select className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeExposureTime} onChange={e => setFakeExposureTime(e.target.value)} disabled={!fakeMeta}>
                  <option value="">—</option>
                  {EXPOSURE_TIMES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <label className="text-xs">Диафрагма (f/)
                <select className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeFNumber} onChange={e => setFakeFNumber(e.target.value)} disabled={!fakeMeta}>
                  <option value="">—</option>
                  {FNUMBERS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <label className="text-xs">Фокусное (мм)
                <select className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeFocalLength} onChange={e => setFakeFocalLength(e.target.value)} disabled={!fakeMeta}>
                  <option value="">—</option>
                  {FOCALS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <label className="text-xs">Программа экспозиции
                <select className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeExposureProgram} onChange={e => setFakeExposureProgram(e.target.value)} disabled={!fakeMeta}>
                  <option value="">—</option>
                  {EXPOSURE_PROGRAMS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
                </select>
              </label>
              <label className="text-xs">Замер экспозиции
                <select className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeMeteringMode} onChange={e => setFakeMeteringMode(e.target.value)} disabled={!fakeMeta}>
                  <option value="">—</option>
                  {METERING_MODES.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
                </select>
              </label>
              <label className="text-xs">Вспышка
                <select className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeFlash} onChange={e => setFakeFlash(e.target.value)} disabled={!fakeMeta}>
                  <option value="">—</option>
                  {FLASH_MODES.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
                </select>
              </label>
              <label className="text-xs">Баланс белого
                <select className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeWhiteBalance} onChange={e => setFakeWhiteBalance(e.target.value)} disabled={!fakeMeta}>
                  <option value="">—</option>
                  {WHITE_BALANCES.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
                </select>
              </label>
              <label className="text-xs">Цветовое пространство
                <select className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeColorSpace} onChange={e => setFakeColorSpace(e.target.value)} disabled={!fakeMeta}>
                  <option value="">—</option>
                  {COLOR_SPACES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <label className="text-xs">Рейтинг
                <select className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeRating} onChange={e => setFakeRating(e.target.value)} disabled={!fakeMeta}>
                  <option value="">—</option>
                  {RATINGS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <label className="text-xs">Метка
                <select className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeLabel} onChange={e => setFakeLabel(e.target.value)} disabled={!fakeMeta}>
                  <option value="">—</option>
                  {LABELS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <label className="text-xs">Заголовок
                <input className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeTitle} onChange={e => setFakeTitle(e.target.value)} disabled={!fakeMeta} />
              </label>
              <label className="text-xs">Город
                <input className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeCity} onChange={e => setFakeCity(e.target.value)} disabled={!fakeMeta} />
              </label>
              <label className="text-xs">Регион
                <input className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeState} onChange={e => setFakeState(e.target.value)} disabled={!fakeMeta} />
              </label>
              <label className="text-xs">Страна
                <input className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeCountry} onChange={e => setFakeCountry(e.target.value)} disabled={!fakeMeta} />
              </label>
            </div>
          </div>
        </section>

        <section className="col-span-8 glass rounded-xl p-5 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button className={`text-sm ${activeTab==='files' ? 'font-semibold text-white' : 'opacity-70 hover:opacity-100'}`} onClick={()=>setActiveTab('files')}>Файлы</button>
              <button className={`text-sm ${activeTab==='ready' ? 'font-semibold text-white' : 'opacity-70 hover:opacity-100'}`} onClick={()=>setActiveTab('ready')}>Готовое</button>
              <button className={`text-sm ${activeTab==='converter' ? 'font-semibold text-white' : 'opacity-70 hover:opacity-100'}`} onClick={()=>setActiveTab('converter')}>Конвертер TXT→JSON</button>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAdd} className="px-3 py-2 rounded bg-brand-600 hover:bg-brand-500">Добавить файлы</button>
              <button onClick={addFolder} className="px-3 py-2 rounded bg-brand-700 hover:bg-brand-600">Добавить папку</button>
              <button onClick={handleClear} className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700">Очистить</button>
              {!busy && <button disabled={!canStart} onClick={start} className={`px-3 py-2 rounded ${canStart ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-900 opacity-50 cursor-not-allowed'}`}>Старт</button>}
              {busy && <button onClick={cancel} className="px-3 py-2 rounded bg-rose-600 hover:bg-rose-500">Отмена</button>}
            </div>
          </div>

          {activeTab === 'files' && (
            <>
              <div className="grid grid-cols-3 gap-3 max-h-[520px] overflow-auto pr-2">
                {files.map((p, i) => (
                  <div key={p + i} className="bg-slate-900/60 rounded-md overflow-hidden border border-white/5">
                    <div className="h-40 bg-slate-900 flex items-center justify-center overflow-hidden">
                      <img className="max-h-40" src={toFileUrl(p)} />
                    </div>
                    <div className="text-[10px] p-2 truncate opacity-80" title={p}>{p}</div>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <ProgressLine current={progress.current} total={progress.total} />
                <div className="text-xs opacity-80 mt-1">
                  {busy ? 'Обработка…' : 'Готово'} {progress.lastFile ? `• ${progress.lastFile}` : ''}
                  {busy && (
                    <>
                      {' '}• скорость {progress.speedBps ? `${(progress.speedBps/1024/1024).toFixed(2)} MB/s` : '—'}
                      {' '}• ETA {progress.etaMs ? `${Math.max(0, Math.floor(progress.etaMs/1000))}s` : '—'}
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'ready' && (
            <div className="grid grid-cols-3 gap-3 max-h-[600px] overflow-auto pr-2">
              {results.map((r, i) => (
                <div key={r.out + i} className="bg-slate-900/60 rounded-md overflow-hidden border border-white/5">
                  <div className="h-40 bg-slate-900 flex items-center justify-center overflow-hidden">
                    <img className="max-h-40" src={toFileUrl(r.out)} />
                  </div>
                  <div className="text-[10px] p-2 truncate opacity-80 flex items-center gap-2" title={r.out}>
                    <span className="flex-1 truncate">{r.out}</span>
                    <button className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700" onClick={() => window.api.showInFolder(r.out)}>Папка</button>
                  </div>
                </div>
              ))}
              {results.length === 0 && (
                <div className="opacity-60 text-xs">Здесь появятся готовые файлы после обработки</div>
              )}
            </div>
          )}

          {activeTab === 'converter' && (
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 flex items-center gap-2">
                <button onClick={chooseTxtFile} className="px-3 py-2 rounded bg-brand-600 hover:bg-brand-500">Выбрать TXT</button>
                {txtPath && <div className="text-xs opacity-80 truncate" title={txtPath}>{txtPath}</div>}
                <div className="ml-auto flex items-center gap-2">
                  <input placeholder="поиск по ID/имени" className="bg-slate-900 border border-white/10 rounded px-2 py-2 text-xs w-56" value={search} onChange={e=>setSearch(e.target.value)} />
                  <button onClick={parseTxt} className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500">Конвертировать</button>
                  <button onClick={saveJson} disabled={!jsonPreview} className={`px-3 py-2 rounded ${jsonPreview ? 'bg-sky-600 hover:bg-sky-500' : 'bg-slate-800 opacity-50 cursor-not-allowed'}`}>Сохранить общий JSON</button>
                  <button onClick={saveJsonPerProfile} disabled={!profiles.length} className={`px-3 py-2 rounded ${profiles.length ? 'bg-sky-700 hover:bg-sky-600' : 'bg-slate-800 opacity-50 cursor-not-allowed'}`}>Сохранить по профилям</button>
                  <button onClick={saveCookiesJson} disabled={!profiles.length} className={`px-3 py-2 rounded ${profiles.length ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-slate-800 opacity-50 cursor-not-allowed'}`}>Куки одним JSON</button>
                  <button onClick={saveCookiesPerProfile} disabled={!profiles.length} className={`px-3 py-2 rounded ${profiles.length ? 'bg-indigo-700 hover:bg-indigo-600' : 'bg-slate-800 opacity-50 cursor-not-allowed'}`}>Куки по профилям</button>
                </div>
              </div>
              <div className="col-span-4">
                <div className="text-xs mb-1">Профили</div>
                <div className="h-[460px] overflow-auto bg-slate-900 border border-white/10 rounded">
                  {profiles
                    .map((p, i) => ({ p, i }))
                    .filter(({p}) => {
                      if (!search.trim()) return true
                      const s = search.trim().toLowerCase()
                      return (p.profileId||'').toLowerCase().includes(s) || (p.account?.firstName||'').toLowerCase().includes(s) || (p.account?.lastName||'').toLowerCase().includes(s)
                    })
                    .map(({p, i}) => (
                    <label key={i} className="flex items-center gap-2 text-xs px-2 py-2 border-b border-white/5">
                      <input type="checkbox" checked={selectedProfiles.has(i)} onChange={e=>{
                        const next = new Set(selectedProfiles)
                        if (e.target.checked) next.add(i)
                        else next.delete(i)
                        setSelectedProfiles(next)
                        setJsonPreview(JSON.stringify(Array.from(next).sort((a,b)=>a-b).map(idx=>profiles[idx]), null, 2))
                      }} />
                      <span className="truncate">{p.profileId || '—'} • {p.account?.firstName || ''} {p.account?.lastName || ''}</span>
                    </label>
                  ))}
                  {!profiles.length && <div className="text-[11px] p-2 opacity-60">Загрузите TXT и нажмите Конвертировать</div>}
                </div>
                <div className="text-[11px] opacity-70 mt-2">Строк: {parseInfo.lines} • Профилей: {parseInfo.ok} • Ошибок: {parseInfo.errors} {parseError && `• ${parseError}`}</div>
              </div>
              <div className="col-span-4" onDrop={async e=>{
                e.preventDefault()
                const items = Array.from(e.dataTransfer.files || [])
                const txt = items.find(f=>String(f.path||'').toLowerCase().endsWith('.txt'))
                if (txt) {
                  try {
                    const r = await window.api.selectTextFile().catch(()=>({ok:false}))
                  } catch (_) {}
                }
              }} onDragOver={e=>e.preventDefault()}>
                <div className="text-xs mb-1">Исходный TXT</div>
                <textarea className="w-full h-[460px] bg-slate-900 border border-white/10 rounded p-2 text-xs" value={txtContent} onChange={e => setTxtContent(e.target.value)} />
              </div>
              <div className="col-span-4">
                <div className="text-xs mb-1">JSON предпросмотр</div>
                <textarea className="w-full h-[460px] bg-slate-900 border border-white/10 rounded p-2 text-xs" value={jsonPreview} onChange={e => setJsonPreview(e.target.value)} />
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}