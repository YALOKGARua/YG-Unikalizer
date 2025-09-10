import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import NewApp from './NewApp'
import OtherApp from './OtherApp'
import CrashGame from './components/CrashGame'
import SlotsGame from './components/SlotsGame'
import Chat from './components/Chat'
import { Icon } from './components/Icons'

export default function RootApp() {
  const { i18n, t } = useTranslation()
  const [theme, setTheme] = useState<'dark'|'light'>(() => { try { return (localStorage.getItem('theme') as any) || 'dark' } catch { return 'dark' } })
  useEffect(() => { try { const root = document.documentElement; if (theme === 'dark') { root.classList.add('dark'); root.classList.remove('light') } else { root.classList.add('light'); root.classList.remove('dark') }; localStorage.setItem('theme', theme) } catch {} }, [theme])
  useEffect(() => { try { document.documentElement.setAttribute('dir', i18n.language === 'ar' ? 'rtl' : 'ltr') } catch {} }, [i18n.language])
  const [tab, setTab] = useState<'photo'|'fun'|'other'>('photo')
  const [funGame, setFunGame] = useState<'crash'|'slots'>('crash')
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
  const installNow = async () => { try { await window.api.quitAndInstall() } catch {} }
  return (
    <div className="h-full app-container">
      <header className="border-b border-white/10 bg-black/40 backdrop-blur sticky top-0 z-40 select-none">
        <div className="titlebar">
          <div className="text-[11px] opacity-60">PhotoUnikalizer</div>
          <div className="no-drag flex items-center gap-1" style={{ order: (typeof window!=='undefined' && localStorage.getItem('winSide')==='left') ? -1 : 1 }}>
            <button onClick={()=>window.api.win?.minimize()} className="titlebtn" aria-label="Minimize"><Icon name="tabler:minus" className="icon" /></button>
            <button onClick={()=>window.api.win?.toggleMaximize()} className="titlebtn" aria-label="Maximize"><Icon name="tabler:square" className="icon" /></button>
            <button onClick={()=>window.api.win?.close()} className="titlebtn close" aria-label="Close"><Icon name="tabler:x" className="icon" /></button>
          </div>
        </div>
        <div className="px-4 py-2 flex items-center justify-between no-drag">
          <div className="flex items-center gap-2">
            <div className="text-lg font-semibold">PhotoUnikalizer</div>
            <div className="text-[10px] neon neon-glow">by YALOKGAR</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={async()=>{ try { const r = await window.api.getUpdateChangelog(); setNotesText((r && (r as any).notes) || t('notes.none') as string); setNotesOpen(true) } catch { setNotesText(t('notes.none') as string); setNotesOpen(true) } }} className="btn btn-ghost text-xs"><span className="inline-flex items-center gap-1.5"><Icon name="tabler:sparkles" className="icon" />{t('actions.whatsNew')}</span></button>
            <button onClick={async()=>{ try { const r = await window.api.getReadme(); setAboutText((r && (r as any).data) || t('about.readmeMissing') as string); setAboutOpen(true) } catch { setAboutText(t('about.readmeMissing') as string); setAboutOpen(true) } }} className="btn btn-ghost text-xs"><span className="inline-flex items-center gap-1.5"><Icon name="tabler:info-circle" className="icon" />{t('actions.about')}</span></button>
            <select value={i18n.language} onChange={e=>{ const v = e.target.value; i18n.changeLanguage(v); try { localStorage.setItem('lang', v) } catch {} }} className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-xs">
              <option value="ru">RU</option>
              <option value="uk">UK</option>
              <option value="en">EN</option>
            </select>
            <button onClick={()=>setTheme(p=>p==='dark'?'light':'dark')} className="btn btn-ghost text-xs"><span className="inline-flex items-center gap-1.5"><Icon name={theme==='dark'?'tabler:sun':'tabler:moon'} className="icon" />{theme==='dark'?'Light':'Dark'}</span></button>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button onClick={()=>setTab('photo')} className={`nav-btn ${tab==='photo'?'active':''}`}><span className="inline-flex items-center gap-2"><Icon name="tabler:photo" className="icon" />{t('tabs.photoMeta', { defaultValue: 'Photo & Metadata' })}</span></button>
          <button onClick={()=>setTab('fun')} className={`nav-btn ${tab==='fun'?'active':''}`}><span className="inline-flex items-center gap-2"><Icon name="tabler:plane" className="icon" />{t('tabs.fun', { defaultValue: 'Fun' })}</span></button>
          <button onClick={()=>{ setChatBadge(0); setTab('other') }} className={`nav-btn ${tab==='other'?'active':''}`}><span className="inline-flex items-center gap-2"><Icon name="tabler:apps" className="icon" />{t('tabs.other', { defaultValue: 'Other' })}{chatBadge>0 && <span className="ml-2 text-[10px] bg-rose-500/80 px-1.5 py-0.5 rounded">{chatBadge}</span>}</span></button>
        </div>
      </header>
      <main className="h-[calc(100vh-88px)] overflow-hidden">
        {tab==='photo' && <NewApp />}
        {tab==='fun' && (
          <div className="h-full w-full flex flex-col">
            <div className="p-2 border-b border-white/10 bg-black/30 flex items-center gap-2">
              <button onClick={()=>setFunGame('crash')} className={`btn btn-ghost text-xs ${funGame==='crash'?'opacity-100':'opacity-70'}`}>Crash</button>
              <button onClick={()=>setFunGame('slots')} className={`btn btn-ghost text-xs ${funGame==='slots'?'opacity-100':'opacity-70'}`}>Slots</button>
            </div>
            <div className="flex-1 min-h-0">
              {funGame==='crash' && <CrashGame />}
              {funGame==='slots' && <SlotsGame />}
            </div>
          </div>
        )}
        {tab==='other' && <OtherApp onIncoming={()=>setChatBadge(v=>v+1)} />}
      </main>
      {false && <Chat url={chatUrl} userId={'YALOKGAR'} userName={'YALOKGAR'} visible={false} onIncoming={()=>setChatBadge(v=>v+1)} />}
      {notesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80" onClick={()=>setNotesOpen(false)} />
          <div className="relative w-[820px] max-w-[95vw] max-h-[85vh] rounded-xl border border-white/10 bg-slate-900 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold">{t('panel.whatsNew')}</div>
              <button className="btn btn-ghost text-xs" onClick={()=>setNotesOpen(false)}>{t('panel.close')}</button>
            </div>
            <div className="overflow-auto max-h-[70vh] text-sm whitespace-pre-wrap leading-6">{notesText}</div>
          </div>
        </div>
      )}
      {aboutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80" onClick={()=>setAboutOpen(false)} />
          <div className="relative w-[900px] max-w-[95vw] max-h-[85vh] rounded-xl border border-white/10 bg-slate-900 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold">{t('panel.about')}</div>
              <button className="btn btn-ghost text-xs" onClick={()=>setAboutOpen(false)}>{t('panel.close')}</button>
            </div>
            <div className="overflow-auto max-h-[70vh] text-sm whitespace-pre-wrap leading-6">{aboutText}</div>
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
    </div>
  )
}