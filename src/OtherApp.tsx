import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Chat from './components/Chat'
import { Icon } from './components/Icons'
import indigoScript from '/indigo-script.js?raw'
import AdminPanel from './components/AdminPanel'

export default function OtherApp() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<'converter'|'vision'|'chat'|'indigo'|'admin'>('converter')
  const [chatUrl] = useState(() => {
    try { return localStorage.getItem('chatUrl') || 'ws://10.11.10.101:8081' } catch { return 'ws://10.11.10.101:8081' }
  })
  const [adminOpen, setAdminOpen] = useState(false)
  return (
    <div className="grid grid-cols-12 gap-0 h-full">
      <aside className="col-span-2 xl:col-span-2 border-r border-white/10 bg-slate-950/40">
        <nav className="p-2 flex flex-col gap-1">
          <button onClick={()=>setTab('converter')} className={`nav-btn ${tab==='converter'?'active':''}`}><span className="inline-flex items-center gap-2"><Icon name="tabler:arrows-exchange" className="icon" />{t('tabs.converter')}</span></button>
          <button onClick={()=>setTab('indigo')} className={`nav-btn ${tab==='indigo'?'active':''}`}><span className="inline-flex items-center gap-2"><Icon name="tabler:star" className="icon" />{t('tabs.indigo')}</span></button>
          <button onClick={()=>setTab('vision')} className={`nav-btn ${tab==='vision'?'active':''}`}><span className="inline-flex items-center gap-2"><Icon name="tabler:eye" className="icon" />{t('tabs.vision')}</span></button>
          <button onClick={()=>setTab('chat')} className={`nav-btn ${tab==='chat'?'active':''}`}><span className="inline-flex items-center gap-2"><Icon name="tabler:message-2" className="icon" />{t('tabs.chat')}</span></button>
          <button onClick={()=>setTab('admin')} className={`nav-btn ${tab==='admin'?'active':''}`}><span className="inline-flex items-center gap-2"><Icon name="tabler:shield-lock" className="icon" />{t('tabs.admin', { defaultValue: 'Admin' })}</span></button>
        </nav>
      </aside>
      <section className="col-span-10 xl:col-span-10 p-4 overflow-auto">
        {tab==='converter' && <Converter />}
        {tab==='indigo' && <Indigo />}
        {tab==='vision' && <Vision />}
        {tab==='chat' && (
          <div className="p-4 rounded bg-slate-900/60 border border-white/10 text-slate-200 text-sm">
            <Chat url={chatUrl} userId={'YALOKGAR'} userName={'YALOKGAR'} />
          </div>
        )}
        {tab==='admin' && (
          <div className="space-y-2">
            <button onClick={()=>setAdminOpen(true)} className="btn btn-primary text-xs"><Icon name="tabler:shield-lock" className="icon" />{t('admin.open', { defaultValue: 'Open Admin' })}</button>
          </div>
        )}
      </section>
      {adminOpen && <AdminPanel onClose={()=>setAdminOpen(false)} chatUrl={chatUrl} />}
    </div>
  )
}

function Indigo() {
  const { t } = useTranslation()
  const codeRef = useRef<HTMLTextAreaElement | null>(null)
  return (
    <div className="p-4 rounded bg-slate-900/60 border border-white/10 text-slate-200 text-sm">
      <div className="text-sm font-semibold mb-2">{t('indigo.title')}</div>
      <div className="text-xs opacity-80">{t('indigo.hint')}</div>
      <div className="mt-3 flex items-center gap-2">
        <button onClick={async()=>{ const txt = indigoScript; try { await navigator.clipboard.writeText(txt) } catch {} }} className="btn btn-ghost text-xs">{t('common.copy', { defaultValue: 'Copy' })}</button>
        <button onClick={()=>{ try { if (codeRef.current) { codeRef.current.focus(); codeRef.current.select() } } catch {} }} className="btn btn-ghost text-xs">{t('common.selectAll', { defaultValue: 'Select all' })}</button>
        <button onClick={()=>{ try { const blob = new Blob([indigoScript], { type: 'text/javascript;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'indigo-script.js'; document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); } catch {} }} className="btn btn-ghost text-xs">{t('common.download', { defaultValue: 'Download .js' })}</button>
      </div>
      <textarea ref={codeRef} spellCheck={false} wrap="off" className="mt-2 w-full h-64 bg-slate-950 border border-white/10 rounded p-2 text-[11px] leading-4 font-mono" readOnly value={indigoScript} />
    </div>
  )
}

function Converter() {
  const { t } = useTranslation()
  const [txtPath, setTxtPath] = useState('')
  const [txtContent, setTxtContent] = useState('')
  const [jsonPreview, setJsonPreview] = useState('')
  const [profiles, setProfiles] = useState<any[]>([])
  const [selectedProfiles, setSelectedProfiles] = useState<Set<number>>(new Set())
  const chooseTxtFile = async () => {
    const r = await window.api.selectTextFile()
    if (!r || !r.ok) return
    setTxtPath(r.path || '')
    setTxtContent(r.content || '')
  }
  const parse = () => {
    const nat = (window.api as any).native
    if (nat && typeof nat.parseTxtProfiles === 'function') {
      try {
        const res = nat.parseTxtProfiles(txtContent)
        if (res && res.profiles) {
          const arr = Array.isArray(res.profiles) ? res.profiles : Array.from(res.profiles)
          const filtered = (Array.isArray(arr) ? arr : []).filter((it:any) => it && (it.profileId || it.url || (Array.isArray(it.cookies) && it.cookies.length)))
          setProfiles(filtered)
          setSelectedProfiles(new Set(filtered.map((_:any,i:number)=>i)))
          setJsonPreview(JSON.stringify(filtered, null, 2))
        }
      } catch {}
    }
  }
  const saveJson = async () => {
    if (!jsonPreview) return
    const def = txtPath ? txtPath.replace(/\.[^.]+$/, '.json') : 'data.json'
    await window.api.saveJson({ data: jsonPreview, defaultPath: def })
  }
  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 flex items-center gap-2 flex-wrap">
        <button onClick={chooseTxtFile} className="btn btn-primary"><Icon name="tabler:file-text" className="icon" />{t('converter.selectTxt')}</button>
        {txtPath && <div className="text-xs opacity-80 truncate" title={txtPath}>{txtPath}</div>}
        <button onClick={parse} className="btn btn-ghost"><Icon name="tabler:convert" className="icon" />{t('converter.convert')}</button>
        <button onClick={saveJson} disabled={!jsonPreview} className={`btn ${jsonPreview ? 'btn-ghost' : 'bg-slate-800 opacity-50 cursor-not-allowed'}`}><Icon name="tabler:download" className="icon" />{t('converter.saveJsonAll')}</button>
      </div>
      <div className="col-span-12 md:col-span-4">
        <div className="text-xs mb-1">{t('converter.list')}</div>
        <div className="h-72 md:h-[460px] overflow-auto bg-slate-900 border border-white/10 rounded">
          {profiles.map((p, i) => (
            <label key={i} className="flex items-center gap-2 text-xs px-2 py-2 border-b border-white/5">
              <input type="checkbox" checked={selectedProfiles.has(i)} onChange={e=>{ const next = new Set(selectedProfiles); if (e.target.checked) next.add(i); else next.delete(i); setSelectedProfiles(next); setJsonPreview(JSON.stringify(Array.from(next).sort((a,b)=>a-b).map(idx=>profiles[idx]), null, 2)) }} />
              <span className="truncate">{(p as any).profileId || '—'}</span>
            </label>
          ))}
          {!profiles.length && <div className="text-[11px] p-2 opacity-60">{t('converter.dropHint')}</div>}
        </div>
      </div>
      <div className="col-span-12 md:col-span-4">
        <div className="text-xs mb-1">TXT</div>
        <textarea className="w-full h-64 md:h-[460px] bg-slate-900 border border-white/10 rounded p-2 text-xs" value={txtContent} onChange={e => setTxtContent(e.target.value)} />
      </div>
      <div className="col-span-12 md:col-span-4">
        <div className="text-xs mb-1">JSON</div>
        <textarea className="w-full h-64 md:h-[460px] bg-slate-900 border border-white/10 rounded p-2 text-xs" value={jsonPreview} onChange={e => setJsonPreview(e.target.value)} />
      </div>
    </div>
  )
}

function Vision() {
  const { t } = useTranslation()
  const [token, setToken] = useState('')
  const [endpoint, setEndpoint] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<any>(null)
  const check = async () => {
    if (!token.trim()) return
    setBusy(true)
    setResult(null)
    try { const r = await window.api.checkTokenVision({ endpoint, token }); setResult(r || { ok: false }) } catch { setResult({ ok: false }) } finally { setBusy(false) }
  }
  return (
    <div className="p-4 rounded bg-slate-900/60 border border-white/10 text-slate-200 text-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-xs mb-1">{t('vision.token')}</div>
          <input className="w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={token} onChange={e => setToken(e.target.value)} placeholder="Bearer ..." />
        </div>
        <div>
          <div className="text-xs mb-1">{t('vision.endpoint')}</div>
          <input className="w-full bg-slate-900 border border-white/10 rounded px-2 py-2" value={endpoint} onChange={e => setEndpoint(e.target.value)} placeholder="https://api.example.com/me" />
        </div>
        <div className="md:col-span-2 flex items-center gap-2">
          <button onClick={check} disabled={!token || busy} className={`btn ${token && !busy ? 'btn-primary' : 'bg-slate-800 opacity-50 cursor-not-allowed'}`}>{busy ? (t('vision.checking')||'Checking…') : (t('vision.check')||'Check')}</button>
          {result && (
            <div className={`text-xs ${result.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
              {result.ok ? (t('vision.ok')||'OK') : (t('vision.fail')||'Fail')} {typeof result.status === 'number' ? `• ${result.status}` : ''} {result.error ? `• ${result.error}` : ''}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}