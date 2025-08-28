import { useEffect, useMemo, useRef, useState } from 'react'

export default function AdminPanel({ onClose, chatUrl }: { onClose: () => void; chatUrl: string }) {
  const [users, setUsers] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [eventsById, setEventsById] = useState<Map<string, any[]>>(new Map())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const wsRef = useRef<WebSocket|null>(null)
  const [connectKey, setConnectKey] = useState(0)
  const [status, setStatus] = useState<'idle'|'connecting'|'connected'|'disconnected'|'invalid'>('idle')
  const [globalEvents, setGlobalEvents] = useState<any[]>([])

  useEffect(() => { setConnectKey(k => k + 1) }, [chatUrl])
  useEffect(() => {
    (async () => {
      try {
        if (!adminPassword) {
          try {
            const saved = localStorage.getItem('adminPassword')
            if (saved) setAdminPassword(saved)
          } catch {}
        }
        if (!adminPassword && window.api?.admin?.getPassword) {
          const r = await window.api.admin.getPassword()
          if (r && (r as any).ok && (r as any).password) setAdminPassword((r as any).password)
        }
      } catch {}
    })()
  }, [])

  useEffect(() => {
    try {
      if (adminPassword) localStorage.setItem('adminPassword', adminPassword)
    } catch {}
  }, [adminPassword])

  useEffect(() => {
    let cancelled = false
    if (!connectKey) return
    setStatus('connecting')
    setError('')
    let ws: WebSocket
    try { ws = new WebSocket(chatUrl) } catch (e) { setStatus('invalid'); setError('bad url'); return }
    wsRef.current = ws
    ws.addEventListener('open', () => { setStatus('connected') })
    ws.addEventListener('close', () => { setStatus('disconnected') })
    ws.addEventListener('error', () => {})
    ws.addEventListener('message', ev => {
      if (cancelled) return
      let msg: any = null
      try { msg = JSON.parse(String(ev.data)) } catch { return }
      if (!msg || typeof msg !== 'object') return
      if (msg.type === 'admin_users' && msg.ok && Array.isArray(msg.users)) setUsers(msg.users)
      if (msg.type === 'admin_event' && msg.user) {
        setUsers(prev => {
          const map = new Map(prev.map(u => [String((u as any).id||''), u]))
          map.set(String(msg.user.id||''), msg.user)
          return Array.from(map.values())
        })
        setEventsById(prev => {
          const next = new Map(prev)
          const key = String(msg.user.id||'')
          const list = next.get(key) || []
          list.push({ kind: msg.kind, ts: msg.ts, prev: msg.prev, next: msg.next, text: msg.text })
          next.set(key, list.slice(-200))
          return next
        })
        setGlobalEvents(prev => {
          const e = { ts: msg.ts, kind: msg.kind, id: msg.user?.id, name: msg.user?.name, ip: msg.user?.ip, text: msg.text, client: msg.name, data: msg.data }
          const out = [...prev, e]
          return out.slice(-2000)
        })
      }
      if (msg.type === 'admin_history' && msg.ok && Array.isArray(msg.events)) {
        setGlobalEvents(msg.events.map((ev: any) => ({ ts: ev.ts, kind: ev.kind, id: ev.user?.id, name: ev.user?.name, ip: ev.user?.ip, text: ev.text, client: ev.name, data: ev.data })))
      }
    })
    return () => { cancelled = true; try { ws && ws.close() } catch {} }
  }, [connectKey, chatUrl])

  const requestUsers = async () => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== 1) return
    setBusy(true)
    setError('')
    try {
      if (adminPassword) ws.send(JSON.stringify({ type: 'admin_subscribe', password: adminPassword }))
      ws.send(JSON.stringify({ type: 'admin_list', password: adminPassword }))
      ws.send(JSON.stringify({ type: 'admin_history', password: adminPassword, limit: 500 }))
    } catch (e) { setError('send failed') }
    setBusy(false)
  }

  const filtered = useMemo(() => {
    const f = String(filter || '').trim().toLowerCase()
    if (!f) return users
    return users.filter(u =>
      String((u as any).id||'').toLowerCase().includes(f) ||
      String((u as any).name||'').toLowerCase().includes(f) ||
      String((u as any).ip||'').toLowerCase().includes(f) ||
      String((u as any).userAgent||'').toLowerCase().includes(f)
    )
  }, [users, filter])

  const fmt = (ts: number) => ts ? new Date(ts).toLocaleString() : ''
  const selectedEvents = useMemo(() => eventsById.get(String(selectedId||'')) || [], [eventsById, selectedId])

  return (
    <div className="fixed inset-0 z-50 p-4 flex items-start justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-[1100px] max-w-[98vw] glass rounded-xl border border-white/10 bg-slate-950 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold">Developer Panel</div>
          <div className="flex items-center gap-2">
            <input className="bg-slate-950 border border-white/10 rounded px-2 py-1 text-xs w-40" type="password" placeholder="admin password" value={adminPassword} onChange={e=>setAdminPassword(e.target.value)} />
            <input className="bg-slate-950 border border-white/10 rounded px-2 py-1 text-xs w-60" placeholder="filter" value={filter} onChange={e=>setFilter(e.target.value)} />
            <button onClick={requestUsers} disabled={busy || status !== 'connected' || !adminPassword} className={`btn text-xs ${(status==='connected'&&!busy&&adminPassword)?'btn-primary':'bg-slate-800 opacity-50 cursor-not-allowed'}`}>{'Refresh'}</button>
            <button className="btn btn-ghost text-xs" onClick={onClose}>{'Close'}</button>
          </div>
        </div>
        {error && <div className="text-xs text-rose-400 mb-2">{error}</div>}
        <div className="text-[11px] opacity-70 mb-2">Status: {status}</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="max-h-[70vh] overflow-auto bg-slate-950 border border-white/10 rounded">
            <table className="w-full text-left text-[11px]">
            <thead className="sticky top-0 bg-slate-950">
              <tr>
                <th className="px-2 py-2 border-b border-white/10">ID</th>
                <th className="px-2 py-2 border-b border-white/10">Name</th>
                <th className="px-2 py-2 border-b border-white/10">IP</th>
                <th className="px-2 py-2 border-b border-white/10">UA</th>
                <th className="px-2 py-2 border-b border-white/10">Connected</th>
                <th className="px-2 py-2 border-b border-white/10">Last Seen</th>
                <th className="px-2 py-2 border-b border-white/10">Last Msg</th>
                <th className="px-2 py-2 border-b border-white/10">Msgs</th>
                <th className="px-2 py-2 border-b border-white/10">State</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u: any, i: number) => (
                <tr key={(u.id||'') + i} onClick={()=>setSelectedId(u.id)} className={`cursor-pointer ${String(selectedId)===String(u.id)?'ring-1 ring-violet-500':''} odd:bg-slate-900 even:bg-slate-800/40`}>
                  <td className="px-2 py-2 border-b border-white/5 truncate" title={u.id}>{u.id}</td>
                  <td className="px-2 py-2 border-b border-white/5 truncate" title={u.name}>{u.name}</td>
                  <td className="px-2 py-2 border-b border-white/5 truncate" title={u.ip}>{u.ip}</td>
                  <td className="px-2 py-2 border-b border-white/5 truncate" title={u.userAgent}>{u.userAgent}</td>
                  <td className="px-2 py-2 border-b border-white/5 whitespace-nowrap">{fmt(u.connectedAt)}</td>
                  <td className="px-2 py-2 border-b border-white/5 whitespace-nowrap">{fmt(u.lastSeen)}</td>
                  <td className="px-2 py-2 border-b border-white/5 whitespace-nowrap">{fmt(u.lastMessageAt)}</td>
                  <td className="px-2 py-2 border-b border-white/5">{u.messageCount||0}</td>
                  <td className="px-2 py-2 border-b border-white/5">{String(u.state)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td className="px-2 py-3 opacity-60" colSpan={9}>No users</td></tr>
              )}
            </tbody>
            </table>
          </div>
          <div className="max-h-[70vh] overflow-auto bg-slate-950 border border-white/10 rounded p-2 text-[11px]">
            <div className="text-xs mb-2">Live feed</div>
            {globalEvents.length === 0 && <div className="opacity-60">No events</div>}
            {globalEvents.slice().reverse().map((e, i) => (
              <div key={i} className="px-2 py-1 border-b border-white/5">
                <div className="opacity-70">{fmt(e.ts)} • {e.kind} • {e.name||e.id} • {e.client||''}</div>
                {!!e.text && <div className="opacity-90 whitespace-pre-wrap break-words">{e.text}</div>}
                {e.kind==='client' && e.client==='process_progress' && (
                  <div className="opacity-90">
                    <div>File: {e.data?.file}</div>
                    <div>Index: {typeof e.data?.index==='number' ? (e.data.index+1) : ''}/{e.data?.total}</div>
                    <div>Speed: {e.data?.speedBps ? `${(e.data.speedBps/1024/1024).toFixed(2)} MB/s` : '—'}</div>
                    <div>ETA: {e.data?.etaMs ? `${Math.max(0, Math.floor(e.data.etaMs/1000))}s` : '—'}</div>
                  </div>
                )}
                {!!e.data && e.client!=='process_progress' && <div className="opacity-60 whitespace-pre-wrap break-words">{JSON.stringify(e.data)}</div>}
              </div>
            ))}
          </div>
          <div className="max-h-[70vh] overflow-auto bg-slate-950 border border-white/10 rounded p-2 text-[11px]">
            <div className="text-xs mb-2">History: {String(selectedId||'')}</div>
            {selectedEvents.length === 0 && <div className="opacity-60">No events</div>}
            {selectedEvents.slice().reverse().map((e, i) => (
              <div key={i} className="px-2 py-1 border-b border-white/5">
                <div className="opacity-70">{fmt(e.ts)} • {e.kind}</div>
                {e.kind==='name' && <div>"{e.prev}" → "{e.next}"</div>}
                {e.kind==='message' && e.text && <div className="opacity-90 whitespace-pre-wrap break-words">{e.text}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}