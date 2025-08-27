import { useEffect, useMemo, useRef, useState } from 'react'
import indigoScript from '/indigo-script.js?raw'
import { useTranslation } from 'react-i18next'
import AuthGate from './components/AuthGate'
import Chat from './components/Chat'
import AdminPanel from './components/AdminPanel'
import { IconPlus, IconFolderOpen, IconFolder, IconPlay, IconStop, IconOpenExternal, IconEye, IconTrash, IconFile, IconDownload } from './components/Icons'

function toFileUrl(p) {
  let s = p.replace(/\\/g, '/')
  if (!s.startsWith('/')) s = '/' + s
  return encodeURI('file://' + s)
}

function sanitizeHtml(html) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(String(html || ''), 'text/html')
  doc.querySelectorAll('script,iframe,object,embed,link,style,meta,form,input,button,video,audio,img').forEach(el => el.remove())
  const all = doc.getElementsByTagName('*')
  for (let i = all.length - 1; i >= 0; i -= 1) {
    const el = all[i]
    Array.from(el.attributes).forEach(attr => {
      const n = attr.name.toLowerCase()
      const v = attr.value || ''
      if (n.startsWith('on') || n === 'style' || n === 'src' || n === 'srcdoc') el.removeAttribute(attr.name)
      if (n === 'href' && el.tagName.toLowerCase() === 'a') {
        const href = v.trim()
        if (!href || href.startsWith('javascript:')) el.removeAttribute('href')
        else { el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener noreferrer') }
      }
    })
  }
  return doc.body.innerHTML
}

function prepareNotesHtml(s) {
  const str = String(s || '')
  const isHtml = /<\s*[a-z][\s\S]*>/i.test(str)
  if (isHtml) return sanitizeHtml(str)
  const escaped = str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return escaped.replace(/\r?\n/g, '<br/>')
}

function markdownToHtml(md) {
  const input = String(md || '').replace(/\r\n/g, '\n')
  const blocks = []
  let s = input.replace(/```(\w+)?\n([\s\S]*?)```/g, (_m, _lang, code) => {
    const idx = blocks.length
    const escaped = String(code || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    blocks.push(`<pre class="not-prose"><code>${escaped}</code></pre>`)
    return `@@CODE_BLOCK_${idx}@@`
  })
  s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  s = s.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
  s = s.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
  s = s.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
  const lines = s.split('\n')
  const out = []
  let inUl = false
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    if (/^\s*[-*]\s+/.test(line)) {
      if (!inUl) { out.push('<ul>'); inUl = true }
      out.push(`<li>${line.replace(/^\s*[-*]\s+/, '')}</li>`)
      continue
    }
    if (inUl) { out.push('</ul>'); inUl = false }
    out.push(line)
  }
  if (inUl) out.push('</ul>')
  s = out.join('\n')
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>')
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<span>$1</span>')
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, href) => `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`)
  s = s.split(/\n{2,}/).map(b => {
    const t = b.trim()
    if (!t) return ''
    if (/^<(h\d|ul|pre)/i.test(t)) return t
    return `<p>${t.replace(/\n/g, '<br/>')}</p>`
  }).join('\n')
  s = s.replace(/@@CODE_BLOCK_(\d+)@@/g, (_m, i) => blocks[Number(i)] || '')
  return sanitizeHtml(s)
}

export default function App() {
  const { t, i18n } = useTranslation()
  const [files, setFiles] = useState([])
  const [outputDir, setOutputDir] = useState('')
  const [format, setFormat] = useState('jpg')
  const [quality, setQuality] = useState(85)
  const [colorDrift, setColorDrift] = useState(2)
  const [resizeDrift, setResizeDrift] = useState(2)
  const [resizeMaxW, setResizeMaxW] = useState(0)
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
  const [progress, setProgress] = useState({ current: 0, total: 0, lastFile: '', etaMs: 0, speedBps: 0, percent: 0 })
  const [results, setResults] = useState([])
  const [selectedIdx, setSelectedIdx] = useState(new Set())
  const [lastSelectedIndex, setLastSelectedIndex] = useState(-1)
  const [errorCount, setErrorCount] = useState(0)
  const gridRef = useRef(null)
  const [dragSelecting, setDragSelecting] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const [dragRect, setDragRect] = useState(null)
  const [activeTab, setActiveTab] = useState('files')
  const [filterExt, setFilterExt] = useState('all')
  const [searchFiles, setSearchFiles] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [statsByPath, setStatsByPath] = useState({})
  const [detailsPath, setDetailsPath] = useState('')
  const [detailsHash, setDetailsHash] = useState('')
  const [ctxMenu, setCtxMenu] = useState({ open: false, x: 0, y: 0, path: '', index: -1 })
  const [txtPath, setTxtPath] = useState('')
  const [txtContent, setTxtContent] = useState('')
  const [jsonPreview, setJsonPreview] = useState('')
  const [parseInfo, setParseInfo] = useState({ lines: 0, ok: 0, errors: 0 })
  const [parseError, setParseError] = useState('')
  const [profiles, setProfiles] = useState([])
  const [selectedProfiles, setSelectedProfiles] = useState(new Set())
  const [search, setSearch] = useState('')
  const [autoParse, setAutoParse] = useState(true)
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
  const [updNotesHtml, setUpdNotesHtml] = useState('')
  const [netLost, setNetLost] = useState(false)
  const [currentNotesOpen, setCurrentNotesOpen] = useState(false)
  const [currentNotes, setCurrentNotes] = useState('')
  const [currentNotesHtml, setCurrentNotesHtml] = useState('')
  const [aboutOpen, setAboutOpen] = useState(false)
  const [aboutMd, setAboutMd] = useState('')
  const [aboutHtml, setAboutHtml] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [previewSrc, setPreviewSrc] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [gpuSupported, setGpuSupported] = useState(false)
  const [gpuEnabled, setGpuEnabled] = useState(false)
  const [gpuName, setGpuName] = useState('')
  const [dupIndex, setDupIndex] = useState(-1)
  const [dupGroups, setDupGroups] = useState([])
  const [dupTargets, setDupTargets] = useState([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminToast, setAdminToast] = useState(false)
  const [indigoEndpoint, setIndigoEndpoint] = useState('http://127.0.0.1')
  const [indigoBusy, setIndigoBusy] = useState(false)
  const [indigoResult, setIndigoResult] = useState(null)
  const [visionToken, setVisionToken] = useState('')
  const [visionEndpoint, setVisionEndpoint] = useState('')
  const [visionBusy, setVisionBusy] = useState(false)
  const [visionResult, setVisionResult] = useState(null)
  const [indigoPort, setIndigoPort] = useState('')
  const [indigoEmail, setIndigoEmail] = useState('')
  const [indigoPwd, setIndigoPwd] = useState('')
  const [indigoSrc, setIndigoSrc] = useState('')
  const [indigoTokenInput, setIndigoTokenInput] = useState('')
  const [indigoExp, setIndigoExp] = useState({ idx: 0, total: 0, info: null })
  const [indigoCsvPath, setIndigoCsvPath] = useState('')
  const [adminOpen, setAdminOpen] = useState(false)
  const adminWsRef = useRef(null)
  const [adminConnectKey, setAdminConnectKey] = useState(0)
  const [pendingAdminOpen, setPendingAdminOpen] = useState(false)
  const [devUnlockOpen, setDevUnlockOpen] = useState(false)
  const [devPassword, setDevPassword] = useState('')
  const [devUnlockBusy, setDevUnlockBusy] = useState(false)
  const [devUnlockError, setDevUnlockError] = useState('')
  const [chatUrl, setChatUrl] = useState(() => {
    try { return localStorage.getItem('chatUrl') || 'ws://10.11.10.101:8081' } catch (_) { return 'ws://10.11.10.101:8081' }
  })
  useEffect(() => { try { localStorage.setItem('chatUrl', chatUrl) } catch (_) {} }, [chatUrl])
  useEffect(() => { setAdminConnectKey(k=>k+1) }, [chatUrl])
  const indigoCodeRef = useRef(null)

  function resSummary(r) {
    if (!r) return null
    const text = r.ok ? (typeof r.count === 'number' ? `Готово • ${r.count}` : 'Готово') : (r.status ? `Ошибка • ${r.status}` : 'Ошибка')
    return <div className={`text-xs ${r.ok ? 'text-emerald-400' : 'text-rose-400'}`}>{text}</div>
  }

  

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
      setProgress({ current: d.index + 1, total: d.total, lastFile: d.file, etaMs: Number(d.etaMs||0), speedBps: Number(d.speedBps||0), percent: Number(d.percent)||0 })
      if (d && d.status === 'ok' && d.outPath) setResults(prev => [...prev, { src: d.file, out: d.outPath }])
      if (d && d.status && String(d.status).toLowerCase() !== 'ok') setErrorCount(c => c + 1)
      try {
        emitAdminEvent('process_progress', {
          index: d.index,
          total: d.total,
          file: d.file,
          status: d.status,
          percent: typeof d.percent === 'number' ? d.percent : undefined,
          speedBps: typeof d.speedBps === 'number' ? d.speedBps : undefined,
          etaMs: typeof d.etaMs === 'number' ? d.etaMs : undefined,
          outPath: d.outPath,
          message: d.message
        })
      } catch (_) {}
    })
    const done = window.api.onComplete(() => {
      setBusy(false)
      setActiveTab('ready')
      try { emitAdminEvent('process_complete', {}) } catch (_) {}
    })
    const step = (_e) => {}
    try { window.api.onStep && window.api.onStep(s => { try { emitAdminEvent('process_step', s) } catch (_) {} }) } catch (_) {}
    return () => { off(); done() }
  }, [])

  useEffect(() => {
    try {
      const off = window.api.onOsOpenFiles(async (files) => {
        if (Array.isArray(files) && files.length) {
          try {
            const expanded = await window.api.expandPaths(files)
            if (expanded && expanded.length) setFiles(prev => Array.from(new Set([...prev, ...expanded])))
          } catch (_) {}
        }
      })
      return () => { try { off && off() } catch (_) {} }
    } catch (_) {}
  }, [])

  useEffect(() => {
    try {
      const m = String(indigoEndpoint||'').match(/:(\d+)(?:$|\/)$/)
      setIndigoPort(m ? m[1] : '')
    } catch (_) {}
  }, [indigoEndpoint])

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

  useEffect(() => {
    (async () => {
      try {
        const mod = await import('./components/Icons')
        const wasm = await (mod.initWasm ? mod.initWasm() : null)
        if (wasm && wasm.init) { try { wasm.init() } catch (_) {} }
      } catch (_) {}
    })()
  }, [])

  useEffect(() => {
    (async () => {
      try {
        const r = await window.api.isAdmin().catch(()=>({ ok: true, admin: false }))
        setIsAdmin(!!(r && r.admin))
        if (r && r.admin) { setAdminToast(true); setTimeout(()=>setAdminToast(false), 3000) }
      } catch (_) {}
    })()
  }, [])

  const emitAdminEvent = (name, data) => {
    try {
      const ws = adminWsRef.current
      if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'client_event', name: String(name||''), data }))
    } catch (_) {}
  }

  const emitChange = (field, value) => emitAdminEvent('change', { field, value })

  useEffect(() => { emitChange('profile', profile) }, [profile])
  useEffect(() => { emitChange('format', format) }, [format])
  useEffect(() => { emitChange('quality', quality) }, [quality])
  useEffect(() => { emitChange('colorDrift', colorDrift) }, [colorDrift])
  useEffect(() => { emitChange('resizeDrift', resizeDrift) }, [resizeDrift])
  useEffect(() => { emitChange('resizeMaxW', resizeMaxW) }, [resizeMaxW])
  useEffect(() => { emitChange('naming', naming) }, [naming])
  useEffect(() => { emitChange('author', author) }, [author])
  useEffect(() => { emitChange('description', description) }, [description])
  useEffect(() => { emitChange('copyright', copyright) }, [copyright])
  useEffect(() => { emitChange('keywords', keywords) }, [keywords])
  useEffect(() => { emitChange('contactName', contactName) }, [contactName])
  useEffect(() => { emitChange('contactEmail', contactEmail) }, [contactEmail])
  useEffect(() => { emitChange('website', website) }, [website])
  useEffect(() => { emitChange('owner', owner) }, [owner])
  useEffect(() => { emitChange('creatorTool', creatorTool) }, [creatorTool])
  useEffect(() => { emitChange('removeGps', removeGps) }, [removeGps])
  useEffect(() => { emitChange('uniqueId', uniqueId) }, [uniqueId])
  useEffect(() => { emitChange('removeAllMeta', removeAllMeta) }, [removeAllMeta])
  useEffect(() => { emitChange('fakeMeta', fakeMeta) }, [fakeMeta])
  useEffect(() => { emitChange('fakePerFile', fakePerFile) }, [fakePerFile])
  useEffect(() => { emitChange('fakeGps', fakeGps) }, [fakeGps])
  useEffect(() => { emitChange('fakeAuto', fakeAuto) }, [fakeAuto])
  useEffect(() => { emitChange('onlineAuto', onlineAuto) }, [onlineAuto])
  useEffect(() => { emitChange('fakeProfile', fakeProfile) }, [fakeProfile])
  useEffect(() => { emitChange('fakeMake', fakeMake) }, [fakeMake])
  useEffect(() => { emitChange('fakeModel', fakeModel) }, [fakeModel])
  useEffect(() => { emitChange('fakeLens', fakeLens) }, [fakeLens])
  useEffect(() => { emitChange('fakeSoftware', fakeSoftware) }, [fakeSoftware])
  useEffect(() => { emitChange('fakeSerial', fakeSerial) }, [fakeSerial])
  useEffect(() => { emitChange('locationPreset', locationPreset) }, [locationPreset])
  useEffect(() => { emitChange('fakeLat', fakeLat) }, [fakeLat])
  useEffect(() => { emitChange('fakeLon', fakeLon) }, [fakeLon])
  useEffect(() => { emitChange('fakeAltitude', fakeAltitude) }, [fakeAltitude])
  useEffect(() => { emitChange('fakeIso', fakeIso) }, [fakeIso])
  useEffect(() => { emitChange('fakeExposureTime', fakeExposureTime) }, [fakeExposureTime])
  useEffect(() => { emitChange('fakeFNumber', fakeFNumber) }, [fakeFNumber])
  useEffect(() => { emitChange('fakeFocalLength', fakeFocalLength) }, [fakeFocalLength])
  useEffect(() => { emitChange('fakeExposureProgram', fakeExposureProgram) }, [fakeExposureProgram])
  useEffect(() => { emitChange('fakeMeteringMode', fakeMeteringMode) }, [fakeMeteringMode])
  useEffect(() => { emitChange('fakeFlash', fakeFlash) }, [fakeFlash])
  useEffect(() => { emitChange('fakeWhiteBalance', fakeWhiteBalance) }, [fakeWhiteBalance])
  useEffect(() => { emitChange('fakeColorSpace', fakeColorSpace) }, [fakeColorSpace])
  useEffect(() => { emitChange('fakeRating', fakeRating) }, [fakeRating])
  useEffect(() => { emitChange('fakeLabel', fakeLabel) }, [fakeLabel])
  useEffect(() => { emitChange('fakeTitle', fakeTitle) }, [fakeTitle])
  useEffect(() => { emitChange('fakeCity', fakeCity) }, [fakeCity])
  useEffect(() => { emitChange('fakeState', fakeState) }, [fakeState])
  useEffect(() => { emitChange('fakeCountry', fakeCountry) }, [fakeCountry])
  useEffect(() => { emitChange('visionToken', visionToken ? 'set' : '') }, [visionToken])
  useEffect(() => { emitChange('visionEndpoint', visionEndpoint) }, [visionEndpoint])
  useEffect(() => { emitChange('gpuEnabled', gpuEnabled) }, [gpuEnabled])
  useEffect(() => { emitChange('outputDir', outputDir) }, [outputDir])
  useEffect(() => { emitChange('activeTab', activeTab) }, [activeTab])
  useEffect(() => { emitChange('filesCount', files.length) }, [files])
  useEffect(() => { emitChange('resultsCount', results.length) }, [results])
  useEffect(() => {
    let cancelled = false
    if (!adminConnectKey) return
    let ws = null
    let backoff = 500
    function connect() {
      if (cancelled) return
      try { if (ws) { try { ws.close() } catch (_) {} } } catch (_) {}
      try { ws = new WebSocket(chatUrl) } catch (_) { setTimeout(connect, Math.min(8000, backoff*=2)); return }
      adminWsRef.current = ws
      ws.addEventListener('open', () => { backoff = 500 })
      ws.addEventListener('close', () => { if (!cancelled) setTimeout(connect, Math.min(8000, backoff*=2)) })
      ws.addEventListener('error', () => {})
    }
    connect()
    return () => { cancelled = true; try { ws && ws.close() } catch (_) {} }
  }, [adminConnectKey, chatUrl])

  

  useEffect(() => {
    const dev = window.api?.dev
    if (!dev) return
    const offT = dev.onToggleAdminPanel(() => setAdminOpen(v => !v))
    const offS = dev.onShowAdminPanel(() => setAdminOpen(true))
    const offH = dev.onHideAdminPanel(() => setAdminOpen(false))
    const offReq = dev.onRequestUnlock(() => { setDevUnlockOpen(true); setDevUnlockError('') })
    const offUnl = dev.onUnlocked(() => { setDevUnlockOpen(false); setDevPassword(''); setDevUnlockBusy(false); setDevUnlockError(''); if (pendingAdminOpen) { setAdminOpen(true); setPendingAdminOpen(false) } })
    return () => { offT(); offS(); offH(); offReq(); offUnl() }
  }, [])

  useEffect(() => {
    const offAvail = window.api.onUpdateAvailable(info => {
      setUpd(prev => ({ ...prev, available: true, info, error: null, downloaded: false }))
      ;(async () => {
        try {
          const r = await window.api.getUpdateChangelog().catch(() => ({ ok: false }))
          const notes = (r && r.ok && r.notes) ? r.notes : ''
          if (notes) {
            setUpd(prev => ({ ...prev, notes }))
            try { setUpdNotesHtml(prepareNotesHtml(notes)) } catch (_) {}
          }
          try { await window.api.downloadUpdate() } catch (_) {}
        } catch (_) {}
      })()
    })
    const offNot = window.api.onUpdateNotAvailable(() => {
      setUpd(prev => ({ ...prev, available: false, info: null }))
    })
    const offErr = window.api.onUpdateError(err => {
      setUpd(prev => ({ ...prev, error: String(err || '') }))
    })
    const offProg = window.api.onUpdateProgress(p => {
      setUpd(prev => ({ ...prev, downloading: true, percent: Number(p && p.percent) || 0 }))
    })
    const offDone = window.api.onUpdateDownloaded(info => {
      setUpd(prev => ({ ...prev, downloading: false, downloaded: true, info }))
    })
    window.api.checkForUpdates().catch(() => {})
    return () => { offAvail(); offNot(); offErr(); offProg(); offDone() }
  }, [])

  useEffect(() => {
    try { document.documentElement.setAttribute('dir', i18n.language === 'ar' ? 'rtl' : 'ltr') } catch (_) {}
  }, [i18n.language])

  useEffect(() => {
    (async () => {
      try {
        const r = await window.api.ui.loadState().catch(() => ({ ok: false }))
        if (r && r.ok && r.data) {
          const s = r.data
          if (typeof s.language === 'string') { try { i18n.changeLanguage(s.language) } catch (_) {} }
          if (typeof s.outputDir === 'string') setOutputDir(s.outputDir)
          if (typeof s.profile === 'string') setProfile(s.profile)
          if (typeof s.format === 'string') setFormat(s.format)
          if (typeof s.quality === 'number') setQuality(s.quality)
          if (typeof s.colorDrift === 'number') setColorDrift(s.colorDrift)
          if (typeof s.resizeDrift === 'number') setResizeDrift(s.resizeDrift)
          if (typeof s.resizeMaxW === 'number') setResizeMaxW(s.resizeMaxW)
          if (typeof s.naming === 'string') setNaming(s.naming)
          if (typeof s.removeGps === 'boolean') setRemoveGps(s.removeGps)
          if (typeof s.dateStrategy === 'string') setDateStrategy(s.dateStrategy)
          if (typeof s.dateOffsetMinutes === 'number') setDateOffsetMinutes(s.dateOffsetMinutes)
          if (typeof s.uniqueId === 'boolean') setUniqueId(s.uniqueId)
          if (typeof s.removeAllMeta === 'boolean') setRemoveAllMeta(s.removeAllMeta)
          if (typeof s.filterExt === 'string') setFilterExt(s.filterExt)
          if (typeof s.searchFiles === 'string') setSearchFiles(s.searchFiles)
          if (typeof s.sortBy === 'string') setSortBy(s.sortBy)
          if (typeof s.sortDir === 'string') setSortDir(s.sortDir)
          if (typeof s.activeTab === 'string') setActiveTab(s.activeTab)
          if (Array.isArray(s.files) && s.files.length) {
            try {
              const expanded = await window.api.expandPaths(s.files)
              if (expanded && expanded.length) setFiles(Array.from(new Set(expanded)))
            } catch (_) {}
          }
        }
      } catch (_) {}
    })()
  }, [])

  useEffect(() => {
    const data = {
      language: i18n.language,
      outputDir,
      profile,
      format,
      quality,
      colorDrift,
      resizeDrift,
      resizeMaxW,
      naming,
      removeGps,
      dateStrategy,
      dateOffsetMinutes,
      uniqueId,
      removeAllMeta,
      filterExt,
      searchFiles,
      sortBy,
      sortDir,
      activeTab,
      files: Array.isArray(files) ? files.slice(0, 500) : []
    }
    try { window.api.ui.saveState(data) } catch (_) {}
  }, [i18n.language, outputDir, profile, format, quality, colorDrift, resizeDrift, resizeMaxW, naming, removeGps, dateStrategy, dateOffsetMinutes, uniqueId, removeAllMeta, filterExt, searchFiles, sortBy, sortDir, activeTab, files])

  const handleAdd = async () => {
    const paths = await window.api.selectImages()
    if (!paths || !paths.length) return
    setFiles(prev => Array.from(new Set([...prev, ...paths])))
    emitAdminEvent('select_files', { count: (paths && paths.length) || 0 })
  }

  const buildDupIndex = async () => {
    const nat = window.api.native
    const targets = results.length ? results.map(r => r.out) : files
    setDupTargets(targets)
    const hashes = (await Promise.all(targets.map(p => nat.fileAHash(p)))).filter(Boolean)
    const id = nat.createHammingIndex(hashes)
    setDupIndex(id)
    const groupsRaw = nat.clusterByHamming(hashes, 5) || []
    const groups = groupsRaw.filter(g => Array.isArray(g) && g.length > 1).sort((a,b)=>b.length-a.length)
    setDupGroups(groups)
    setActiveTab('duplicates')
  }

  const handleOutput = async () => {
    const dir = await window.api.selectOutputDir()
    if (dir) setOutputDir(dir)
    if (dir) emitAdminEvent('select_output_dir', { dir })
  }

  const handleClear = () => {
    setFiles([])
    setProgress({ current: 0, total: 0, lastFile: '' })
    emitAdminEvent('clear_files')
  }

  const canStart = useMemo(() => files.length > 0 && outputDir && !busy, [files, outputDir, busy])
  const canCancel = useMemo(() => busy, [busy])

  useEffect(() => {
    if (profile === 'soft') {
      setQuality(90)
      setColorDrift(1)
      setResizeDrift(1)
      setResizeMaxW(0)
    } else if (profile === 'strong') {
      setQuality(80)
      setColorDrift(3)
      setResizeDrift(3)
      setResizeMaxW(0)
    } else if (profile === 'facebook') {
      setFormat('jpg')
      setQuality(85)
      setColorDrift(0)
      setResizeDrift(0)
      setRemoveGps(true)
      setResizeMaxW(2048)
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
    emitAdminEvent('process_start', { count: inputFiles.length, format, quality })
    const payload = {
      inputFiles,
      outputDir,
      format,
      quality: Number(quality),
      colorDrift: Number(colorDrift),
      resizeDrift: Number(resizeDrift),
      resizeMaxW: Number(resizeMaxW),
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
    emitAdminEvent('process_cancel')
  }

  const addFolder = async () => {
    const paths = await window.api.selectImageDir()
    if (!paths || !paths.length) return
    setFiles(prev => Array.from(new Set([...prev, ...paths])))
    emitAdminEvent('select_folder', { count: (paths && paths.length) || 0 })
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

  const checkIndigo = async () => {}

  const checkVision = async () => {
    if (!visionToken.trim()) return
    setVisionBusy(true)
    setVisionResult(null)
    try {
      const r = await window.api.checkTokenVision({ endpoint: visionEndpoint, token: visionToken })
      setVisionResult(r || { ok: false })
    } catch (_) {
      setVisionResult({ ok: false })
    } finally {
      setVisionBusy(false)
    }
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

  const extractJsonSegments = (text) => {
    const segments = []
    let start = -1
    let depth = 0
    let inString = false
    let escape = false
    const stack = []
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i]
      if (escape) { escape = false; continue }
      if (inString) {
        if (ch === '\\') { escape = true; continue }
        if (ch === '"') { inString = false }
        continue
      }
      if (ch === '"') { inString = true; continue }
      if (ch === '[' || ch === '{') {
        if (depth === 0) start = i
        stack.push(ch)
        depth += 1
        continue
      }
      if (ch === ']' || ch === '}') {
        if (depth > 0) {
          const last = stack[stack.length - 1]
          const ok = (ch === ']' && last === '[') || (ch === '}' && last === '{')
          if (!ok) {
            depth = 0
            stack.length = 0
            start = -1
          } else {
            stack.pop()
            depth -= 1
            if (depth === 0 && start !== -1) {
              segments.push({ start, end: i + 1 })
              start = -1
            }
          }
        }
        continue
      }
    }
    return segments
  }

  const parseTxt = (inputText) => {
    try {
      setParseError('')
      const text = typeof inputText === 'string' ? inputText : (txtContent || '')
      const nat = window.api?.native
      let usedNative = false
      if (nat && typeof nat.parseTxtProfiles === 'function') {
        try {
          const res = nat.parseTxtProfiles(text)
          if (res && res.profiles) {
            const arr = Array.isArray(res.profiles) ? res.profiles : Array.from(res.profiles)
            const filtered = (Array.isArray(arr) ? arr : []).filter(it => it && (it.profileId || it.url || (Array.isArray(it.cookies) && it.cookies.length)))
            const dedup = []
            const seen = new Set()
            for (const it of filtered) {
              const key = `${it.profileId || ''}|${it.account?.login || ''}`
              if (!seen.has(key)) { seen.add(key); dedup.push(it) }
            }
            dedup.sort((a, b) => {
              const al = (a.profileId || '').length
              const bl = (b.profileId || '').length
              if (al !== bl) return al - bl
              return (a.profileId || '').localeCompare(b.profileId || '')
            })
            const totalLines = (text || '').split(/\r?\n/).filter(l => l.trim()).length
            const errs = (res && typeof res.errors === 'number') ? res.errors : 0
            setParseInfo({ lines: totalLines, ok: dedup.length, errors: errs })
            setProfiles(dedup)
            setSelectedProfiles(new Set(dedup.map((_, i) => i)))
            setJsonPreview(JSON.stringify(dedup, null, 2))
            usedNative = true
          }
        } catch (_) {}
      }
      if (usedNative) return
      const segments = extractJsonSegments(text)
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
        const important = new Set(['c_user', 'xs', 'datr', 'sb', 'fr'])
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
      const dedup = []
      const seen = new Set()
      for (const it of filtered) {
        const key = `${it.profileId || ''}|${it.account?.login || ''}`
        if (!seen.has(key)) { seen.add(key); dedup.push(it) }
      }
      dedup.sort((a, b) => {
        const al = (a.profileId || '').length
        const bl = (b.profileId || '').length
        if (al !== bl) return al - bl
        return (a.profileId || '').localeCompare(b.profileId || '')
      })
      const totalLines = (text || '').split(/\r?\n/).filter(l => l.trim()).length
      setParseInfo({ lines: totalLines, ok: dedup.length, errors })
      setProfiles(dedup)
      setSelectedProfiles(new Set(dedup.map((_, i) => i)))
      setJsonPreview(JSON.stringify(dedup, null, 2))
    } catch (e) {
      setParseError(String(e))
    }
  }

  useEffect(() => {
    if (!autoParse) return
    const id = setTimeout(() => { parseTxt(txtContent) }, 250)
    return () => clearTimeout(id)
  }, [txtContent, autoParse])

  const selectAllProfiles = () => {
    const all = new Set(profiles.map((_, i) => i))
    setSelectedProfiles(all)
    setJsonPreview(JSON.stringify(profiles, null, 2))
  }

  const clearAllProfiles = () => {
    const none = new Set()
    setSelectedProfiles(none)
    setJsonPreview(JSON.stringify([], null, 2))
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

  const tabs = [
    { id: 'files', label: t('tabs.files') },
    { id: 'ready', label: t('tabs.ready') },
    { id: 'converter', label: t('tabs.converter') },
    { id: 'indigo', label: t('tabs.indigo') },
    { id: 'vision', label: t('tabs.vision') },
    { id: 'chat', label: t('tabs.chat') }
  ]

  return (
    <div className="h-full text-slate-100">
      <AuthGate />
      <header className="px-4 sm:px-6 py-3 flex items-center justify-between gap-2 border-b border-white/10 bg-black/30 backdrop-blur sticky top-0 z-40" role="banner">
        <div className="flex items-center gap-3">
          <div className="text-xl sm:text-2xl font-semibold tracking-tight">PhotoUnikalizer</div>
          <div className="text-[10px] sm:text-xs neon">by YALOKGAR</div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            className="px-2 py-1 rounded bg-slate-900 border border-white/10 hover:bg-slate-800 text-xs"
            value={i18n.language}
            onChange={e => { const v = e.target.value; i18n.changeLanguage(v); try { localStorage.setItem('lang', v) } catch (_) {} }}
          >
            <option value="uk">Українська</option>
            <option value="ru">Русский</option>
            <option value="en">English</option>
            <option value="ar">العربية</option>
            <option value="zh">中文</option>
            <option value="pl">Polski</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="ja">日本語</option>
            <option value="ko">한국어</option>
            <option value="kk">Қазақ тілі</option>
            <option value="it">Italiano</option>
            <option value="sv">Svenska</option>
            <option value="nb">Norsk</option>
            <option value="fi">Suomi</option>
            <option value="ro">Română</option>
            <option value="ro-MD">Română (MD)</option>
          </select>
          <div className="hidden sm:flex items-center w-48 h-2 bg-slate-900 rounded border border-white/10 ml-2" aria-live="polite" aria-label="progress">
            <div className="h-2 bg-brand-600 rounded" style={{ width: (progress.total>0?Math.round(progress.current/progress.total*100):0) + '%' }} />
          </div>
          <div className="hidden md:flex items-center gap-2 ml-2">
            <div className="text-[10px] px-2 py-1 rounded bg-slate-900 border border-white/10">Total: {progress.total}</div>
            <div className="text-[10px] px-2 py-1 rounded bg-slate-900 border border-white/10">Selected: {selectedIdx.size}</div>
            <div className="text-[10px] px-2 py-1 rounded bg-slate-900 border border-white/10">Processed: {Math.min(progress.current, progress.total)}</div>
            <div className="text-[10px] px-2 py-1 rounded bg-slate-900 border border-white/10">Errors: {errorCount}</div>
          </div>
          <button onClick={async()=>{
            try {
              if (!currentNotes) {
                const r = await window.api.getUpdateChangelog().catch(()=>({ok:false}))
                const notes = (r && r.ok && r.notes) ? r.notes : 'Нет заметок'
                setCurrentNotes(notes)
                try { setCurrentNotesHtml(prepareNotesHtml(notes)) } catch (_) {}
              }
              setCurrentNotesOpen(v=>!v)
            } catch (_) {
              setCurrentNotesOpen(v=>!v)
            }
          }} className="px-2 py-1 rounded bg-slate-900 border border-white/10 hover:bg-slate-800 text-xs">{t('actions.whatsNew')}</button>
          <button onClick={async()=>{
            try {
              if (!aboutMd) {
                const r = await window.api.getReadme().catch(()=>({ok:false}))
                const data = (r && r.ok && r.data) ? r.data : 'README not found'
                setAboutMd(data)
                try { setAboutHtml(markdownToHtml(data)) } catch (_) {}
              }
              setAboutOpen(v=>!v)
            } catch (_) {
              setAboutOpen(v=>!v)
            }
          }} className="px-2 py-1 rounded bg-slate-900 border border-white/10 hover:bg-slate-800 text-xs">{t('actions.about')}</button>
          {!isAdmin && <button onClick={async()=>{
            try { await window.api.relaunchAsAdmin() } catch (_) {}
          }} className="px-2 py-1 rounded bg-slate-900 border border-white/10 hover:bg-slate-700 text-xs">Запустить от администратора</button>}
          <button onClick={async()=>{
            try {
              const r = await window.api.dev.isUnlocked().catch(()=>({ok:false,unlocked:false}))
              if (r && r.unlocked) { setAdminOpen(true); return }
            } catch (_) {}
            setPendingAdminOpen(true)
            setDevUnlockOpen(true)
          }} className="px-2 py-1 rounded bg-slate-900 border border-white/10 hover:bg-slate-800 text-xs">Admin</button>
        </div>
      </header>

      {progress && progress.total > 0 && (
        <div className="px-4 sm:px-6 py-2" aria-live="polite">
          <div className="w-full h-2 bg-slate-900 rounded border border-white/10 overflow-hidden">
            <div className="h-2 bg-brand-600" style={{ width: `${Math.max(0, Math.min(100, Math.round((progress.current / Math.max(1, progress.total)) * 100)))}%` }} />
          </div>
          <div className="text-xs opacity-80 mt-1">
            {busy ? t('status.processing') : t('status.ready')} {progress.lastFile ? `• ${progress.lastFile}` : ''}
            {busy && (
              <>
                {' '}• {t('status.speed')} {progress.speedBps ? `${(progress.speedBps/1024/1024).toFixed(2)} MB/s` : '—'}
                {' '}• {t('status.eta')} {progress.etaMs ? `${Math.max(0, Math.floor(progress.etaMs/1000))}s` : '—'}
              </>
            )}
          </div>
        </div>
      )}

      {currentNotesOpen && (
        <div className="mx-4 sm:mx-6 mb-4 p-3 rounded bg-slate-900/60 border border-white/10 text-slate-200">
          <div className="flex items-start justify-between gap-3">
            <div className="text-sm">Что нового</div>
            <button onClick={()=>setCurrentNotesOpen(false)} className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs">Закрыть</button>
          </div>
          <div className="mt-2 text-[11px] max-h-56 overflow-auto opacity-90 prose prose-invert prose-sm" dangerouslySetInnerHTML={{ __html: currentNotesHtml || prepareNotesHtml(currentNotes || 'Нет заметок') }} />
        </div>
      )}

      {adminToast && (
        <div className="fixed top-3 right-3 z-50 px-3 py-2 rounded bg-emerald-900/70 border border-emerald-500/40 text-emerald-200 text-xs shadow-lg">Запущено от администратора</div>
      )}

      {aboutOpen && (
        <div className="mx-4 sm:mx-6 mb-4 p-3 rounded bg-slate-900/60 border border-white/10 text-slate-200">
          <div className="flex items-start justify-between gap-3">
            <div className="text-sm">О программе</div>
            <button onClick={()=>setAboutOpen(false)} className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs">Закрыть</button>
          </div>
          <div className="mt-2 text-[11px] max-h-72 overflow-auto opacity-90 prose prose-invert prose-sm" dangerouslySetInnerHTML={{ __html: aboutHtml || markdownToHtml(aboutMd || 'README not found') }} />
        </div>
      )}

      {upd.available && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative mx-4 sm:mx-6 mb-4 p-3 rounded bg-amber-900/40 border border-amber-600/40 text-amber-200 w-[720px] max-w-[96vw]">
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
            <div className="mt-2 text-[11px] max-h-48 overflow-auto border-t border-amber-600/20 pt-2 opacity-90 prose prose-invert prose-sm" dangerouslySetInnerHTML={{ __html: updNotesHtml || prepareNotesHtml(upd.notes) }} />
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
          <div className="text-[11px] opacity-80 mt-2">Интерфейс заблокирован до установки обновления</div>
          </div>
        </div>
      )}

      <main className="px-4 sm:px-6 pb-6 grid grid-cols-12 gap-4 sm:gap-6">
        <aside className="col-span-12 lg:col-span-2 glass rounded-xl p-3 border border-white/10 h-fit lg:sticky lg:top-4 self-start">
          <nav className="flex lg:flex-col gap-2">
            {tabs.map(it => (
              <button key={it.id} onClick={()=>{ setActiveTab(it.id); emitAdminEvent('tab', { tab: it.id }) }} className={`text-sm text-left px-3 py-2 rounded border ${activeTab===it.id ? 'bg-brand-600 hover:bg-brand-500 border-transparent' : 'bg-slate-900/50 hover:bg-slate-800/70 border-white/10'}`}>
                {it.label}
              </button>
            ))}
          </nav>
        </aside>
        <section className="col-span-12 lg:col-span-4 glass rounded-xl p-4 sm:p-5 border border-white/10">
          <div className="text-sm font-semibold mb-4">{t('sections.output')}</div>
          <div className="flex gap-2">
            <button onClick={handleOutput} className="px-3 py-2 rounded bg-brand-600 hover:bg-brand-500 text-white flex items-center gap-2"><IconFolder className="w-4 h-4" />{t('common.pickFolder')}</button>
            <div className="text-xs truncate opacity-80 self-center max-w-[260px]" title={outputDir}>{outputDir || t('common.notSelected')}</div>
            {!!outputDir && <button onClick={()=>window.api.openPath(outputDir)} className="px-2 py-2 rounded bg-slate-800 hover:bg-slate-700 text-xs flex items-center gap-1"><IconOpenExternal className="w-3.5 h-3.5" />{t('common.open')}</button>}
          </div>

          <div className="h-px bg-white/10 my-5" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs mb-1">{t('profile.title')}</div>
              <select className="w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={profile} onChange={e => setProfile(e.target.value)}>
                <option value="custom">{t('profile.custom')}</option>
                <option value="soft">{t('profile.soft')}</option>
                <option value="strong">{t('profile.strong')}</option>
                <option value="facebook">{t('profile.facebook')}</option>
              </select>
            </div>
            <div>
              <div className="text-xs mb-1">{t('format.title')}</div>
              <select className="w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={format} onChange={e => setFormat(e.target.value)}>
                <option value="jpg">JPG</option>
                <option value="png">PNG</option>
                <option value="webp">WEBP</option>
                <option value="avif">AVIF</option>
              </select>
            </div>
            <div>
              <div className="text-xs mb-1">{t('quality.title')}</div>
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
              <div className="text-xs mb-1">{t('drift.color')}</div>
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
              <div className="text-xs mb-1">{t('drift.size')}</div>
              <select className="w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={resizeDrift} onChange={e => setResizeDrift(Number(e.target.value))}>
                <option value={0}>0</option>
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5</option>
              </select>
            </div>
            <div>
              <div className="text-xs mb-1">{t('maxWidth.title')}</div>
              <input type="number" className="w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={resizeMaxW} onChange={e=>setResizeMaxW(Number(e.target.value))} placeholder={t('maxWidth.placeholder', { defaultValue: '0 = no limit (FB 2048)' })} />
            </div>
            <div className="md:col-span-2">
              <div className="text-xs mb-1">{t('naming.title')}</div>
              <input className="w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={naming} onChange={e => setNaming(e.target.value)} />
              <div className="text-[10px] opacity-60 mt-1">{t('naming.hint')}</div>
            </div>

            <div className="md:col-span-2 h-px bg-white/10 my-5" />

            <div className="md:col-span-2 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="text-xs">{t('gpu.title')}</div>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" disabled={!gpuSupported} checked={gpuEnabled && gpuSupported} onChange={e => {
                  const g = window.api?.native?.gpu
                  if (!g) return
                  const next = !!e.target.checked
                  g.setEnabled(next)
                  setGpuEnabled(next)
                }} />
                <span className="opacity-70">{gpuSupported ? (gpuEnabled ? `${t('gpu.enabled')} • ${gpuName||'GPU'}` : t('gpu.disabled')) : t('gpu.unavailable')}</span>
              </label>
            </div>

            <div className="md:col-span-2">
              <div className="text-sm font-semibold mb-3">{t('meta.title')}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <div className="text-xs mb-1">{t('meta.author')}</div>
                  <input className="w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={author} onChange={e => setAuthor(e.target.value)} />
                </div>
                <div className="md:col-span-2 flex items-center justify-between">
                  <div className="text-xs opacity-80">{t('meta.myData')}</div>
                  <button onClick={fillMyData} className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs">{t('meta.fill')}</button>
                </div>
                <div>
                  <div className="text-xs mb-1">{t('meta.contactName')}</div>
                  <input className="w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={contactName} onChange={e => setContactName(e.target.value)} />
                </div>
                <div>
                  <div className="text-xs mb-1">{t('meta.email')}</div>
                  <input className="w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
                </div>
                <div>
                  <div className="text-xs mb-1">{t('meta.website')}</div>
                  <input className="w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={website} onChange={e => setWebsite(e.target.value)} />
                </div>
                <div>
                  <div className="text-xs mb-1">{t('meta.owner')}</div>
                  <input className="w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={owner} onChange={e => setOwner(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs mb-1">{t('meta.tool')}</div>
                  <input className="w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={creatorTool} onChange={e => setCreatorTool(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs mb-1">{t('meta.description')}</div>
                  <input className="w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={description} onChange={e => setDescription(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs mb-1">{t('meta.rights')}</div>
                  <input className="w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={copyright} onChange={e => setCopyright(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs mb-1">{t('meta.keywords')}</div>
                  <input placeholder={t('meta.keywordsPlaceholder', { defaultValue: 'comma separated' })} className="w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={keywords} onChange={e => setKeywords(e.target.value)} />
                </div>
                <div>
                  <div className="text-xs mb-1">{t('meta.dates')}</div>
                  <select className="w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={dateStrategy} onChange={e => setDateStrategy(e.target.value)}>
                    <option value="keep">{t('meta.date.keep')}</option>
                    <option value="now">{t('meta.date.now')}</option>
                    <option value="offset">{t('meta.date.offset')}</option>
                  </select>
                </div>
                <div>
                  <div className="text-xs mb-1">{t('meta.offsetMinutes')}</div>
                  <input type="number" className="w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={dateOffsetMinutes} onChange={e => setDateOffsetMinutes(e.target.value)} />
                </div>
                <div className="md:col-span-2 flex flex-wrap items-center gap-4 mt-2">
                  <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={removeGps} onChange={e => setRemoveGps(e.target.checked)} /> {t('meta.removeGps')}</label>
                  <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={uniqueId} onChange={e => setUniqueId(e.target.checked)} /> {t('meta.uniqueId')}</label>
                  <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={removeAllMeta} onChange={e => setRemoveAllMeta(e.target.checked)} /> {t('meta.removeAll')}</label>
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-white/10 my-5" />

          <div className="text-sm font-semibold mb-3">{t('fake.title')}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 flex items-center justify-end">
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={fakeMeta} onChange={e => setFakeMeta(e.target.checked)} /> {t('fake.enable')}</label>
            </div>

            {!renderFakeBelow && (
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 rounded bg-slate-900/40 border border-white/5">
              <div>
                <div className="text-[10px] opacity-60 mb-1">{t('fake.who')}</div>
                <div className="text-xs">{t('meta.author')}: <span className="opacity-80">{author || '—'}</span></div>
                <div className="text-xs">{t('meta.owner')}: <span className="opacity-80">{owner || '—'}</span></div>
                <div className="text-xs">Email: <span className="opacity-80">{contactEmail || '—'}</span></div>
              </div>
              <div>
                <div className="text-[10px] opacity-60 mb-1">{t('fake.device')}</div>
                <div className="text-xs">{fakeMake || t('fake.make')} • {fakeModel || t('fake.model')}</div>
                <div className="text-xs">{fakeLens || t('fake.lens')}</div>
                <div className="text-[10px] opacity-60 mt-1">{t('fake.profile')}: {fakeProfile}</div>
              </div>
              <div>
                <div className="text-[10px] opacity-60 mb-1">{t('fake.contacts')}</div>
                <div className="text-xs">{t('fake.site')}: <span className="opacity-80">{website || '—'}</span></div>
                <div className="text-xs">{t('fake.software')}: <span className="opacity-80">{fakeSoftware || creatorTool || '—'}</span></div>
              </div>
            </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2">
              <label className="text-xs">{t('fake.make')}
                <select className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeMake} onChange={e => setFakeMake(e.target.value)} disabled={!fakeMeta}>
                  {makeOptions.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <label className="text-xs">{t('fake.model')}
                <select className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeModel} onChange={e => setFakeModel(e.target.value)} disabled={!fakeMeta}>
                  {modelOptions.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <label className="text-xs">{t('fake.lens')}
                <select className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeLens} onChange={e => setFakeLens(e.target.value)} disabled={!fakeMeta}>
                  {lensOptions.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <label className="text-xs">{t('fake.softwareLabel')}
                <select className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeSoftware} onChange={e => setFakeSoftware(e.target.value)} disabled={!fakeMeta}>
                  {SOFTWARE_PRESETS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <label className="text-xs">{t('fake.serial')}
                <select className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeSerial} onChange={e => setFakeSerial(e.target.value)} disabled={!fakeMeta}>
                  {SERIAL_PRESETS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <div className="col-span-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={fakePerFile} onChange={e => setFakePerFile(e.target.checked)} disabled={!fakeMeta} /> {t('fake.perFile')}</label>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={fakeGps} onChange={e => setFakeGps(e.target.checked)} disabled={!fakeMeta} /> {t('fake.gps')}</label>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={fakeAuto} onChange={e => setFakeAuto(e.target.checked)} disabled={!fakeMeta} /> {t('fake.auto')}</label>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={onlineAuto} onChange={e => setOnlineAuto(e.target.checked)} disabled={!fakeMeta} /> {t('fake.online')}</label>
              </div>
              <label className="text-xs">{t('fake.profile')}
                <select className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeProfile} onChange={e => setFakeProfile(e.target.value)} disabled={!fakeMeta}>
                  <option value="camera">Камера</option>
                  <option value="phone">Смартфон</option>
                  <option value="action">Экшн‑камера</option>
                  <option value="drone">Дрон</option>
                  <option value="scanner">Сканер</option>
                </select>
              </label>
              <label className="text-xs">{t('fake.location')}
                <select className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={locationPreset} onChange={e => setLocationPreset(e.target.value)} disabled={!fakeMeta}>
                  {LOCATION_PRESETS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>
              </label>
              <div />
              <label className="text-xs">{t('fake.lat')}
                <input type="number" step="0.000001" className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeLat} onChange={e => setFakeLat(e.target.value)} placeholder="оставь пусто для случайного" disabled={!fakeMeta || !fakeGps} />
              </label>
              <label className="text-xs">{t('fake.lon')}
                <input type="number" step="0.000001" className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeLon} onChange={e => setFakeLon(e.target.value)} placeholder="оставь пусто для случайного" disabled={!fakeMeta || !fakeGps} />
              </label>
              <label className="text-xs">{t('fake.alt')}
                <input type="number" step="1" className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeAltitude} onChange={e => setFakeAltitude(e.target.value)} placeholder="м" disabled={!fakeMeta || !fakeGps} />
              </label>
              <label className="text-xs">{t('fake.iso')}
                <select className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeIso} onChange={e => setFakeIso(e.target.value)} disabled={!fakeMeta}>
                  <option value="">—</option>
                  {ISO_PRESETS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <label className="text-xs">{t('fake.exposure')}
                <select className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeExposureTime} onChange={e => setFakeExposureTime(e.target.value)} disabled={!fakeMeta}>
                  <option value="">—</option>
                  {EXPOSURE_TIMES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <label className="text-xs">{t('fake.fnumber')}
                <select className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeFNumber} onChange={e => setFakeFNumber(e.target.value)} disabled={!fakeMeta}>
                  <option value="">—</option>
                  {FNUMBERS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <label className="text-xs">{t('fake.focal')}
                <select className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeFocalLength} onChange={e => setFakeFocalLength(e.target.value)} disabled={!fakeMeta}>
                  <option value="">—</option>
                  {FOCALS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <label className="text-xs">{t('fake.program')}
                <select className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeExposureProgram} onChange={e => setFakeExposureProgram(e.target.value)} disabled={!fakeMeta}>
                  <option value="">—</option>
                  {EXPOSURE_PROGRAMS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
                </select>
              </label>
              <label className="text-xs">{t('fake.metering')}
                <select className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeMeteringMode} onChange={e => setFakeMeteringMode(e.target.value)} disabled={!fakeMeta}>
                  <option value="">—</option>
                  {METERING_MODES.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
                </select>
              </label>
              <label className="text-xs">{t('fake.flash')}
                <select className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeFlash} onChange={e => setFakeFlash(e.target.value)} disabled={!fakeMeta}>
                  <option value="">—</option>
                  {FLASH_MODES.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
                </select>
              </label>
              <label className="text-xs">{t('fake.whiteBalance')}
                <select className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeWhiteBalance} onChange={e => setFakeWhiteBalance(e.target.value)} disabled={!fakeMeta}>
                  <option value="">—</option>
                  {WHITE_BALANCES.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
                </select>
              </label>
              <label className="text-xs">{t('fake.colorSpace')}
                <select className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeColorSpace} onChange={e => setFakeColorSpace(e.target.value)} disabled={!fakeMeta}>
                  <option value="">—</option>
                  {COLOR_SPACES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <label className="text-xs">{t('fake.rating')}
                <select className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeRating} onChange={e => setFakeRating(e.target.value)} disabled={!fakeMeta}>
                  <option value="">—</option>
                  {RATINGS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <label className="text-xs">{t('fake.label')}
                <select className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeLabel} onChange={e => setFakeLabel(e.target.value)} disabled={!fakeMeta}>
                  <option value="">—</option>
                  {LABELS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <label className="text-xs">{t('fake.titleField')}
                <input className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeTitle} onChange={e => setFakeTitle(e.target.value)} disabled={!fakeMeta} />
              </label>
              <label className="text-xs">{t('fake.city')}
                <input className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeCity} onChange={e => setFakeCity(e.target.value)} disabled={!fakeMeta} />
              </label>
              <label className="text-xs">{t('fake.state')}
                <input className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeState} onChange={e => setFakeState(e.target.value)} disabled={!fakeMeta} />
              </label>
              <label className="text-xs">{t('fake.country')}
                <input className="mt-1 w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={fakeCountry} onChange={e => setFakeCountry(e.target.value)} disabled={!fakeMeta} />
              </label>
            </div>
          </div>
        </section>

        <section className="col-span-12 lg:col-span-6 glass rounded-xl p-4 sm:p-5 border border-white/10">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <select className="bg-slate-900 border border-white/10 rounded px-2 py-2 text-xs" value={filterExt} onChange={e=>setFilterExt(e.target.value)}>
                <option value="all">All</option>
                <option value="jpg">JPG</option>
                <option value="png">PNG</option>
                <option value="webp">WEBP</option>
                <option value="avif">AVIF</option>
                <option value="tif">TIF</option>
              </select>
              <input placeholder="search..." className="bg-slate-900 border border-white/10 rounded px-2 py-2 text-xs w-40" value={searchFiles} onChange={e=>setSearchFiles(e.target.value)} />
              <select className="bg-slate-900 border border-white/10 rounded px-2 py-2 text-xs" value={sortBy} onChange={e=>setSortBy(e.target.value)}>
                <option value="name">Name</option>
                <option value="size">Size</option>
                <option value="date">Date</option>
              </select>
              <select className="bg-slate-900 border border-white/10 rounded px-2 py-2 text-xs" value={sortDir} onChange={e=>setSortDir(e.target.value)}>
                <option value="asc">Asc</option>
                <option value="desc">Desc</option>
              </select>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={handleAdd} className="px-3 py-2 rounded bg-brand-600 hover:bg-brand-500 flex items-center gap-2"><IconPlus className="w-4 h-4" />{t('buttons.addFiles')}</button>
              <button onClick={addFolder} className="px-3 py-2 rounded bg-brand-700 hover:bg-brand-600 flex items-center gap-2"><IconFolderOpen className="w-4 h-4" />{t('buttons.addFolder')}</button>
              <button onClick={handleClear} className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700">{t('buttons.clear')}</button>
              {!busy && <button disabled={!canStart} onClick={start} className={`px-3 py-2 rounded flex items-center gap-2 ${canStart ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-900 opacity-50 cursor-not-allowed'}`}><IconPlay className="w-4 h-4 fill-current" />{t('buttons.start')}</button>}
              {busy && <button onClick={cancel} className="px-3 py-2 rounded bg-rose-600 hover:bg-rose-500 flex items-center gap-2"><IconStop className="w-4 h-4" />{t('buttons.cancel')}</button>}
            </div>
          </div>

          {activeTab === 'files' && (
            <>
              <div ref={gridRef} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[60vh] sm:max-h-[520px] overflow-auto pr-2 relative" onDrop={onDrop} onDragOver={onDragOver}
                onMouseDown={e=>{ if (e.target !== e.currentTarget) return; setDragSelecting(true); dragStartRef.current={x:e.nativeEvent.offsetX,y:e.nativeEvent.offsetY}; setDragRect({x:e.nativeEvent.offsetX,y:e.nativeEvent.offsetY,w:0,h:0}) }}
                onMouseMove={e=>{ if (!dragSelecting) return; const start=dragStartRef.current; const rect={ x:Math.min(start.x,e.nativeEvent.offsetX), y:Math.min(start.y,e.nativeEvent.offsetY), w:Math.abs(e.nativeEvent.offsetX-start.x), h:Math.abs(e.nativeEvent.offsetY-start.y)}; setDragRect(rect) }}
                onMouseUp={()=>{ setDragSelecting(false); setDragRect(null) }}>
                {files
                  .filter(p=>{
                    if (filterExt !== 'all') { const ext = (p.split('.').pop()||'').toLowerCase(); if (ext !== filterExt && !(filterExt==='tif' && (ext==='tif'||ext==='tiff'))) return false }
                    if (searchFiles.trim()) { const q = searchFiles.trim().toLowerCase(); if (!p.toLowerCase().includes(q)) return false }
                    return true
                  })
                  .sort((a,b)=>{
                    if (sortBy==='name') return sortDir==='asc' ? a.localeCompare(b) : b.localeCompare(a)
                    const sa = statsByPath[a] || {}; const sb = statsByPath[b] || {}
                    if (sortBy==='size') return sortDir==='asc' ? (sa.sizeBytes||0)-(sb.sizeBytes||0) : (sb.sizeBytes||0)-(sa.sizeBytes||0)
                    if (sortBy==='date') return sortDir==='asc' ? (sa.mtimeMs||0)-(sb.mtimeMs||0) : (sb.mtimeMs||0)-(sa.mtimeMs||0)
                    return 0
                  })
                  .map((p, i) => (
                  <div key={p + i} className={`group bg-slate-900/60 rounded-md overflow-hidden border ${selectedIdx.has(i)?'border-brand-600 ring-1 ring-brand-600/40':'border-white/5'} relative cv-auto`} onClick={e=>{
                    if (e.shiftKey && lastSelectedIndex>=0) {
                      const [a,b] = [Math.min(lastSelectedIndex,i), Math.max(lastSelectedIndex,i)]
                      setSelectedIdx(prev=>{ const n=new Set(prev); for(let k=a;k<=b;k++) n.add(k); return n })
                    } else if (e.metaKey || e.ctrlKey) {
                      setSelectedIdx(prev=>{ const n=new Set(prev); if (n.has(i)) n.delete(i); else n.add(i); return n })
                      setLastSelectedIndex(i)
                    } else {
                      setSelectedIdx(new Set([i])); setLastSelectedIndex(i)
                    }
                  }}>
                    <button className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 flex items-center justify-center gap-3" onClick={()=>{ setPreviewSrc(toFileUrl(p)); setPreviewOpen(true) }} aria-label="preview image">
                      <span className="inline-flex items-center gap-1 text-xs bg-slate-900/70 border border-white/10 px-2 py-1 rounded"><IconEye className="w-3.5 h-3.5" />Preview</span>
                      <span className="inline-flex items-center gap-1 text-xs bg-slate-900/70 border border-white/10 px-2 py-1 rounded" onClick={(e)=>{ e.stopPropagation(); setFiles(prev => prev.filter((_, idx) => idx !== i)); setSelectedIdx(prev=>{ const n=new Set(prev); n.delete(i); return n }) }}><IconTrash className="w-3.5 h-3.5" />Remove</span>
                    </button>
                    <label className="absolute top-2 left-2 z-20 inline-flex items-center gap-1 text-[10px] px-1.5 py-1 rounded bg-slate-950/70 border border-white/10 cursor-pointer">
                      <input type="checkbox" className="accent-brand-600" checked={selectedIdx.has(i)} onChange={e=>{ setSelectedIdx(prev=>{ const n = new Set(prev); if (e.target.checked) n.add(i); else n.delete(i); return n }) }} aria-label="select file" />
                      <span>Select</span>
                    </label>
                    <div className="h-32 sm:h-40 bg-slate-900 flex items-center justify-center overflow-hidden">
                      <img loading="lazy" decoding="async" alt="file" className="max-h-32 sm:max-h-40 transition-transform group-hover:scale-[1.02]" src={toFileUrl(p)} />
                      {progress.lastFile===p && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                          <div className="h-1 bg-brand-600" style={{ width: `${Math.max(0, Math.min(100, Math.round(progress.percent||0)))}%` }} />
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] p-2 truncate opacity-80 flex items-center gap-2" title={p} onContextMenu={e=>{ e.preventDefault(); setCtxMenu({ open: true, x: e.clientX, y: e.clientY, path: p, index: i }) }}>
                      <span className="flex-1 truncate" onMouseEnter={async()=>{ if (!statsByPath[p]) { try { const r = await window.api.fileStats(p); if (r && r.ok) setStatsByPath(prev=>({ ...prev, [p]: r.stats })) } catch (_) {} } }}>{p}</span>
                      <button className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700" onClick={(e)=>{ e.stopPropagation(); setDetailsPath(p); try { window.api.native && window.api.native.computeFileHash && window.api.native.computeFileHash(p).then(h=>setDetailsHash(String(h||''))) } catch (_) {} }}>Info</button>
                    </div>
                  </div>
                ))}
                {dragRect && (
                  <div className="absolute border border-brand-600/60 bg-brand-600/10" style={{ left: dragRect.x, top: dragRect.y, width: dragRect.w, height: dragRect.h }} />
                )}
              </div>
              {ctxMenu.open && (
                <div className="ctx-menu" style={{ left: ctxMenu.x, top: ctxMenu.y }} onMouseLeave={()=>setCtxMenu(v=>({ ...v, open: false }))}>
                  <div className="ctx-item" onClick={()=>{ setPreviewSrc(toFileUrl(ctxMenu.path)); setPreviewOpen(true); setCtxMenu(v=>({ ...v, open: false })) }}>Preview</div>
                  <div className="ctx-item" onClick={()=>{ window.api.showInFolder(ctxMenu.path); setCtxMenu(v=>({ ...v, open: false })) }}>Open in folder</div>
                  <div className="ctx-item" onClick={async()=>{ const base = prompt('New name', (ctxMenu.path.split('\\').pop()||ctxMenu.path.split('/').pop()||'').replace(/\.[^.]+$/, '')); if (!base) return; const r = await window.api.renameFile(ctxMenu.path, base); if (r && r.ok) { setFiles(prev=>prev.map(p=>p===ctxMenu.path?r.path:p)) } setCtxMenu(v=>({ ...v, open: false })) }}>Rename</div>
                  <div className="ctx-item" onClick={async()=>{ await window.api.deleteFile(ctxMenu.path); setFiles(prev=>prev.filter(p=>p!==ctxMenu.path)); setCtxMenu(v=>({ ...v, open: false })) }}>Delete</div>
                </div>
              )}
              <div className="mt-2 flex items-center gap-2">
                <div className="text-xs opacity-80">Selected: {selectedIdx.size}</div>
                <button disabled={!selectedIdx.size} onClick={()=>{
                  const keep = new Set(selectedIdx)
                  setFiles(prev=>prev.filter((_, idx)=>!keep.has(idx)))
                  setSelectedIdx(new Set())
                }} className={`px-2 py-1 rounded text-xs ${selectedIdx.size? 'bg-rose-600 hover:bg-rose-500' : 'bg-slate-800 opacity-50 cursor-not-allowed'}`}>Remove selected</button>
                <button disabled={!selectedIdx.size} onClick={()=>{
                  const keep = new Set(selectedIdx)
                  setSelectedIdx(new Set())
                  window.api && window.api.showInFolder && files.forEach((p, idx)=>{ if (keep.has(idx)) try { window.api.showInFolder(p) } catch (_) {} })
                }} className={`px-2 py-1 rounded text-xs ${selectedIdx.size? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-800 opacity-50 cursor-not-allowed'}`}>Open selected</button>
              </div>
              
            </>
          )}

          {activeTab === 'ready' && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[60vh] sm:max-h-[600px] overflow-auto pr-2">
              {results.map((r, i) => (
                <div key={r.out + i} className="group bg-slate-900/60 rounded-md overflow-hidden border border-white/5 relative">
                  <button className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 flex items-center justify-center gap-3" onClick={()=>{ setPreviewSrc(toFileUrl(r.out)); setPreviewOpen(true) }}>
                    <span className="inline-flex items-center gap-1 text-xs bg-slate-900/70 border border-white/10 px-2 py-1 rounded"><IconEye className="w-3.5 h-3.5" />Preview</span>
                    <span className="inline-flex items-center gap-1 text-xs bg-slate-900/70 border border-white/10 px-2 py-1 rounded" onClick={(e)=>{ e.stopPropagation(); window.api.showInFolder(r.out) }}><IconOpenExternal className="w-3.5 h-3.5" />Папка</span>
                  </button>
                  <div className="h-32 sm:h-40 bg-slate-900 flex items-center justify-center overflow-hidden">
                    <img loading="lazy" decoding="async" alt="result" className="max-h-32 sm:max-h-40 transition-transform group-hover:scale-[1.02]" src={toFileUrl(r.out)} />
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
              <div className="col-span-12 flex items-center gap-2 flex-wrap">
                <button onClick={chooseTxtFile} className="px-3 py-2 rounded bg-brand-600 hover:bg-brand-500 flex items-center gap-2"><IconFile className="w-4 h-4" />Выбрать TXT</button>
                {txtPath && <div className="text-xs opacity-80 truncate" title={txtPath}>{txtPath}</div>}
                <div className="ml-auto flex items-center gap-2">
                  <input placeholder="поиск по ID/имени" className="bg-slate-900 border border-white/10 rounded px-2 py-2 text-xs w-56" value={search} onChange={e=>setSearch(e.target.value)} />
                  <label className="flex items-center gap-2 text-xs opacity-80"><input type="checkbox" checked={autoParse} onChange={e=>setAutoParse(e.target.checked)} /> Автоконверт</label>
                  <button onClick={parseTxt} className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500 flex items-center gap-2"><IconPlay className="w-4 h-4 fill-current" />Конвертировать</button>
                  <button onClick={saveJson} disabled={!jsonPreview} className={`px-3 py-2 rounded flex items-center gap-2 ${jsonPreview ? 'bg-sky-600 hover:bg-sky-500' : 'bg-slate-800 opacity-50 cursor-not-allowed'}`}><IconDownload className="w-4 h-4" />Сохранить общий JSON</button>
                  <button onClick={saveJsonPerProfile} disabled={!profiles.length} className={`px-3 py-2 rounded flex items-center gap-2 ${profiles.length ? 'bg-sky-700 hover:bg-sky-600' : 'bg-slate-800 opacity-50 cursor-not-allowed'}`}><IconDownload className="w-4 h-4" />Сохранить по профилям</button>
                  <button onClick={saveCookiesJson} disabled={!profiles.length} className={`px-3 py-2 rounded flex items-center gap-2 ${profiles.length ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-slate-800 opacity-50 cursor-not-allowed'}`}><IconDownload className="w-4 h-4" />Куки одним JSON</button>
                  <button onClick={saveCookiesPerProfile} disabled={!profiles.length} className={`px-3 py-2 rounded flex items-center gap-2 ${profiles.length ? 'bg-indigo-700 hover:bg-indigo-600' : 'bg-slate-800 opacity-50 cursor-not-allowed'}`}><IconDownload className="w-4 h-4" />Куки по профилям</button>
                </div>
              </div>
              <div className="col-span-12 md:col-span-4">
                <div className="text-xs mb-1 flex items-center justify-between">
                  <span>Профили</span>
                  {!!profiles.length && (
                    <span className="flex items-center gap-2">
                      <button onClick={selectAllProfiles} className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700">Выделить все</button>
                      <button onClick={clearAllProfiles} className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700">Снять</button>
                    </span>
                  )}
                </div>
                <div className="h-72 md:h-[460px] overflow-auto bg-slate-900 border border-white/10 rounded">
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
              <div className="col-span-12 md:col-span-4" onDrop={async e=>{
                e.preventDefault()
                const items = Array.from(e.dataTransfer.files || [])
                const txt = items.find(f=>{ const p = String(f.path||'').toLowerCase(); return p.endsWith('.txt') || p.endsWith('.log') || p.endsWith('.json') })
                if (txt && txt.path) {
                  try {
                    const r = await window.api.readTextFileByPath(txt.path).catch(()=>({ok:false}))
                    if (r && r.ok) {
                      setTxtPath(r.path || '')
                      setTxtContent(r.content || '')
                    }
                  } catch (_) {}
                }
              }} onDragOver={e=>e.preventDefault()}>
                <div className="text-xs mb-1">Исходный TXT</div>
                <textarea className="w-full h-64 md:h-[460px] bg-slate-900 border border-white/10 rounded p-2 text-xs" value={txtContent} onChange={e => setTxtContent(e.target.value)} />
              </div>
              <div className="col-span-12 md:col-span-4">
                <div className="text-xs mb-1">JSON предпросмотр</div>
                <textarea className="w-full h-64 md:h-[460px] bg-slate-900 border border-white/10 rounded p-2 text-xs" value={jsonPreview} onChange={e => setJsonPreview(e.target.value)} />
              </div>
            </div>
          )}

          {activeTab === 'indigo' && (
            <div className="p-4 rounded bg-slate-900/60 border border-white/10 text-slate-200 text-sm">
              <div className="text-sm font-semibold mb-2">Indigo — экспорт настроек профилей</div>
              <ol className="list-decimal ml-5 text-xs opacity-90 space-y-1">
                <li>Открой Indigo и список профилей</li>
                <li>Нажми Ctrl+Shift+I, открой вкладку Console</li>
                <li>Скопируй код ниже, впиши allow pasting вставь в консоль и нажми Enter</li>
              </ol>
              <div className="mt-3 flex items-center gap-2">
                <button onClick={async()=>{
                  const txt = indigoScript
                  try { await navigator.clipboard.writeText(txt) }
                  catch {
                    try {
                      const ta = document.createElement('textarea')
                      ta.value = txt
                      ta.style.position = 'fixed'
                      ta.style.left = '-9999px'
                      document.body.appendChild(ta)
                      ta.focus(); ta.select()
                      document.execCommand('copy')
                      document.body.removeChild(ta)
                    } catch (_) {}
                  }
                }} className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs">Копировать код</button>
                <button onClick={()=>{ try { if (indigoCodeRef.current) { indigoCodeRef.current.focus(); indigoCodeRef.current.select() } } catch (_) {} }} className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs">Выделить всё</button>
                <button onClick={()=>{
                  try {
                    const blob = new Blob([indigoScript], { type: 'text/javascript;charset=utf-8' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = 'indigo-script.js'
                    document.body.appendChild(a)
                    a.click()
                    setTimeout(()=>{ URL.revokeObjectURL(url); a.remove() }, 500)
                  } catch (_) {}
                }} className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs">Скачать .js</button>
              </div>
              <textarea ref={indigoCodeRef} spellCheck={false} wrap="off" className="mt-2 w-full h-64 bg-slate-950 border border-white/10 rounded p-2 text-[11px] leading-4 font-mono" readOnly value={indigoScript} />
            </div>
          )}

          {activeTab === 'vision' && (
            <div className="p-4 rounded bg-slate-900/60 border border-white/10 text-slate-200 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs mb-1">Токен</div>
                  <input className="w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={visionToken} onChange={e => setVisionToken(e.target.value)} placeholder="Bearer ..." />
                </div>
                <div>
                  <div className="text-xs mb-1">Endpoint (опционально)</div>
                  <input className="w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={visionEndpoint} onChange={e => setVisionEndpoint(e.target.value)} placeholder="https://api.example.com/me" />
                </div>
                <div className="md:col-span-2 flex items-center gap-2">
                  <button onClick={checkVision} disabled={!visionToken || visionBusy} className={`px-3 py-2 rounded ${visionToken && !visionBusy ? 'bg-violet-600 hover:bg-violet-500' : 'bg-slate-800 opacity-50 cursor-not-allowed'}`}>{visionBusy ? 'Проверка…' : 'Проверить'}</button>
                  {visionResult && (
                    <div className={`text-xs ${visionResult.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {visionResult.ok ? 'Доступ есть' : 'Нет доступа'} {typeof visionResult.status === 'number' ? `• ${visionResult.status}` : ''} {visionResult.error ? `• ${visionResult.error}` : ''} {typeof visionResult.exp === 'number' ? `• ${new Date(visionResult.exp*1000).toLocaleString()}` : ''}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="p-4 rounded bg-slate-900/60 border border-white/10 text-slate-200 text-sm">
              <Chat url={chatUrl} userId={owner || 'YALOKGAR'} userName={author || 'YALOKGAR'} />
            </div>
          )}

        </section>
      </main>
      {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} chatUrl={chatUrl} />}
      {devUnlockOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setDevUnlockOpen(false)} />
          <div className="relative w-80 glass rounded-xl p-4 border border-white/10 bg-slate-900">
            <div className="text-sm font-semibold mb-2">Developer Unlock</div>
            <input
              type="password"
              className="w-full bg-slate-900 border border-white/10 rounded px-2 py-2 text-sm"
              placeholder="Password"
              value={devPassword}
              onChange={e => setDevPassword(e.target.value)}
              onKeyDown={async e => { if (e.key === 'Enter' && devPassword.trim()) {
                setDevUnlockBusy(true); setDevUnlockError('')
                try { const r = await window.api.dev.unlock(devPassword); if (!r || !r.ok) setDevUnlockError('Invalid password') } catch (_) { setDevUnlockError('Invalid password') } finally { setDevUnlockBusy(false) }
              } }}
            />
            <div className="flex items-center gap-2 mt-3">
              <button onClick={() => setDevUnlockOpen(false)} className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-sm">Cancel</button>
              <button
                onClick={async () => {
                  if (!devPassword.trim()) return
                  setDevUnlockBusy(true); setDevUnlockError('')
                  try { const r = await window.api.dev.unlock(devPassword); if (!r || !r.ok) setDevUnlockError('Invalid password') } catch (_) { setDevUnlockError('Invalid password') } finally { setDevUnlockBusy(false) }
                }}
                disabled={!devPassword.trim() || devUnlockBusy}
                className={`px-3 py-2 rounded ${devPassword.trim() && !devUnlockBusy ? 'bg-violet-600 hover:bg-violet-500' : 'bg-slate-800 opacity-50 cursor-not-allowed'} text-sm`}
              >Unlock</button>
              {!!devUnlockError && <div className="text-xs text-rose-400">{devUnlockError}</div>}
            </div>
          </div>
        </div>
      )}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Image preview">
          <div className="absolute inset-0 bg-black/80" onClick={()=>setPreviewOpen(false)} />
          <div className="relative max-w-[90vw] max-h-[90vh] rounded-xl overflow-hidden border border-white/10 bg-slate-900">
            <img alt="preview" src={previewSrc} className="max-w-[90vw] max-h-[90vh]" />
            <button onClick={()=>setPreviewOpen(false)} className="absolute top-2 right-2 px-2 py-1 rounded bg-slate-900/80 border border-white/10 text-xs">Close</button>
          </div>
        </div>
      )}
    </div>
  )
}