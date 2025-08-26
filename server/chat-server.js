const { WebSocketServer } = require('ws')
const { randomUUID } = require('crypto')
const fs = require('fs')
const path = require('path')
try { require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') }) } catch (_) {}
try { require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') }) } catch (_) {}
try {
  const fs = require('fs')
  const path = require('path')
  if (!process.env.CHAT_ADMIN_PASSWORD) {
    const files = [path.join(__dirname, '..', '.env.local'), path.join(__dirname, '..', '.env')]
    for (const fp of files) {
      try {
        if (!fs.existsSync(fp)) continue
        const txt = fs.readFileSync(fp, 'utf-8')
        const lines = String(txt).split(/\r?\n/)
        for (const ln of lines) {
          if (!ln || /^\s*#/.test(ln)) continue
          const m = ln.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
          if (!m) continue
          const key = m[1]
          const raw = m[2]
          const val = raw.replace(/^"|"$/g, '').replace(/^'|'$/g, '')
          if (!process.env[key]) process.env[key] = val
        }
      } catch (_) {}
    }
  }
} catch (_) {}

const PORT = Number(process.env.CHAT_PORT || 8081)
const HOST = process.env.CHAT_HOST || '0.0.0.0'
const MIN_NICK_LEN = Number(process.env.CHAT_MIN_NICK || 3)
const ADMIN_PASSWORD = String(process.env.CHAT_ADMIN_PASSWORD || '')
const ipInfoCache = new Map()
const LOG_DIR = process.env.CHAT_LOG_DIR || path.join(__dirname)
const LOG_FILE = path.join(LOG_DIR, 'admin-events.jsonl')
let allEvents = []

try {
  fs.mkdirSync(LOG_DIR, { recursive: true })
  if (fs.existsSync(LOG_FILE)) {
    try {
      const txt = fs.readFileSync(LOG_FILE, 'utf-8')
      const lines = txt.split(/\r?\n/).filter(Boolean)
      for (const ln of lines) {
        try { const obj = JSON.parse(ln); if (obj && obj.type === 'admin_event') allEvents.push(obj) } catch (_) {}
      }
    } catch (_) {}
  }
} catch (_) {}
async function ipInfo(ip) {
  try {
    const key = String(ip || '').trim()
    if (!key) return null
    if (ipInfoCache.has(key)) return ipInfoCache.get(key)
    const url = `http://ip-api.com/json/${encodeURIComponent(key)}?fields=status,country,regionName,city,org,as,isp,query,timezone,lat,lon,proxy,hosting,mobile`
    const ctrl = new AbortController()
    const id = setTimeout(() => ctrl.abort(), 2500)
    try {
      const res = await fetch(url, { signal: ctrl.signal })
      let data = null
      try { data = await res.json() } catch (_) { data = null }
      if (data && data.status === 'success') {
        const out = {
          ip: data.query || key,
          country: data.country || '',
          region: data.regionName || '',
          city: data.city || '',
          isp: data.isp || '',
          org: data.org || '',
          as: data.as || '',
          timezone: data.timezone || '',
          lat: typeof data.lat === 'number' ? data.lat : 0,
          lon: typeof data.lon === 'number' ? data.lon : 0,
          proxy: !!data.proxy,
          hosting: !!data.hosting,
          mobile: !!data.mobile
        }
        ipInfoCache.set(key, out)
        return out
      }
      return null
    } finally { clearTimeout(id) }
  } catch (_) { return null }
}

const wss = new WebSocketServer({ host: HOST, port: PORT })

function send(ws, obj) {
  try {
    ws.send(JSON.stringify(obj))
  } catch (_) {}
}

function broadcast(obj) {
  const data = JSON.stringify(obj)
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      try { client.send(data) } catch (_) {}
    }
  }
}

function sendAdmins(obj) {
  const data = JSON.stringify(obj)
  for (const client of wss.clients) {
    if (client.readyState === 1 && client.isAdmin) {
      try { client.send(data) } catch (_) {}
    }
  }
  if (obj && obj.type === 'admin_event') {
    try { allEvents.push(obj) } catch (_) {}
    try { fs.appendFile(LOG_FILE, JSON.stringify(obj) + '\n', () => {}) } catch (_) {}
  }
}

function broadcastStats() {
  const count = Array.from(wss.clients).filter(c => c.readyState === 1).length
  broadcast({ type: 'stats', count })
}

wss.on('connection', (ws, req) => {
  ws.id = randomUUID()
  ws.isAlive = true
  ws.isAdmin = false
  ws.user = { id: ws.id, name: '', connectedAt: Date.now(), lastSeen: Date.now(), lastMessageAt: 0, messageCount: 0, ip: (req && req.socket && req.socket.remoteAddress) ? req.socket.remoteAddress : '', userAgent: (req && req.headers && req.headers['user-agent']) ? String(req.headers['user-agent']) : '', url: (req && req.url) ? String(req.url) : '' }
  ws.on('pong', () => { ws.isAlive = true; ws.user.lastSeen = Date.now() })
  ;(async () => {
    try {
      const ip = String(ws.user.ip || '').replace(/^::ffff:/, '')
      if (!ip || ip === '127.0.0.1' || ip === '::1') return
      const info = await ipInfo(ip)
      if (info) ws.user.geo = info
    } catch (_) {}
  })()
  const exportUser = (c) => ({ id: c.user && c.user.id ? c.user.id : c.id, name: c.user && c.user.name ? c.user.name : '', ip: c.user && c.user.ip ? c.user.ip : '', userAgent: c.user && c.user.userAgent ? c.user.userAgent : '', url: c.user && c.user.url ? c.user.url : '', connectedAt: c.user && c.user.connectedAt ? c.user.connectedAt : 0, lastSeen: c.user && c.user.lastSeen ? c.user.lastSeen : 0, lastMessageAt: c.user && c.user.lastMessageAt ? c.user.lastMessageAt : 0, messageCount: c.user && typeof c.user.messageCount === 'number' ? c.user.messageCount : 0, state: c.readyState, alive: !!c.isAlive, geo: c.user && c.user.geo ? c.user.geo : null })
  sendAdmins({ type: 'admin_event', kind: 'connected', ts: Date.now(), user: exportUser(ws) })
  ws.on('message', data => {
    let msg = null
    try { msg = JSON.parse(String(data)) } catch (_) { return }
    if (!msg || typeof msg !== 'object') return
    const type = String(msg.type || '')
    if (type === 'admin_subscribe') {
      const pass = String(msg.password || '')
      if (ADMIN_PASSWORD && pass !== ADMIN_PASSWORD) { try { send(ws, { type: 'admin_users', ok: false, error: 'forbidden' }) } catch (_) {} ; return }
      ws.isAdmin = true
      const users = Array.from(wss.clients).map(c => exportUser(c))
      send(ws, { type: 'admin_users', ok: true, users, count: users.length })
      return
    }
    if (type === 'hello') {
      const uid = String(msg.userId || ws.user.id || ws.id).slice(0, 128)
      const raw = String(msg.name || '').trim()
      if (raw && raw.length >= MIN_NICK_LEN) {
        const prev = ws.user.name || ''
        ws.user.id = uid
        ws.user.name = raw.slice(0, 128)
        ws.user.lastSeen = Date.now()
        sendAdmins({ type: 'admin_event', kind: 'hello', ts: Date.now(), user: exportUser(ws) })
        if (prev && prev !== ws.user.name) sendAdmins({ type: 'admin_event', kind: 'name', ts: Date.now(), prev, next: ws.user.name, user: exportUser(ws) })
      }
      return
    }
    if (type === 'admin_list') {
      const pass = String(msg.password || '')
      if (ADMIN_PASSWORD && pass !== ADMIN_PASSWORD) { send(ws, { type: 'admin_users', ok: false, error: 'forbidden' }); return }
      const users = Array.from(wss.clients).map(c => exportUser(c))
      send(ws, { type: 'admin_users', ok: true, users, count: users.length })
      return
    }
    if (type === 'admin_history') {
      const pass = String(msg.password || '')
      if (ADMIN_PASSWORD && pass !== ADMIN_PASSWORD) { send(ws, { type: 'admin_history', ok: false, error: 'forbidden' }); return }
      const limit = Number(msg.limit || 0)
      const offset = Number(msg.offset || 0)
      let events = allEvents
      if (Number.isFinite(limit) && limit > 0) events = allEvents.slice(Math.max(0, allEvents.length - limit - Math.max(0, offset)), Math.max(0, allEvents.length - Math.max(0, offset)))
      send(ws, { type: 'admin_history', ok: true, count: events.length, total: allEvents.length, events })
      return
    }
    if (type === 'message') {
      const text = String(msg.text || '').trim()
      if (!text) return
      const safe = text.slice(0, 2000)
      const uid = String(msg.userId || ws.user.id || ws.id).slice(0, 128)
      const rawName = String(msg.name || ws.user.name || '')
      const trimmedName = rawName.trim()
      if (trimmedName.length < MIN_NICK_LEN) return
      const name = trimmedName.slice(0, 128)
      ws.user.id = uid
      ws.user.name = name
      ws.user.lastMessageAt = Date.now()
      ws.user.lastSeen = Date.now()
      ws.user.messageCount = (ws.user.messageCount || 0) + 1
      const out = { type: 'message', id: randomUUID(), text: safe, userId: uid, name, ts: Date.now() }
      broadcast(out)
      sendAdmins({ type: 'admin_event', kind: 'message', ts: Date.now(), user: exportUser(ws), text: safe })
      return
    }
    if (type === 'client_event') {
      const name = String(msg.name || '').trim()
      const payload = msg.data && typeof msg.data === 'object' ? msg.data : null
      sendAdmins({ type: 'admin_event', kind: 'client', ts: Date.now(), user: exportUser(ws), name, data: payload })
      return
    }
  })
  try { ws.send(JSON.stringify({ type: 'stats', count: Array.from(wss.clients).filter(c => c.readyState === 1).length })) } catch (_) {}
  ws.on('close', () => { try { sendAdmins({ type: 'admin_event', kind: 'disconnected', ts: Date.now(), user: exportUser(ws) }) } catch (_) {} })
})

const interval = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) { try { ws.terminate() } catch (_) {} continue }
    ws.isAlive = false
    try { ws.ping() } catch (_) {}
  }
}, 30000)

wss.on('close', () => { clearInterval(interval) })

wss.on('headers', () => { setTimeout(broadcastStats, 0) })
wss.on('connection', (ws) => { ws.on('close', () => { setTimeout(broadcastStats, 0) }) })