import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from './components/Icons'
import { useSpring, animated } from '@react-spring/web'
import { useAppStore } from './store'

function toFileUrl(p: string) {
  let s = p.replace(/\\/g, '/')
  if (!s.startsWith('/')) s = '/' + s
  return encodeURI('file://' + s)
}

type ProfileKind = 'camera'|'phone'|'action'|'drone'|'scanner'

const GEAR_PRESETS: Record<ProfileKind, any> = {
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

const ISO_PRESETS = [50, 64, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6400]
const EXPOSURE_TIMES = ['1/8000', '1/4000', '1/2000', '1/1000', '1/500', '1/250', '1/200', '1/160', '1/125', '1/80', '1/60', '1/30', '1/15', '1/8', '1/4', '1/2', '1', '2', '5', '10']
const FNUMBERS = [1.2, 1.4, 1.8, 2, 2.2, 2.8, 3.5, 4, 5.6, 8, 11, 16, 22]
const FOCALS = [12, 14, 16, 18, 20, 24, 28, 30, 35, 40, 50, 55, 70, 85, 105, 135, 200]
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

const LOCATION_PRESETS = [
  { id: 'none', label: '— Без пресета —' },
  { id: 'kyiv', label: 'Киев, Украина', lat: 50.4501, lon: 30.5234, alt: 179, city: 'Kyiv', state: 'Kyiv', country: 'Ukraine' },
  { id: 'warsaw', label: 'Варшава, Польша', lat: 52.2297, lon: 21.0122, alt: 100, city: 'Warsaw', state: 'Mazovia', country: 'Poland' },
  { id: 'berlin', label: 'Берлин, Германия', lat: 52.52, lon: 13.405, alt: 34, city: 'Berlin', state: 'Berlin', country: 'Germany' },
  { id: 'london', label: 'Лондон, Великобритания', lat: 51.5074, lon: -0.1278, alt: 35, city: 'London', state: 'England', country: 'United Kingdom' }
]

export default function NewApp() {
  const { t } = useTranslation()
  const [active, setActive] = useState<'files'|'ready'>('files')
  const files = useAppStore(s=>s.files)
  const setFiles = useAppStore(s=>s.setFiles)
  const addFiles = useAppStore(s=>s.addFiles)
  const [outputDir, setOutputDir] = useState('')
  const [format, setFormat] = useState<'jpg'|'png'|'webp'|'avif'|'heic'>('jpg')
  const [quality, setQuality] = useState(85)
  const [colorDrift, setColorDrift] = useState(2)
  const [resizeDrift, setResizeDrift] = useState(2)
  const [resizeMaxW, setResizeMaxW] = useState(0)
  const [removeGps, setRemoveGps] = useState(true)
  const [dateStrategy, setDateStrategy] = useState<'now'|'offset'>('now')
  const [dateOffsetMinutes, setDateOffsetMinutes] = useState(0)
  const [uniqueId, setUniqueId] = useState(true)
  const [removeAll, setRemoveAll] = useState(false)
  const [softwareTag, setSoftwareTag] = useState(true)
  const [fake, setFake] = useState(false)
  const [fakeProfile, setFakeProfile] = useState<ProfileKind>('camera')
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
  const [fakePerFile, setFakePerFile] = useState(true)
  const [onlineAuto, setOnlineAuto] = useState(true)
  const [fakeIso, setFakeIso] = useState<number|''>('')
  const [fakeExposureTime, setFakeExposureTime] = useState('')
  const [fakeFNumber, setFakeFNumber] = useState<number|''>('')
  const [fakeFocalLength, setFakeFocalLength] = useState<number|''>('')
  const [fakeExposureProgram, setFakeExposureProgram] = useState<number|''>('')
  const [fakeMeteringMode, setFakeMeteringMode] = useState<number|''>('')
  const [fakeFlash, setFakeFlash] = useState<number|''>('')
  const [fakeWhiteBalance, setFakeWhiteBalance] = useState<number|''>('')
  const [fakeColorSpace, setFakeColorSpace] = useState('')
  const [fakeRating, setFakeRating] = useState<number|''>('')
  const [fakeLabel, setFakeLabel] = useState('')
  const [fakeTitle, setFakeTitle] = useState('')
  const [fakeCity, setFakeCity] = useState('')
  const [fakeState, setFakeState] = useState('')
  const [fakeCountry, setFakeCountry] = useState('')
  const [locationPreset, setLocationPreset] = useState('none')
  const [author, setAuthor] = useState('')
  const [description, setDescription] = useState('')
  const [keywords, setKeywords] = useState('')
  const [copyright, setCopyright] = useState('')
  const [creatorTool, setCreatorTool] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number; lastFile: string; etaMs?: number; speedBps?: number; percent?: number }>({ current: 0, total: 0, lastFile: '' })
  const [results, setResults] = useState<{ src: string; out: string }[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewSrc, setPreviewSrc] = useState('')
  const [metaOpen, setMetaOpen] = useState(false)
  const [metaPayload, setMetaPayload] = useState<any>(null)
  const gridRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const r = await window.api.ui.loadState()
        if (r && r.ok && r.data) {
          const d = r.data as any
          if (Array.isArray(d.files)) setFiles(d.files)
          if (typeof d.outputDir==='string') setOutputDir(d.outputDir)
          if (d.format) setFormat(d.format)
          if (typeof d.quality==='number') setQuality(d.quality)
        }
      } catch {}
    })()
  }, [])

  useEffect(() => {
    try { window.api.ui.saveState({ files, outputDir, format, quality, active }) } catch {}
  }, [files, outputDir, format, quality, active])

  useEffect(() => {
    const p = GEAR_PRESETS[fakeProfile]
    const mk = p.makes[0] || ''
    setFakeMake(mk)
    const md = (p.modelsByMake?.[mk] || [])[0] || ''
    setFakeModel(md)
    const ln = (p.lensesByMake?.[mk] || p.lenses || [])[0] || ''
    setFakeLens(ln)
  }, [fakeProfile])
  useEffect(() => {
    const p = GEAR_PRESETS[fakeProfile]
    const md = (p.modelsByMake?.[fakeMake] || [])[0] || ''
    setFakeModel(md)
    const ln = (p.lensesByMake?.[fakeMake] || p.lenses || [])[0] || ''
    setFakeLens(ln)
  }, [fakeMake])
  useEffect(() => {
    const preset = LOCATION_PRESETS.find(x => x.id === locationPreset) as any
    if (!preset || preset.id === 'none') return
    setFakeLat(String(preset.lat))
    setFakeLon(String(preset.lon))
    setFakeAltitude(String(preset.alt))
    setFakeCity(preset.city || '')
    setFakeState(preset.state || '')
    setFakeCountry(preset.country || '')
  }, [locationPreset])

  useEffect(() => {
    const off = window.api.onProgress(d => {
      setProgress({ current: d.index + 1, total: d.total, lastFile: d.file, etaMs: Number(d.etaMs||0), speedBps: Number(d.speedBps||0), percent: Number(d.percent)||0 })
      if (d && d.status === 'ok' && d.outPath) setResults(prev => [...prev, { src: d.file, out: d.outPath }])
    })
    const done = window.api.onComplete(() => { setBusy(false); setActive('ready') })
    return () => { off(); done() }
  }, [])

  useEffect(() => {
    try {
      const off = window.api.onOsOpenFiles(async (list) => {
        if (Array.isArray(list) && list.length) {
          try { const expanded = await window.api.expandPaths(list); if (expanded && expanded.length) addFiles(expanded) } catch {}
        }
      })
      return () => { try { off && off() } catch {} }
    } catch {}
  }, [])

  const canStart = useMemo(() => files.length > 0 && outputDir && !busy, [files, outputDir, busy])

  const selectImages = async () => {
    const paths = await window.api.selectImages()
    if (!paths || !paths.length) return
    addFiles(paths)
  }
  const selectFolder = async () => {
    const paths = await window.api.selectImageDir()
    if (!paths || !paths.length) return
    addFiles(paths)
  }
  const selectOutput = async () => {
    const dir = await window.api.selectOutputDir()
    if (dir) setOutputDir(dir)
  }
  const clearFiles = () => {
    setFiles([])
    setProgress({ current: 0, total: 0, lastFile: '' })
    setResults([])
    setSelected(new Set())
  }
  const start = async () => {
    if (!canStart) return
    setBusy(true)
    setProgress({ current: 0, total: files.length, lastFile: '', etaMs: 0, speedBps: 0, percent: 0 })
    setResults([])
    const toNum = (v: number|''|string) => { const n = typeof v === 'string' ? parseFloat(v) : v; return Number.isFinite(n as number) ? Number(n) : undefined }
    const payload: any = {
      inputFiles: files,
      outputDir,
      format,
      quality: Number(quality),
      colorDrift: Number(colorDrift),
      resizeDrift: Number(resizeDrift),
      resizeMaxW: Number(resizeMaxW),
      naming: '{name}_{index}.{ext}',
      meta: {
        removeGps,
        dateStrategy,
        dateOffsetMinutes: Number(dateOffsetMinutes),
        uniqueId,
        removeAll,
        softwareTag,
        fake,
        author,
        description,
        keywords: keywords ? keywords.split(',').map(s=>s.trim()).filter(Boolean) : [],
        copyright,
        creatorTool,
        fakeProfile,
        fakeMake,
        fakeModel,
        fakeLens,
        fakeSoftware,
        fakeSerial,
        fakeGps,
        fakeLat: toNum(fakeLat),
        fakeLon: toNum(fakeLon),
        fakeAltitude: toNum(fakeAltitude),
        fakeAuto,
        fakePerFile,
        onlineAuto,
        fakeIso: toNum(fakeIso),
        fakeExposureTime,
        fakeFNumber: toNum(fakeFNumber),
        fakeFocalLength: toNum(fakeFocalLength),
        fakeExposureProgram: toNum(fakeExposureProgram),
        fakeMeteringMode: toNum(fakeMeteringMode),
        fakeFlash: toNum(fakeFlash),
        fakeWhiteBalance: toNum(fakeWhiteBalance),
        fakeColorSpace: fakeColorSpace || undefined,
        fakeRating: toNum(fakeRating),
        fakeLabel: fakeLabel || undefined,
        fakeTitle: fakeTitle || undefined,
        fakeCity: fakeCity || undefined,
        fakeState: fakeState || undefined,
        fakeCountry: fakeCountry || undefined
      }
    }
    await window.api.processImages(payload)
  }
  const cancel = async () => { if (!busy) return; await window.api.cancel() }

  const makeOptions = (GEAR_PRESETS[fakeProfile]?.makes || []) as string[]
  const modelOptions = ((GEAR_PRESETS[fakeProfile]?.modelsByMake?.[fakeMake]) || []) as string[]
  const lensOptions = ((GEAR_PRESETS[fakeProfile]?.lensesByMake?.[fakeMake]) || (GEAR_PRESETS[fakeProfile]?.lenses) || []) as string[]

  return (
    <div className="h-full text-slate-100">
      <animated.div style={useSpring({ from: { opacity: 0, y: 8 }, to: { opacity: 1, y: 0 } })}>
      <div className="px-4 py-3 border-b border-white/10 bg-black/20 backdrop-blur overflow-x-auto with-gutter">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={selectImages} className="btn btn-blue"><Icon name="tabler:files" className="icon" />{t('buttons.addFiles')}</button>
          <button onClick={selectFolder} className="btn btn-green"><Icon name="tabler:folder-plus" className="icon" />{t('buttons.addFolder')}</button>
          <button onClick={clearFiles} className="btn btn-rose">{t('buttons.clear')}</button>
          <button onClick={selectOutput} className="btn btn-amber"><Icon name="mdi:folder-cog-outline" className="icon" />{t('common.pickFolder')}</button>
          {!!outputDir && <div className="text-xs opacity-80 truncate max-w-[320px]">{outputDir}</div>}
          {!busy && <button disabled={!canStart} onClick={start} className={`btn ${canStart? 'btn-violet' : 'bg-emerald-900 opacity-50 cursor-not-allowed'}`}><Icon name="tabler:player-play" className="icon" />{t('buttons.start')}</button>}
          {busy && <button onClick={cancel} className="btn btn-slate"><Icon name="tabler:player-stop" className="icon" />{t('buttons.cancel')}</button>}
        </div>

        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 text-xs">
          <label className="flex flex-col gap-1">
            <span className="opacity-70">{t('format.title', { defaultValue: 'Format' })}</span>
            <select value={format} onChange={e=>setFormat(e.target.value as any)} className="bg-slate-900 border border-white/10 rounded px-2 py-2">
              <option value="jpg">JPG</option>
              <option value="png">PNG</option>
              <option value="webp">WEBP</option>
              <option value="avif">AVIF</option>
              <option value="heic">HEIC</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="opacity-70">{t('quality.title', { defaultValue: 'Quality' })}</span>
            <input type="number" min={1} max={100} value={quality} onChange={e=>setQuality(Number(e.target.value)||0)} className="bg-slate-900 border border-white/10 rounded px-2 py-2" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="opacity-70">{t('drift.color', { defaultValue: 'Color drift %' })}</span>
            <input type="number" min={0} max={10} value={colorDrift} onChange={e=>setColorDrift(Number(e.target.value)||0)} className="bg-slate-900 border border-white/10 rounded px-2 py-2" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="opacity-70">{t('drift.size', { defaultValue: 'Size drift %' })}</span>
            <input type="number" min={0} max={10} value={resizeDrift} onChange={e=>setResizeDrift(Number(e.target.value)||0)} className="bg-slate-900 border border-white/10 rounded px-2 py-2" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="opacity-70">{t('maxWidth.title', { defaultValue: 'Max width' })}</span>
            <input type="number" min={0} value={resizeMaxW} onChange={e=>setResizeMaxW(Number(e.target.value)||0)} className="bg-slate-900 border border-white/10 rounded px-2 py-2" />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={removeGps} onChange={e=>setRemoveGps(e.target.checked)} />{t('meta.removeGps', { defaultValue: 'Remove GPS' })}</label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={uniqueId} onChange={e=>setUniqueId(e.target.checked)} />{t('meta.uniqueId', { defaultValue: 'Unique ID' })}</label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={removeAll} onChange={e=>setRemoveAll(e.target.checked)} />{t('meta.removeAll', { defaultValue: 'Remove all metadata' })}</label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="opacity-70">{t('date.title', { defaultValue: 'Date' })}</span>
            <select value={dateStrategy} onChange={e=>setDateStrategy(e.target.value as any)} className="bg-slate-900 border border-white/10 rounded px-2 py-2">
              <option value="now">{t('meta.date.now', { defaultValue: 'Current time' })}</option>
              <option value="offset">{t('meta.date.offset', { defaultValue: 'Offset' })}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="opacity-70">{t('meta.offsetMinutes', { defaultValue: 'Offset, min' })}</span>
            <input type="number" value={dateOffsetMinutes} onChange={e=>setDateOffsetMinutes(Number(e.target.value)||0)} className="bg-slate-900 border border-white/10 rounded px-2 py-2" />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={softwareTag} onChange={e=>setSoftwareTag(e.target.checked)} />Software</label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={fake} onChange={e=>setFake(e.target.checked)} />Fake</label>
          </div>
        </div>

        {fake && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3 text-xs">
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={fakeAuto} onChange={e=>setFakeAuto(e.target.checked)} />Авто</label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={fakePerFile} onChange={e=>setFakePerFile(e.target.checked)} />Уникально на файл</label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={onlineAuto} onChange={e=>setOnlineAuto(e.target.checked)} />Online дефолты</label>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 text-xs">
              <label className="flex flex-col gap-1"><span className="opacity-70">{t('fake.profile', { defaultValue: 'Profile' })}</span>
                <select value={fakeProfile} onChange={e=>setFakeProfile(e.target.value as ProfileKind)} className="bg-slate-900 border border-white/10 rounded px-2 py-2">
                  <option value="camera">Камера</option>
                  <option value="phone">Телефон</option>
                  <option value="action">Экшн</option>
                  <option value="drone">Дрон</option>
                  <option value="scanner">Сканер</option>
                </select>
              </label>
              <label className="flex flex-col gap-1"><span className="opacity-70">{t('fake.make', { defaultValue: 'Make' })}</span>
                <select value={fakeMake} onChange={e=>setFakeMake(e.target.value)} className="bg-slate-900 border border-white/10 rounded px-2 py-2">
                  {makeOptions.map(x => <option key={x} value={x}>{x}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1"><span className="opacity-70">{t('fake.model', { defaultValue: 'Model' })}</span>
                <select value={fakeModel} onChange={e=>setFakeModel(e.target.value)} className="bg-slate-900 border border-white/10 rounded px-2 py-2">
                  {modelOptions.map(x => <option key={x} value={x}>{x}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1"><span className="opacity-70">{t('fake.lens', { defaultValue: 'Lens' })}</span>
                <select value={fakeLens} onChange={e=>setFakeLens(e.target.value)} className="bg-slate-900 border border-white/10 rounded px-2 py-2">
                  {lensOptions.map(x => <option key={x} value={x}>{x}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1"><span className="opacity-70">Software</span><input value={fakeSoftware} onChange={e=>setFakeSoftware(e.target.value)} className="bg-slate-900 border border-white/10 rounded px-2 py-2" /></label>
              <label className="flex flex-col gap-1"><span className="opacity-70">Serial</span><input value={fakeSerial} onChange={e=>setFakeSerial(e.target.value)} className="bg-slate-900 border border-white/10 rounded px-2 py-2" /></label>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 text-xs">
              <label className="flex flex-col gap-1"><span className="opacity-70">ISO</span>
                <select value={String(fakeIso)} onChange={e=>setFakeIso(e.target.value ? Number(e.target.value) : '')} className="bg-slate-900 border border-white/10 rounded px-2 py-2">
                  <option value="">—</option>
                  {ISO_PRESETS.map(x => <option key={x} value={x}>{x}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1"><span className="opacity-70">{t('fake.exposure', { defaultValue: 'Shutter' })}</span>
                <select value={fakeExposureTime} onChange={e=>setFakeExposureTime(e.target.value)} className="bg-slate-900 border border-white/10 rounded px-2 py-2">
                  <option value="">—</option>
                  {EXPOSURE_TIMES.map(x => <option key={x} value={x}>{x}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1"><span className="opacity-70">{t('fake.fnumber', { defaultValue: 'Aperture (f/)' })}</span>
                <select value={String(fakeFNumber)} onChange={e=>setFakeFNumber(e.target.value ? Number(e.target.value) : '')} className="bg-slate-900 border border-white/10 rounded px-2 py-2">
                  <option value="">—</option>
                  {FNUMBERS.map(x => <option key={x} value={x}>{x}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1"><span className="opacity-70">{t('fake.focal', { defaultValue: 'Focal (mm)' })}</span>
                <select value={String(fakeFocalLength)} onChange={e=>setFakeFocalLength(e.target.value ? Number(e.target.value) : '')} className="bg-slate-900 border border-white/10 rounded px-2 py-2">
                  <option value="">—</option>
                  {FOCALS.map(x => <option key={x} value={x}>{x}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1"><span className="opacity-70">{t('fake.program', { defaultValue: 'Exposure program' })}</span>
                <select value={String(fakeExposureProgram)} onChange={e=>setFakeExposureProgram(e.target.value ? Number(e.target.value) : '')} className="bg-slate-900 border border-white/10 rounded px-2 py-2">
                  <option value="">—</option>
                  {EXPOSURE_PROGRAMS.map(x => <option key={x.v} value={x.v}>{x.label}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1"><span className="opacity-70">{t('fake.metering', { defaultValue: 'Metering mode' })}</span>
                <select value={String(fakeMeteringMode)} onChange={e=>setFakeMeteringMode(e.target.value ? Number(e.target.value) : '')} className="bg-slate-900 border border-white/10 rounded px-2 py-2">
                  <option value="">—</option>
                  {METERING_MODES.map(x => <option key={x.v} value={x.v}>{x.label}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1"><span className="opacity-70">{t('fake.flash', { defaultValue: 'Flash' })}</span>
                <select value={String(fakeFlash)} onChange={e=>setFakeFlash(e.target.value ? Number(e.target.value) : '')} className="bg-slate-900 border border-white/10 rounded px-2 py-2">
                  <option value="">—</option>
                  {FLASH_MODES.map(x => <option key={x.v} value={x.v}>{x.label}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1"><span className="opacity-70">{t('fake.whiteBalance', { defaultValue: 'White balance' })}</span>
                <select value={String(fakeWhiteBalance)} onChange={e=>setFakeWhiteBalance(e.target.value ? Number(e.target.value) : '')} className="bg-slate-900 border border-white/10 rounded px-2 py-2">
                  <option value="">—</option>
                  {WHITE_BALANCES.map(x => <option key={x.v} value={x.v}>{x.label}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1"><span className="opacity-70">{t('fake.colorSpace', { defaultValue: 'Color space' })}</span>
                <select value={fakeColorSpace} onChange={e=>setFakeColorSpace(e.target.value)} className="bg-slate-900 border border-white/10 rounded px-2 py-2">
                  <option value="">—</option>
                  {COLOR_SPACES.map(x => <option key={x} value={x}>{x}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1"><span className="opacity-70">{t('fake.rating', { defaultValue: 'Rating' })}</span>
                <select value={String(fakeRating)} onChange={e=>setFakeRating(e.target.value ? Number(e.target.value) : '')} className="bg-slate-900 border border-white/10 rounded px-2 py-2">
                  <option value="">—</option>
                  {RATINGS.map(x => <option key={x} value={x}>{x}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 md:col-span-2 xl:col-span-2"><span className="opacity-70">{t('fake.titleField', { defaultValue: 'Title' })}</span><input value={fakeTitle} onChange={e=>setFakeTitle(e.target.value)} className="bg-slate-900 border border-white/10 rounded px-2 py-2" /></label>
              <label className="flex flex-col gap-1 md:col-span-2 xl:col-span-1"><span className="opacity-70">{t('fake.label', { defaultValue: 'Label' })}</span><input value={fakeLabel} onChange={e=>setFakeLabel(e.target.value)} className="bg-slate-900 border border-white/10 rounded px-2 py-2" /></label>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-3 col-span-2 xl:col-span-2">
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={fakeGps} onChange={e=>setFakeGps(e.target.checked)} />GPS</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!locationPreset && locationPreset!=='none'} onChange={e=>{ if (!e.target.checked) setLocationPreset('none') }} />Preset</label>
              </div>
              <label className="flex flex-col gap-1"><span className="opacity-70">Preset</span>
                <select value={locationPreset} onChange={e=>setLocationPreset(e.target.value)} className="bg-slate-900 border border-white/10 rounded px-2 py-2">
                  {LOCATION_PRESETS.map(x => (
                    <option key={x.id} value={x.id}>{x.id==='none' ? t('location.none', { defaultValue: x.label }) : x.label}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1"><span className="opacity-70">Lat</span><input value={fakeLat} onChange={e=>setFakeLat(e.target.value)} placeholder="50.45" className="bg-slate-900 border border-white/10 rounded px-2 py-2" /></label>
              <label className="flex flex-col gap-1"><span className="opacity-70">Lon</span><input value={fakeLon} onChange={e=>setFakeLon(e.target.value)} placeholder="30.52" className="bg-slate-900 border border-white/10 rounded px-2 py-2" /></label>
              <label className="flex flex-col gap-1"><span className="opacity-70">Alt</span><input value={fakeAltitude} onChange={e=>setFakeAltitude(e.target.value)} placeholder="100" className="bg-slate-900 border border-white/10 rounded px-2 py-2" /></label>
              <label className="flex flex-col gap-1"><span className="opacity-70">{t('fake.city', { defaultValue: 'City' })}</span><input value={fakeCity} onChange={e=>setFakeCity(e.target.value)} className="bg-slate-900 border border-white/10 rounded px-2 py-2" /></label>
              <label className="flex flex-col gap-1"><span className="opacity-70">{t('fake.state', { defaultValue: 'Region' })}</span><input value={fakeState} onChange={e=>setFakeState(e.target.value)} className="bg-slate-900 border border-white/10 rounded px-2 py-2" /></label>
              <label className="flex flex-col gap-1"><span className="opacity-70">{t('fake.country', { defaultValue: 'Country' })}</span><input value={fakeCountry} onChange={e=>setFakeCountry(e.target.value)} className="bg-slate-900 border border-white/10 rounded px-2 py-2" /></label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2 text-xs">
              <label className="flex flex-col gap-1"><span className="opacity-70">{t('meta.author', { defaultValue: 'Author' })}</span><input value={author} onChange={e=>setAuthor(e.target.value)} className="bg-slate-900 border border-white/10 rounded px-2 py-2" /></label>
              <label className="flex flex-col gap-1"><span className="opacity-70">{t('meta.description', { defaultValue: 'Description' })}</span><input value={description} onChange={e=>setDescription(e.target.value)} className="bg-slate-900 border border-white/10 rounded px-2 py-2" /></label>
              <label className="flex flex-col gap-1"><span className="opacity-70">{t('meta.keywords', { defaultValue: 'Keywords' })}</span><input value={keywords} onChange={e=>setKeywords(e.target.value)} placeholder="word1, word2" className="bg-slate-900 border border-white/10 rounded px-2 py-2" /></label>
              <label className="flex flex-col gap-1"><span className="opacity-70">Copyright</span><input value={copyright} onChange={e=>setCopyright(e.target.value)} className="bg-slate-900 border border-white/10 rounded px-2 py-2" /></label>
              <label className="flex flex-col gap-1 md:col-span-2 xl:col-span-1"><span className="opacity-70">Creator Tool</span><input value={creatorTool} onChange={e=>setCreatorTool(e.target.value)} className="bg-slate-900 border border-white/10 rounded px-2 py-2" /></label>
            </div>
          </div>
        )}
      </div>
      </animated.div>

      {progress && progress.total > 0 && (
        <div className="px-4 py-2" aria-live="polite">
          <div className="w-full h-2 bg-slate-900 rounded border border-white/10 overflow-hidden sticky top-0">
            <div className="h-2 bg-brand-600 transition-[width] duration-300 ease-out" style={{ width: `${Math.max(0, Math.min(100, Math.round((progress.percent|| (progress.current/Math.max(1,progress.total))*100))))}%` }} />
          </div>
          <div className="text-xs opacity-80 mt-1">
            {busy ? (t('status.processing') || 'Processing…') : (t('status.ready') || 'Ready')} {progress.lastFile ? `• ${progress.lastFile}` : ''}
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-0">
        <aside className="col-span-2 xl:col-span-2 border-r border-white/10 bg-slate-950/40">
          <nav className="p-2 flex flex-col gap-1">
            <button onClick={()=>setActive('files')} className={`nav-btn ${active==='files'?'active':''}`}><span className="inline-flex items-center gap-2"><Icon name="tabler:folders" className="icon" />{t('tabs.files')}</span></button>
            <button onClick={()=>setActive('ready')} className={`nav-btn ${active==='ready'?'active':''}`}><span className="inline-flex items-center gap-2"><Icon name="tabler:checks" className="icon" />{t('tabs.ready')}</span></button>
          </nav>
        </aside>
        <section className="col-span-10 xl:col-span-10 p-4 with-gutter">
          {active==='files' && (
            <animated.div style={useSpring({ from: { opacity: 0 }, to: { opacity: 1 } })} className="space-y-4" ref={gridRef} onDrop={async e=>{ e.preventDefault(); const items = Array.from(e.dataTransfer.files||[]); if (!items.length) return; const paths = items.map(f=>(f as any).path); const expanded = await window.api.expandPaths(paths); if (expanded && expanded.length) addFiles(expanded) }} onDragOver={e=>e.preventDefault()}>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 @[app]:grid-cols-5 @[app]:gap-2">
                {files.map((p, i) => (
                  <div key={p+i} className={`group tile bg-slate-900/60 rounded-md overflow-hidden border ${selected.has(i)?'border-brand-600 ring-1 ring-brand-600/40':'border-white/5'} relative`} onClick={e=>{ if ((e as any).metaKey || (e as any).ctrlKey) { setSelected(prev=>{ const n=new Set(prev); if (n.has(i)) n.delete(i); else n.add(i); return n }) } else { setSelected(new Set([i])) } }}>
                    <div className="h-36 @[app]:h-32 bg-slate-900 flex items-center justify-center overflow-hidden">
                      <img loading="lazy" decoding="async" alt="file" className="max-h-36 @[app]:max-h-32 transition-transform group-hover:scale-[1.02]" src={toFileUrl(p)} />
                    </div>
                    <div className="text-[10px] p-2 truncate opacity-80 flex items-center gap-2" title={p}>
                      <span className="flex-1 truncate">{p}</span>
                      <button className="btn btn-ghost px-2 py-1 text-[10px]" onClick={(e)=>{ e.stopPropagation(); setPreviewSrc(toFileUrl(p)); setPreviewOpen(true) }}>{t('common.preview')}</button>
                      <button className="btn btn-ghost px-2 py-1 text-[10px]" onClick={(e)=>{ e.stopPropagation(); setFiles(prev => prev.filter((_, idx) => idx !== i)); setSelected(prev=>{ const n=new Set(prev); n.delete(i); return n }) }}>{t('common.remove')}</button>
                    </div>
                  </div>
                ))}
              </div>
              {!files.length && <div className="opacity-60 text-xs">{t('files.empty', { defaultValue: 'Add files or drop here' })}</div>}
            </animated.div>
          )}
          {active==='ready' && (
            <animated.div style={useSpring({ from: { opacity: 0 }, to: { opacity: 1 } })} className="space-y-4">
              {!!results.length && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 @[app]:grid-cols-5 @[app]:gap-2">
                  {results.map((r, i) => (
                    <div key={r.out+i} className="group bg-slate-900/60 rounded-md overflow-hidden border border-white/5 relative">
                      <button className="absolute left-0 right-0 top-0 bottom-10 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 flex items-center justify-center gap-3" onClick={()=>{ setPreviewSrc(toFileUrl(r.out)); setPreviewOpen(true) }}>
                        <span className="inline-flex items-center gap-1 text-xs bg-slate-900/70 border border-white/10 px-2 py-1 rounded" onClick={(e)=>{ e.stopPropagation(); setPreviewSrc(toFileUrl(r.out)); setPreviewOpen(true) }}>{t('common.preview')||'Preview'}</span>
                        <span className="inline-flex items-center gap-1 text-xs bg-slate-900/70 border border-white/10 px-2 py-1 rounded" onClick={async (e)=>{ e.stopPropagation(); try { const m = await window.api.metaBeforeAfter(r.src, r.out); const a = await window.api.fileStats(r.out); const b = await window.api.fileStats(r.src); setMetaPayload({ meta: m, afterStats: a, beforeStats: b }); setMetaOpen(true) } catch {} }}>{t('common.info')||'Metadata'}</span>
                        <span className="inline-flex items-center gap-1 text-xs bg-slate-900/70 border border-white/10 px-2 py-1 rounded" onClick={(e)=>{ e.stopPropagation(); window.api.openPath(r.out) }}>{t('common.open')||'Open'}</span>
                      </button>
                      <div className="h-36 bg-slate-900 flex items-center justify-center overflow-hidden">
                        <img loading="lazy" decoding="async" alt="result" className="max-h-36 transition-transform group-hover:scale-[1.02]" src={toFileUrl(r.out)} />
                      </div>
                      <div className="text-[10px] p-2 truncate opacity-80 flex items-center gap-2" title={r.out}>
                        <span className="flex-1 truncate">{r.out}</span>
                        <button className="btn btn-ghost px-2 py-1 text-[10px]" onClick={()=>window.api.showInFolder(r.out)}>{t('common.folder')}</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!results.length && <div className="opacity-60 text-xs">{t('ready.empty')}</div>}
            </animated.div>
          )}
        </section>
      </div>

      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80" onClick={()=>setPreviewOpen(false)} />
          <div className="relative max-w-[90vw] max-h-[90vh] rounded-xl overflow-hidden border border-white/10 bg-slate-900">
            <img alt="preview" src={previewSrc} className="max-w-[90vw] max-h-[90vh]" />
            <button onClick={()=>setPreviewOpen(false)} className="btn btn-ghost absolute top-2 right-2 text-xs">Close</button>
          </div>
        </div>
      )}

      {metaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80" onClick={()=>setMetaOpen(false)} />
          <div className="relative w-[860px] max-w-[95vw] max-h-[90vh] rounded-xl overflow-hidden border border-white/10 bg-slate-900 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold">Metadata Before / After</div>
              <button onClick={()=>setMetaOpen(false)} className="btn btn-ghost text-xs">Close</button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs overflow-auto max-h-[75vh]">
              <div>
                <div className="font-semibold mb-1">Before</div>
                <pre className="bg-slate-950/60 border border-white/10 rounded p-2 whitespace-pre-wrap break-words">{JSON.stringify({
                  ...(metaPayload?.meta?.before||{}),
                  sizeBytes: metaPayload?.beforeStats?.stats?.sizeBytes || 0
                }, null, 2)}</pre>
              </div>
              <div>
                <div className="font-semibold mb-1">After</div>
                <pre className="bg-slate-950/60 border border-white/10 rounded p-2 whitespace-pre-wrap break-words">{JSON.stringify({
                  ...(metaPayload?.meta?.after||{}),
                  sizeBytes: metaPayload?.afterStats?.stats?.sizeBytes || 0
                }, null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}