import { useEffect, useMemo, useRef, useState } from 'react'

export default function Chat({ url, userId, userName }) {
  const [status, setStatus] = useState('connecting')
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [endpoint, setEndpoint] = useState(() => {
    try { return localStorage.getItem('chat.url') || url } catch (_) { return url }
  })
  const wsRef = useRef(null)
  const audioRef = useRef(null)
  const listRef = useRef(null)
  const myId = useMemo(() => userId || Math.random().toString(36).slice(2), [userId])
  const myName = useMemo(() => userName || 'User', [userName])

  useEffect(() => {
    audioRef.current = new Audio('data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCA//////////////////////////////////////////////8AAAAPAAAACgAAAB8AAABJbnZhbGlk')
  }, [])

  useEffect(() => {
    let cancelled = false
    let backoffMs = 500
    function connect() {
      if (cancelled) return
      setStatus('connecting')
      try { wsRef.current && wsRef.current.close() } catch (_) {}
      const ws = new WebSocket(endpoint)
      wsRef.current = ws
      ws.addEventListener('open', () => {
        setStatus('connected')
        backoffMs = 500
        ws.send(JSON.stringify({ type: 'hello', userId: myId, name: myName }))
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
      })
    }
    connect()
    return () => { cancelled = true; try { wsRef.current && wsRef.current.close() } catch (_) {} }
  }, [endpoint, myId, myName])

  const send = () => {
    const t = String(text || '').trim()
    if (!t) return
    const ws = wsRef.current
    if (!ws || ws.readyState !== 1) return
    ws.send(JSON.stringify({ type: 'message', text: t }))
    setText('')
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <div className="text-xs opacity-70">Status: {status}</div>
        <input className="ml-auto bg-slate-900 border border-white/10 rounded px-2 py-1 text-xs w-60" value={endpoint} onChange={e=>setEndpoint(e.target.value)} placeholder="ws://SERVER_IP:8081" />
        <button className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs" onClick={()=>{ try { localStorage.setItem('chat.url', endpoint) } catch (_) {}; try { wsRef.current && wsRef.current.close() } catch (_) {} }}>Connect</button>
      </div>
      <div ref={listRef} className="flex-1 overflow-auto bg-slate-900 border border-white/10 rounded p-2 space-y-2">
        {messages.map(m => (
          <div key={m.id} className={`text-xs px-2 py-1 rounded ${m.userId === myId ? 'bg-emerald-900/40' : 'bg-slate-800/60'}`}>
            <div className="opacity-70">{m.name || m.userId}</div>
            <div>{m.text}</div>
          </div>
        ))}
        {messages.length === 0 && (<div className="text-[11px] opacity-60">No messages</div>)}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          className="flex-1 bg-slate-900 border border-white/10 rounded px-2 py-2 text-sm"
          placeholder="Type a message"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send() }}
        />
        <button onClick={send} className="px-3 py-2 rounded bg-violet-600 hover:bg-violet-500 text-sm">Send</button>
      </div>
    </div>
  )
}