import React from 'react'
import { Toaster, toast } from 'sonner'
import ModernButton from './components/ModernButton'
import CustomSelect from './components/CustomSelect'
import { FaFolderOpen, FaFolder, FaTrash, FaPlay, FaStop, FaFilm } from 'react-icons/fa'

export default function VideoApp() {
  const [files, setFiles] = React.useState<string[]>([])
  const [outputDir, setOutputDir] = React.useState<string>('')
  const [busy, setBusy] = React.useState(false)
  const [progress, setProgress] = React.useState<{ current: number; total: number; lastFile?: string }>({ current: 0, total: 0 })
  const [mode, setMode] = React.useState<'remux'|'reencode'>('remux')
  const [crf, setCrf] = React.useState<number>(23)
  const [preset, setPreset] = React.useState<string>('veryfast')
  const [audio, setAudio] = React.useState<'copy'|'aac'>('copy')
  const [stripMeta, setStripMeta] = React.useState<boolean>(false)
  const [addComment, setAddComment] = React.useState<boolean>(true)
  const [container, setContainer] = React.useState<'mp4'|'mkv'>('mp4')
  const [suffix, setSuffix] = React.useState<string>('unik')
  const [faststart, setFaststart] = React.useState<boolean>(true)

  React.useEffect(() => {
    const off1 = (window.api as any).onVideoProgress?.((d: any) => setProgress({ current: Number(d?.current) || 0, total: Number(d?.total) || 0, lastFile: String(d?.lastFile || '') }))
    const off2 = (window.api as any).onVideoComplete?.(() => { setBusy(false); toast.success('Готово') })
    return () => { try { off1 && (off1 as any)() } catch {} try { off2 && (off2 as any)() } catch {} }
  }, [])

  React.useEffect(() => {
    (async () => {
      try {
        const r = await (window.api as any).ensureFfmpeg?.()
        if (r && r.ok && r.path) toast.success('FFmpeg готов')
      } catch {}
    })()
  }, [])

  const selectFiles = async () => {
    try {
      const list = await (window.api as any).selectVideos?.()
      if (Array.isArray(list) && list.length) setFiles(prev => Array.from(new Set([...(prev||[]), ...list])))
    } catch {}
  }

  const selectDirFiles = async () => {
    try {
      const list = await (window.api as any).selectVideoDir?.()
      if (Array.isArray(list) && list.length) setFiles(prev => Array.from(new Set([...(prev||[]), ...list])))
    } catch {}
  }

  const pickOutput = async () => {
    try {
      const dir = await window.api.selectOutputDir()
      if (dir) setOutputDir(dir)
    } catch {}
  }

  const start = async () => {
    if (!files.length || !outputDir) { toast.error('Выберите файлы и папку вывода'); return }
    setBusy(true)
    setProgress({ current: 0, total: files.length })
    try {
      const r = await (window.api as any).processVideos?.({ inputFiles: files, outputDir, mode, crf, preset, audio, stripMeta, addComment, faststart, container, suffix })
      if (!r || !r.ok) { setBusy(false); toast.error('Ошибка запуска') }
    } catch (e) {
      setBusy(false)
      toast.error('Ошибка запуска')
    }
  }

  const clearAll = () => setFiles([])
  const cancel = async () => { try { await window.api.cancel() } catch {} setBusy(false) }

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    try {
      const paths = Array.from(e.dataTransfer.files || []).map(f => (f as any).path).filter(Boolean)
      if (paths.length) {
        const exp = await (window.api as any).expandVideoPaths?.(paths)
        const list = Array.isArray(exp) && exp.length ? exp : paths
        setFiles(prev => Array.from(new Set([...(prev||[]), ...list])))
      }
    } catch {}
  }
  const onDragOver = (e: React.DragEvent) => { e.preventDefault() }

  return (
    <div className="p-4 space-y-4" onDrop={onDrop} onDragOver={onDragOver}>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex items-center gap-2 bg-white/5 rounded-xl p-1">
          <ModernButton onClick={selectFiles} size="sm" variant="primary" icon={<FaFilm className="w-4 h-4" />} tilt>
            Выбрать видео
          </ModernButton>
          <ModernButton onClick={selectDirFiles} size="sm" variant="success" icon={<FaFolderOpen className="w-4 h-4" />} tilt>
            Папка с видео
          </ModernButton>
        </div>
        <div className="inline-flex items-center gap-2 bg-white/5 rounded-xl p-1">
          <ModernButton onClick={pickOutput} size="sm" variant="warning" icon={<FaFolder className="w-4 h-4" />}>
            Папка вывода
          </ModernButton>
          <ModernButton onClick={clearAll} size="sm" variant="danger" icon={<FaTrash className="w-4 h-4" />} disabled={busy || files.length===0}>
            Очистить
          </ModernButton>
        </div>
        {!!outputDir && (
          <div className="text-xs opacity-80 truncate max-w-[320px] px-3 py-2 rounded-lg border border-white/10 bg-white/60 text-slate-900 dark:bg-slate-800/60 dark:text-slate-100">📁 {outputDir.split(/[\/]/).pop()}</div>
        )}
        <div className="inline-flex items-center gap-2 bg-white/5 rounded-xl p-1">
          {!busy && (
            <ModernButton onClick={start} size="sm" variant="primary" icon={<FaPlay className="w-4 h-4" />} disabled={!files.length || !outputDir}>
              Старт
            </ModernButton>
          )}
          {busy && (
            <ModernButton onClick={cancel} size="sm" variant="secondary" icon={<FaStop className="w-4 h-4" />}>
              Отмена
            </ModernButton>
          )}
        </div>
        <div className="ml-auto inline-flex items-center gap-2 text-[11px] opacity-80">
          <span className="px-2 py-1 rounded-md border border-white/10 bg-white/5">Файлов: {files.length}</span>
          <span className="px-2 py-1 rounded-md border border-white/10 bg-white/5">{outputDir ? 'Папка выбрана' : 'Папка не выбрана'}</span>
        </div>
      </div>

      <div className="glass-card rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
          Настройки видео
        </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 text-xs">
        <label className="flex flex-col gap-2">
          <span className="opacity-70 font-medium">Режим</span>
          <CustomSelect
            value={mode}
            onChange={(v)=>setMode(v as any)}
            options={[{ value:'remux', label:'Ремукс', icon:'♻️' }, { value:'reencode', label:'Перекодирование', icon:'🎞️' }]}
            placeholder="Выберите режим"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="opacity-70 font-medium">CRF</span>
          <div className="flex items-center gap-3">
            <input type="range" min={14} max={32} step={1} value={crf} onChange={e=>setCrf(Number(e.target.value||23))} className="flex-1 accent-amber-500" disabled={mode!=='reencode'} />
            <input type="number" min={14} max={32} value={crf} onChange={e=>setCrf(Number(e.target.value||23))} className="w-20 h-9 bg-white/60 text-slate-900 dark:text-slate-100 dark:bg-slate-800/50 border border-white/10 rounded-lg px-3" disabled={mode!=='reencode'} />
          </div>
        </label>
        <label className="flex flex-col gap-2">
          <span className="opacity-70 font-medium">Preset</span>
          <CustomSelect
            value={preset}
            onChange={(v)=>setPreset(v)}
            options={[ 'ultrafast','superfast','veryfast','faster','fast','medium' ].map(x=>({ value:x, label:x }))}
            placeholder="Preset"
            className="text-sm"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="opacity-70 font-medium">Аудио</span>
          <CustomSelect
            value={audio}
            onChange={(v)=>setAudio(v as any)}
            options={[ { value:'copy', label:'Копировать' }, { value:'aac', label:'AAC' } ]}
            placeholder="Аудио"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="opacity-70 font-medium">Контейнер</span>
          <CustomSelect
            value={container}
            onChange={(v)=>setContainer(v as any)}
            options={[ { value:'mp4', label:'MP4' }, { value:'mkv', label:'MKV' } ]}
            placeholder="Контейнер"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="opacity-70 font-medium">Суффикс</span>
          <input type="text" value={suffix} onChange={e=>setSuffix(e.target.value)} className="bg-white/60 text-slate-900 dark:text-slate-100 dark:bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2" />
        </label>
      </div>
      </div>

      <div className="glass-card rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <div className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-500/30 to-green-500/30 border border-emerald-400/40">
            <div className="w-3 h-3 bg-gradient-to-r from-emerald-400 to-green-400 rounded-full animate-pulse" />
          </div>
          <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">Метаданные</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <label className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-slate-800/40 to-slate-700/40 hover:from-slate-800/60 hover:to-slate-700/60 transition-all cursor-pointer group border border-white/5">
            <input type="checkbox" checked={stripMeta} onChange={e=>setStripMeta(!!e.target.checked)} className="w-4 h-4" />
            <div className="flex-1">
              <span className="text-sm text-white group-hover:text-blue-300 transition-colors inline-flex items-center gap-2">Удалить все метаданные</span>
              <p className="text-[10px] text-slate-500 mt-0.5">Полная очистка тегов</p>
            </div>
          </label>
          <label className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer group border ${stripMeta ? 'bg-slate-800/30 opacity-50 cursor-not-allowed border-slate-700/30' : 'bg-gradient-to-r from-slate-800/40 to-slate-700/40 hover:from-slate-800/60 hover:to-slate-700/60 border-white/5'}`}>
            <input type="checkbox" checked={addComment} onChange={e=>setAddComment(!!e.target.checked)} disabled={stripMeta} className="w-4 h-4" />
            <div className="flex-1">
              <span className="text-sm text-white group-hover:text-blue-300 transition-colors inline-flex items-center gap-2">Добавить комментарий</span>
              <p className="text-[10px] text-slate-500 mt-0.5">Встраивает служебную метку в тег comment</p>
            </div>
          </label>
          <label className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-slate-800/40 to-slate-700/40 hover:from-slate-800/60 hover:to-slate-700/60 transition-all cursor-pointer group border border-white/5">
            <input type="checkbox" checked={faststart} onChange={e=>setFaststart(!!e.target.checked)} className="w-4 h-4" />
            <div className="flex-1">
              <span className="text-sm text-white group-hover:text-blue-300 transition-colors inline-flex items-center gap-2">Faststart</span>
              <p className="text-[10px] text-slate-500 mt-0.5">Оптимизация MP4 для стриминга</p>
            </div>
          </label>
        </div>
      </div>
      {busy && (
        <div className="space-y-1">
          <div className="w-full h-2 bg-slate-800 rounded overflow-hidden border border-white/10">
            <div className="h-2 bg-brand-600 transition-[width]" style={{ width: `${progress.total ? Math.round(100 * progress.current / progress.total) : 0}%` }} />
          </div>
          <div className="text-[11px] opacity-80">{progress.current}/{progress.total}{progress.lastFile ? ` • ${progress.lastFile}` : ''}</div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {files.map((p) => (
          <div key={p} className="px-2 py-1 text-xs rounded border border-white/10 bg-black/20 truncate" title={p}>{p}</div>
        ))}
      </div>
      <Toaster position="top-right" richColors theme="dark" closeButton expand visibleToasts={5} />
    </div>
  )
}