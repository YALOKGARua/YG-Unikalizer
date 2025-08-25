const { WebSocketServer } = require('ws')
const { randomUUID } = require('crypto')

const PORT = Number(process.env.CHAT_PORT || 8081)
const HOST = process.env.CHAT_HOST || '0.0.0.0'

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

function broadcastStats() {
  const count = Array.from(wss.clients).filter(c => c.readyState === 1).length
  broadcast({ type: 'stats', count })
}

wss.on('connection', ws => {
  ws.id = randomUUID()
  ws.isAlive = true
  ws.user = { id: ws.id, name: '' }
  ws.on('pong', () => { ws.isAlive = true })
  ws.on('message', data => {
    let msg = null
    try { msg = JSON.parse(String(data)) } catch (_) { return }
    if (!msg || typeof msg !== 'object') return
    const type = String(msg.type || '')
    if (type === 'message') {
      const text = String(msg.text || '').trim()
      if (!text) return
      const safe = text.slice(0, 2000)
      const uid = String(msg.userId || ws.user.id || ws.id).slice(0, 128)
      const name = String(msg.name || ws.user.name || '').slice(0, 128)
      ws.user = { id: uid, name }
      const out = { type: 'message', id: randomUUID(), text: safe, userId: uid, name, ts: Date.now() }
      broadcast(out)
      return
    }
  })
  try { ws.send(JSON.stringify({ type: 'stats', count: Array.from(wss.clients).filter(c => c.readyState === 1).length })) } catch (_) {}
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