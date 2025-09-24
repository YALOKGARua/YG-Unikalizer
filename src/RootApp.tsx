import { useEffect, useState, lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { Icon } from './components/Icons'
import { motion, AnimatePresence } from 'framer-motion'
import MarkdownRenderer from './components/MarkdownRenderer'
import LoadingSpinner from './components/LoadingSpinner'
import NotificationCenter from './components/NotificationCenter'
import ChangelogModal from './components/ChangelogModal'
import { 
  FaCamera, 
  FaGamepad, 
  FaCog, 
  FaComments, 
  FaMoon, 
  FaSun, 
  FaDownload,
  FaGift,
  FaInfoCircle,
  FaStickyNote
} from 'react-icons/fa'

const NewApp = lazy(() => import('./NewApp'))
const OtherApp = lazy(() => import('./OtherApp'))
const CrashGame = lazy(() => import('./components/CrashGame'))
const SlotsGame = lazy(() => import('./components/SlotsGame'))
const Chat = lazy(() => import('./components/Chat'))

export default function RootApp() {
  const { i18n, t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [theme, setTheme] = useState<'dark'|'light'>(() => { try { return (localStorage.getItem('theme') as any) || 'dark' } catch { return 'dark' } })
  useEffect(() => { try { const root = document.documentElement; if (theme === 'dark') { root.classList.add('dark'); root.classList.remove('light') } else { root.classList.add('light'); root.classList.remove('dark') }; localStorage.setItem('theme', theme) } catch {} }, [theme])
  useEffect(() => { try { document.documentElement.setAttribute('dir', i18n.language === 'ar' ? 'rtl' : 'ltr') } catch {} }, [i18n.language])
  const [tab, setTab] = useState<'photo'|'fun'|'other'>('photo')
  const [funGame, setFunGame] = useState<'crash'|'slots'>('crash')
  useEffect(() => {
    const p = location.pathname || '/photo'
    if (p.startsWith('/fun')) {
      setTab('fun')
      if (p.includes('/slots')) setFunGame('slots')
      else setFunGame('crash')
    } else if (p.startsWith('/other')) setTab('other')
    else setTab('photo')
  }, [location.pathname])
  const [chatBadge, setChatBadge] = useState(0)
  const [chatUrl] = useState(() => { try { return localStorage.getItem('chatUrl') || 'ws://10.11.10.101:8081' } catch { return 'ws://10.11.10.101:8081' } })
  const [upd, setUpd] = useState<{ available: boolean; downloading: boolean; downloaded: boolean; percent: number; bps?: number; transferred?: number; total?: number; eta?: number; error?: string }>({ available: false, downloading: false, downloaded: false, percent: 0 })
  const [notesOpen, setNotesOpen] = useState(false)
  const [notesText, setNotesText] = useState('')
  const [aboutOpen, setAboutOpen] = useState(false)
  const [aboutText, setAboutText] = useState('')
  useEffect(() => {
    const offAvail = window.api.onUpdateAvailable((_info: unknown) => {
      setUpd({ available: true, downloading: false, downloaded: false, percent: 0 })
      ;(async () => { try { await window.api.downloadUpdate() } catch (e: any) { setUpd(s=>({ ...s, error: String(e && e.message ? e.message : e) })) } })()
    })
    const offProg = window.api.onUpdateProgress((p: { percent?: number; bytesPerSecond?: number; transferred?: number; total?: number }) => {
      const bps = Number(p && (p as any).bytesPerSecond) || 0
      const transferred = Number(p && (p as any).transferred) || 0
      const total = Number(p && (p as any).total) || 0
      const leftBytes = Math.max(0, total - transferred)
      const eta = bps > 0 ? Math.ceil(leftBytes / bps) : undefined
      setUpd(s => ({ ...s, downloading: true, percent: Number(p && p.percent) || 0, bps, transferred, total, eta }))
    })
    const offDone = window.api.onUpdateDownloaded((_info: unknown) => {
      setUpd(s => ({ ...s, downloading: false, downloaded: true, percent: 100 }))
    })
    const offErr = window.api.onUpdateError((err: string) => {
      setUpd(s => ({ ...s, error: err, downloading: false }))
    })
    return () => { offAvail(); offProg(); offDone(); offErr() }
  }, [])
  useEffect(() => {
    const unsub = window.api.onWhatsNew?.(async (_payload: unknown) => {
      setNotesOpen(true)
      try {
        const r = await window.api.getUpdateChangelog()
        const rn = r && (r as any).notes ? (r as any).notes : ''
        if (rn) { setNotesText(rn as string); return }
      } catch {}
      try {
        const g = await window.api.getReadme()
        const v = (g && (g as any).html) || (g && (g as any).data) || ''
        setNotesText(v as string)
      } catch {}
    })
    return () => { try { unsub && (unsub as any)() } catch {} }
  }, [])
  const installNow = async () => { try { await window.api.quitAndInstall() } catch {} }
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="h-full app-container"
    >
      <motion.header 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.1 }}
        className="border-b border-white/10 bg-black/40 backdrop-blur sticky top-0 z-40 select-none"
      >
        <div className="titlebar">
          <div className="text-[11px] opacity-60">PhotoUnikalizer</div>
          <div className="no-drag flex items-center gap-1" style={{ order: (typeof window!=='undefined' && localStorage.getItem('winSide')==='left') ? -1 : 1 }}>
            <button onClick={()=>window.api.win?.minimize()} className="titlebtn" aria-label="Minimize"><Icon name="tabler:minus" className="icon" /></button>
            <button onClick={()=>window.api.win?.toggleMaximize()} className="titlebtn" aria-label="Maximize"><Icon name="tabler:square" className="icon" /></button>
            <button onClick={()=>window.api.win?.close()} className="titlebtn close" aria-label="Close"><Icon name="tabler:x" className="icon" /></button>
          </div>
        </div>
        <div className="px-4 py-2 flex items-center justify-between no-drag">
          <motion.div 
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex items-center gap-2"
          >
            <div className="text-lg font-semibold">PhotoUnikalizer</div>
            <div className="text-[10px] neon neon-glow">by YALOKGAR</div>
          </motion.div>
          <motion.div 
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex items-center gap-2"
          >
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setNotesOpen(true)} 
              className="btn btn-ghost text-xs"
            >
              <span className="inline-flex items-center gap-1.5">
                <FaGift className="w-3 h-3" />
                {t('actions.whatsNew')}
              </span>
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={async()=>{ try { const r = await window.api.getReadme(); const v = (r && (r as any).html) || (r && (r as any).data) || t('about.readmeMissing') as string; setAboutText(v as string); setAboutOpen(true) } catch { setAboutText(t('about.readmeMissing') as string); setAboutOpen(true) } }} 
              className="btn btn-ghost text-xs"
            >
              <span className="inline-flex items-center gap-1.5">
                <FaInfoCircle className="w-3 h-3" />
                {t('actions.about')}
              </span>
            </motion.button>
            <NotificationCenter />
            <select value={i18n.language} onChange={e=>{ const v = e.target.value; i18n.changeLanguage(v); try { localStorage.setItem('lang', v) } catch {} }} className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-xs">
              <option value="ru">🇷🇺 RU</option>
              <option value="uk">🇺🇦 UK</option>
              <option value="en">🇺🇸 EN</option>
            </select>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={()=>setTheme(p=>p==='dark'?'light':'dark')} 
              className="btn btn-ghost text-xs"
            >
              <span className="inline-flex items-center gap-1.5">
                {theme==='dark' ? <FaSun className="w-3 h-3" /> : <FaMoon className="w-3 h-3" />}
                {theme==='dark'?'Light':'Dark'}
              </span>
            </motion.button>
          </motion.div>
        </div>
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-2 flex items-center gap-2"
        >
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={()=>navigate('/photo')} 
            className={`nav-btn ${tab==='photo'?'active':''}`}
          >
            <span className="inline-flex items-center gap-2">
              <FaCamera className="w-4 h-4" />
              {t('tabs.photoMeta', { defaultValue: 'Photo & Metadata' })}
            </span>
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={()=>navigate('/fun/'+(funGame||'crash'))} 
            className={`nav-btn ${tab==='fun'?'active':''}`}
          >
            <span className="inline-flex items-center gap-2">
              <FaGamepad className="w-4 h-4" />
              {t('tabs.fun', { defaultValue: 'Fun' })}
            </span>
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={()=>{ setChatBadge(0); navigate('/other') }} 
            className={`nav-btn ${tab==='other'?'active':''}`}
          >
            <span className="inline-flex items-center gap-2">
              <FaCog className="w-4 h-4" />
              {t('tabs.other', { defaultValue: 'Other' })}
              {chatBadge>0 && <span className="ml-2 text-[10px] bg-rose-500/80 px-1.5 py-0.5 rounded">{chatBadge}</span>}
            </span>
          </motion.button>
        </motion.div>
      </motion.header>
      <main className="min-h-[calc(100vh-88px)] overflow-auto">
        {tab==='fun' && (
          <div className="p-2 border-b border-white/10 bg-black/30 flex items-center gap-2">
            <button onClick={()=>{ setFunGame('crash'); navigate('/fun/crash') }} className={`btn btn-ghost text-xs ${location.pathname.includes('/fun/crash')?'opacity-100':'opacity-70'}`}>Crash</button>
            <button onClick={()=>{ setFunGame('slots'); navigate('/fun/slots') }} className={`btn btn-ghost text-xs ${location.pathname.includes('/fun/slots')?'opacity-100':'opacity-70'}`}>Slots</button>
          </div>
        )}
        <Suspense fallback={
          <div className="h-full flex items-center justify-center">
            <LoadingSpinner size="lg" text="Загрузка..." />
          </div>
        }>
          <Routes>
            <Route path="/" element={<Navigate to="/photo" replace />} />
            <Route path="/photo" element={<NewApp />} />
            <Route path="/fun">
              <Route index element={funGame==='slots' ? <SlotsGame /> : <CrashGame />} />
              <Route path="crash" element={<CrashGame />} />
              <Route path="slots" element={<SlotsGame />} />
            </Route>
            <Route path="/other" element={<OtherApp onIncoming={()=>setChatBadge(v=>v+1)} />} />
            <Route path="*" element={<Navigate to="/photo" replace />} />
          </Routes>
        </Suspense>
      </main>
      {false && (
        <Suspense fallback={null}>
          <Chat url={chatUrl} userId={'YALOKGAR'} userName={'YALOKGAR'} visible={false} onIncoming={()=>setChatBadge(v=>v+1)} />
        </Suspense>
      )}
      <ChangelogModal 
        isOpen={notesOpen} 
        onClose={() => setNotesOpen(false)} 
      />
      {aboutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80" onClick={()=>setAboutOpen(false)} />
          <div className="relative w-[900px] max-w-[95vw] max-h-[85vh] rounded-xl border border-white/10 bg-slate-900 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold">{t('panel.about')}</div>
              <button className="btn btn-ghost text-xs" onClick={()=>setAboutOpen(false)}>{t('panel.close')}</button>
            </div>
            <div className="overflow-auto max-h-[70vh]">
              <MarkdownRenderer content={aboutText} />
            </div>
          </div>
        </div>
      )}
      {upd.available && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80" />
          <div className="relative w-[560px] max-w-[90vw] rounded-xl border border-white/10 bg-slate-900 p-4 text-sm">
            <div className="text-base font-semibold mb-1">{t('update.available', { defaultValue: 'Update available' })}</div>
            <div className="opacity-80 mb-3">{upd.downloaded ? t('update.lockedUntilInstall') : (upd.downloading ? t('update.downloading') : t('update.available'))}</div>
            <div className="w-full h-2 bg-slate-800 rounded overflow-hidden border border-white/10">
              <div className="h-2 bg-brand-600 transition-[width]" style={{ width: `${Math.max(0, Math.min(100, Math.round(upd.percent||0)))}%` }} />
            </div>
            <div className="mt-2 text-[11px] opacity-80">
              {typeof upd.percent==='number' ? `${Math.round(upd.percent)}%` : ''}
              {typeof upd.bps==='number' && upd.bps>0 ? ` • ${(upd.bps/1024/1024).toFixed(2)} MB/s` : ''}
              {typeof upd.transferred==='number' && typeof upd.total==='number' && upd.total>0 ? ` • ${(upd.transferred/1024/1024).toFixed(1)}/${(upd.total/1024/1024).toFixed(1)} MB` : ''}
              {typeof upd.eta==='number' ? ` • ETA ${upd.eta}s` : ''}
            </div>
            {upd.error && <div className="text-xs text-rose-400 mt-2">{upd.error}</div>}
            <div className="mt-3 flex items-center gap-2">
              {upd.downloaded && <button onClick={installNow} className="btn btn-primary text-xs">{t('update.install', { defaultValue: 'Install' })}</button>}
              {!upd.downloaded && !upd.downloading && <button onClick={async()=>{ try { await window.api.downloadUpdate() } catch (e:any) { setUpd(s=>({ ...s, error: String(e && e.message ? e.message : e) })) } }} className="btn btn-ghost text-xs">{t('update.download', { defaultValue: 'Download' })}</button>}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}