import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function Chat({ url, userId, userName }) {
  const { t } = useTranslation()
  const [status, setStatus] = useState('connecting')
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [nick, setNick] = useState(() => {
    try { return localStorage.getItem('chatNick') || '' } catch (_) { return '' }
  })
  const [usersCount, setUsersCount] = useState(0)
  const [nickEdit, setNickEdit] = useState('')
  const endpointRef = useRef(url)
  const [connectKey, setConnectKey] = useState(0)
  const wsRef = useRef(null)
  const audioRef = useRef(null)
  const listRef = useRef(null)
  const myId = useMemo(() => userId || Math.random().toString(36).slice(2), [userId])
  const myName = useMemo(() => userName || 'User', [userName])

  useEffect(() => {
    audioRef.current = new Audio('data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCA//////////////////////////////////////////////8AAAAPAAAACgAAAB8AAABJbnZhbGlk')
  }, [])

  useEffect(() => { endpointRef.current = url }, [url])

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
    function isLikelyWsUrl(s) {
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
      let ws
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
      })
      ws.addEventListener('close', () => {
        setStatus('disconnected')
        if (!cancelled) setTimeout(connect, Math.min(8000, backoffMs *= 2))
      })
      ws.addEventListener('error', () => {})
      ws.addEventListener('message', ev => {
        let msg = null
        try { msg = JSON.parse(String(ev.data)) } catch (_) { return }
        if (!msg || typeof msg !== 'object') return
        if (msg.type === 'message') {
          setMessages(prev => [...prev, msg])
          if (msg.userId !== myId) {
            try { audioRef.current && audioRef.current.play().catch(() => {}) } catch (_) {}
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

  useEffect(() => { if (nick.trim()) setConnectKey(1) }, [nick])
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

  if (!nick.trim()) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-2 mb-2"><div className="text-xs opacity-70">{t('chat.prompt')}</div></div>
        <div className="mt-2 flex gap-2">
          <input
            className="flex-1 bg-slate-900 border border-white/10 rounded px-2 py-2 text-sm"
            placeholder={t('chat.nickname')}
            value={nick}
            onChange={e => setNick(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && e.target.value.trim()) setNick(e.target.value.trim()) }}
          />
          <button disabled={!nick.trim()} onClick={() => { if (nick.trim()) setNick(nick.trim()) }} className={`px-3 py-2 rounded ${nick.trim() ? 'bg-violet-600 hover:bg-violet-500' : 'bg-slate-800 opacity-50 cursor-not-allowed'} text-sm`}>{t('chat.join')}</button>
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
            className="w-36 bg-slate-900 border border-white/10 rounded px-2 py-1 text-xs"
            placeholder={t('chat.nickname')}
            value={nickEdit}
            onChange={e => setNickEdit(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && nickEdit.trim()) setNick(nickEdit.trim()) }}
          />
          <button
            disabled={!nickEdit.trim() || nickEdit.trim() === nick.trim()}
            onClick={() => { if (nickEdit.trim()) setNick(nickEdit.trim()) }}
            className={`px-2 py-1 rounded text-xs ${nickEdit.trim() && nickEdit.trim() !== nick.trim() ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-800 opacity-50 cursor-not-allowed'}`}
          >{t('chat.set')}</button>
        </div>
        <div className="text-xs opacity-70 ml-auto">{t('chat.users')}: {Math.max(0, usersCount)}</div>
      </div>
      <div ref={listRef} className="flex-1 overflow-auto bg-slate-900 border border-white/10 rounded p-2 space-y-2">
        {messages.map(m => (
          <div key={m.id} className={`text-xs px-2 py-1 rounded ${m.userId === myId ? 'bg-emerald-900/40' : 'bg-slate-800/60'}`}>
            <div className="opacity-70">{m.name || m.userId}</div>
            <div>{m.text}</div>
          </div>
        ))}
        {messages.length === 0 && (<div className="text-[11px] opacity-60">{t('chat.noMessages')}</div>)}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          className="flex-1 bg-slate-900 border border-white/10 rounded px-2 py-2 text-sm"
          placeholder={t('chat.typeMessage')}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && status === 'connected' && nick.trim() && text.trim()) send() }}
        />
        <button disabled={!nick.trim() || status !== 'connected' || !text.trim()} onClick={send} className={`px-3 py-2 rounded ${nick.trim() && status === 'connected' && text.trim() ? 'bg-violet-600 hover:bg-violet-500' : 'bg-slate-800 opacity-50 cursor-not-allowed'} text-sm`}>{t('chat.send')}</button>
      </div>
    </div>
  )
}