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
    if (type === 'hello') {
      const uid = String(msg.userId || '').slice(0, 128) || ws.id
      const name = String(msg.name || '').slice(0, 128)
      ws.user = { id: uid, name }
      return
    }
    if (type === 'message') {
      const text = String(msg.text || '').trim()
      if (!text) return
      const safe = text.slice(0, 2000)
      const out = { type: 'message', id: randomUUID(), text: safe, userId: ws.user.id, name: ws.user.name, ts: Date.now() }
      broadcast(out)
      return
    }
  })
})

const interval = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) { try { ws.terminate() } catch (_) {} continue }
    ws.isAlive = false
    try { ws.ping() } catch (_) {}
  }
}, 30000)

wss.on('close', () => { clearInterval(interval) })