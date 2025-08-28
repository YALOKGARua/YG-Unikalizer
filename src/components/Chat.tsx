import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export default function Chat({ url, userId, userName, visible = true, onIncoming }: { url: string; userId?: string; userName?: string; visible?: boolean; onIncoming?: (msg: any) => void }) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<'connecting'|'connected'|'disconnected'|'invalid-url'>('connecting')
  const [messages, setMessages] = useState<any[]>([])
  const [text, setText] = useState('')
  const MIN_NICK_LEN = 3
  const [nick, setNick] = useState(() => {
    try { return localStorage.getItem('chatNick') || '' } catch (_) { return '' }
  })
  const [usersCount, setUsersCount] = useState(0)
  const [nickEdit, setNickEdit] = useState('')
  const endpointRef = useRef(url)
  const [connectKey, setConnectKey] = useState(0)
  const wsRef = useRef<WebSocket|null>(null)
  const audioRef = useRef<HTMLAudioElement|null>(null)
  const listRef = useRef<HTMLDivElement|null>(null)
  const myId = useMemo(() => userId || Math.random().toString(36).slice(2), [userId])
  const myName = useMemo(() => userName || 'User', [userName])

  useEffect(() => {
    audioRef.current = new Audio('data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCA//////////////////////////////////////////////8AAAAPAAAACgAAAB8AAABJbnZhbGlk')
  }, [])

  useEffect(() => { endpointRef.current = url }, [url])

  const storageKey = useMemo(() => {
    try { return 'chatMessages:' + String(url || '') } catch { return 'chatMessages' }
  }, [url])
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) setMessages(parsed)
      }
    } catch {}
  }, [storageKey])
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(messages.slice(-1000))) } catch {}
  }, [messages, storageKey])

  const didInitUrlRef = useRef(false)
  useEffect(() => {
    if (!didInitUrlRef.current) { didInitUrlRef.current = true; return }
    if (wsRef.current) {
      try { wsRef.current.close() } catch (_) {}
    } else {
      setConnectKey(k => (k ? k + 1 : 1))
    }
  }, [url])

  useEffect(() => {
    let cancelled = false
    let backoffMs = 500
    if (!connectKey) return
    function isLikelyWsUrl(s: string) {
      if (!s || typeof s !== 'string') return false
      const trimmed = s.trim()
      if (!/^wss?:\/\//i.test(trimmed)) return false
      try { new URL(trimmed) } catch (_) { return false }
      return true
    }
    function connect() {
      if (cancelled) return
      setStatus('connecting')
      try { wsRef.current && wsRef.current.close() } catch (_) {}
      const target = endpointRef.current
      if (!isLikelyWsUrl(target)) { setStatus('invalid-url'); return }
      let ws: WebSocket
      try {
        ws = new WebSocket(target)
      } catch (_) {
        setStatus('invalid-url')
        return
      }
      wsRef.current = ws
      ws.addEventListener('open', () => {
        setStatus('connected')
        backoffMs = 500
        try {
          const helloName = (nick || '').trim()
          if (helloName.length >= MIN_NICK_LEN) ws.send(JSON.stringify({ type: 'hello', userId: myId, name: helloName }))
        } catch (_) {}
      })
      ws.addEventListener('close', () => {
        setStatus('disconnected')
        if (!cancelled) setTimeout(connect, Math.min(8000, backoffMs *= 2))
      })
      ws.addEventListener('error', () => {})
      ws.addEventListener('message', ev => {
        let msg: any = null
        try { msg = JSON.parse(String(ev.data)) } catch (_) { return }
        if (!msg || typeof msg !== 'object') return
        if (msg.type === 'message') {
          setMessages(prev => [...prev, msg])
          if (msg.userId !== myId) {
            try { if ((localStorage.getItem('chatSound')||'1') !== '0') audioRef.current && audioRef.current.play().catch(() => {}) } catch (_) {}
            try { if ((localStorage.getItem('chatToast')||'1') !== '0') toast(`${msg.name || 'User'}: ${msg.text}`, { position: 'top-right' }) } catch {}
            try { if (!visible && typeof onIncoming === 'function') onIncoming(msg) } catch {}
          }
          if (listRef.current) {
            try { listRef.current.scrollTop = listRef.current.scrollHeight } catch (_) {}
          }
        }
        if (msg.type === 'stats' && typeof msg.count === 'number') {
          setUsersCount(msg.count)
        }
      })
    }
    connect()
    return () => { cancelled = true; try { wsRef.current && wsRef.current.close() } catch (_) {} }
  }, [connectKey, myId, myName])

  useEffect(() => { if (nick.trim().length >= MIN_NICK_LEN) setConnectKey(1) }, [nick])
  useEffect(() => {
    if (connectKey) return
    setConnectKey(1)
  }, [])
  useEffect(() => { setNickEdit(nick) }, [nick])

  useEffect(() => { try { localStorage.setItem('chatNick', nick) } catch (_) {} }, [nick])

  const send = () => {
    const t = String(text || '').trim()
    if (!t) return
    const name = nick.trim()
    if (!name) return
    const ws = wsRef.current
    if (!ws || ws.readyState !== 1) return
    ws.send(JSON.stringify({ type: 'message', text: t, userId: myId, name }))
    setText('')
  }

  if (!visible) return <div style={{ display: 'none' }} />

  if (nick.trim().length < MIN_NICK_LEN) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-2 mb-2"><div className="text-xs opacity-70">{t('chat.prompt')}</div></div>
        <div className="mt-2 flex gap-2">
          <input
            className="flex-1 bg-slate-900 border border-white/10 rounded px-2 py-2 text-sm"
            placeholder={t('chat.nickname')}
            value={nickEdit}
            onChange={e => setNickEdit(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim().length >= MIN_NICK_LEN) setNick((e.target as HTMLInputElement).value.trim()) }}
          />
          <button disabled={nickEdit.trim().length < MIN_NICK_LEN} onClick={() => { if (nickEdit.trim().length >= MIN_NICK_LEN) setNick(nickEdit.trim()) }} className={`btn text-sm ${nickEdit.trim().length >= MIN_NICK_LEN ? 'btn-primary' : 'bg-slate-800 opacity-50 cursor-not-allowed'}`}>{t('chat.join')}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <div className="text-xs opacity-70">{t('chat.status')}: {status === 'connected' ? t('chat.s.connected') : status === 'connecting' ? t('chat.s.connecting') : status === 'disconnected' ? t('chat.s.disconnected') : status === 'invalid-url' ? t('chat.s.invalid') : status}</div>
        <div className="flex items-center gap-2 ml-4">
          <input
            className="w-36 bg-slate-950 border border-white/10 rounded px-2 py-1 text-xs"
            placeholder={t('chat.nickname')}
            value={nickEdit}
            onChange={e => setNickEdit(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && nickEdit.trim().length >= MIN_NICK_LEN) setNick(nickEdit.trim()) }}
          />
          <button
            disabled={nickEdit.trim().length < MIN_NICK_LEN || nickEdit.trim() === nick.trim()}
            onClick={() => { if (nickEdit.trim().length >= MIN_NICK_LEN) setNick(nickEdit.trim()) }}
            className={`btn text-xs ${nickEdit.trim().length >= MIN_NICK_LEN && nickEdit.trim() !== nick.trim() ? 'btn-primary' : 'bg-slate-800 opacity-50 cursor-not-allowed'}`}
          >{t('chat.set')}</button>
        </div>
        <div className="text-xs opacity-70 ml-auto">{t('chat.users')}: {Math.max(0, usersCount)}</div>
      </div>
      <div ref={listRef} className="flex-1 overflow-auto bg-slate-950 border border-white/10 rounded p-2 space-y-2">
        {messages.map((m: any) => (
          <div key={m.id} className={`text-xs px-2 py-1 rounded ${m.userId === myId ? 'bg-emerald-900/40' : 'bg-slate-800/60'}`}>
            <div className="opacity-70">{m.name || m.userId}</div>
            <div>{m.text}</div>
          </div>
        ))}
        {messages.length === 0 && (<div className="text-[11px] opacity-60">{t('chat.noMessages')}</div>)}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          className="flex-1 bg-slate-950 border border-white/10 rounded px-2 py-2 text-sm"
          placeholder={t('chat.typeMessage')}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && status === 'connected' && nick.trim().length >= MIN_NICK_LEN && text.trim()) send() }}
        />
        <button disabled={nick.trim().length < MIN_NICK_LEN || status !== 'connected' || !text.trim()} onClick={send} className={`btn text-sm ${nick.trim().length >= MIN_NICK_LEN && status === 'connected' && text.trim() ? 'btn-primary' : 'bg-slate-800 opacity-50 cursor-not-allowed'}`}>{t('chat.send')}</button>
      </div>
    </div>
  )
}