import { WebSocketServer, WebSocket } from 'ws'
import { randomUUID } from 'crypto'
import { networkInterfaces } from 'os'

const PORT = Number(process.env.GAME_PORT || 8082)
const HOST = process.env.GAME_HOST || '0.0.0.0'

function getLocalIpAddress(): string {
  const interfaces = networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name]
    if (!iface) continue
    
    for (const details of iface) {
      if (details.family === 'IPv4' && !details.internal) {
        return details.address
      }
    }
  }
  return 'localhost'
}

type ExtWebSocket = WebSocket & { 
  id?: string
  isAlive?: boolean
  roomId?: string
  playerName?: string
}

interface Room {
  id: string
  name: string
  game: 'poker' | 'blackjack'
  players: Array<{ id: string; name: string }>
  maxPlayers: number
  createdAt: number
  host: string
  gameStarting?: boolean
  readyPlayers?: string[]
}

const rooms = new Map<string, Room>()

const wss = new WebSocketServer({ host: HOST, port: PORT })

function send(ws: ExtWebSocket, obj: any) {
  try {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(obj))
    }
  } catch {}
}

function broadcastToRoom(roomId: string, obj: any) {
  const data = JSON.stringify(obj)
  for (const client of wss.clients) {
    const c = client as ExtWebSocket
    if (c.readyState === 1 && c.roomId === roomId) {
      try {
        c.send(data)
      } catch {}
    }
  }
}

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

wss.on('connection', (ws: ExtWebSocket) => {
  ws.id = randomUUID()
  ws.isAlive = true

  console.log(`[GameServer] Client connected: ${ws.id}, total clients: ${wss.clients.size}, total rooms: ${rooms.size}`)

  ws.on('pong', () => {
    ws.isAlive = true
  })

  ws.on('message', (data: any) => {
    let msg: any = null
    try {
      msg = JSON.parse(String(data))
    } catch {
      return
    }

    if (!msg || typeof msg !== 'object') return

    const type = String(msg.type || '')

    if (type === 'getRooms') {
      const roomList = Array.from(rooms.values()).map(r => ({
        id: r.id,
        name: r.name,
        game: r.game,
        players: r.players.map(p => p.name),
        maxPlayers: r.maxPlayers,
        createdAt: r.createdAt
      }))
      send(ws, { type: 'roomList', rooms: roomList })
      return
    }

    if (type === 'createRoom') {
      const name = String(msg.name || '').trim()
      const game = msg.game === 'blackjack' ? 'blackjack' : 'poker'
      const maxPlayers = Math.max(2, Math.min(8, Number(msg.maxPlayers || 4)))
      const playerName = String(msg.playerName || '').trim()

      console.log(`[GameServer] Create room request: name="${name}", game=${game}, playerName="${playerName}"`)

      if (!name || !playerName) {
        send(ws, { type: 'error', message: 'Название комнаты и имя игрока обязательны' })
        return
      }

      const roomId = generateRoomId()
      const room: Room = {
        id: roomId,
        name,
        game,
        players: [{ id: ws.id!, name: playerName }],
        maxPlayers,
        createdAt: Date.now(),
        host: ws.id!
      }

      rooms.set(roomId, room)
      ws.roomId = roomId
      ws.playerName = playerName

      console.log(`[GameServer] Room created successfully: ${roomId} (${game}), total rooms: ${rooms.size}`)

      const roomData = {
        id: room.id,
        name: room.name,
        game: room.game,
        players: room.players.map(p => p.name),
        maxPlayers: room.maxPlayers,
        createdAt: room.createdAt
      }
      
      send(ws, { type: 'roomCreated', room: roomData })
      
      for (const client of wss.clients) {
        const c = client as ExtWebSocket
        if (c.readyState === 1 && !c.roomId) {
          send(c, { type: 'roomListUpdate', rooms: Array.from(rooms.values()).map(r => ({
            id: r.id,
            name: r.name,
            game: r.game,
            players: r.players.map(p => p.name),
            maxPlayers: r.maxPlayers,
            createdAt: r.createdAt
          })) })
        }
      }

      return
    }

    if (type === 'joinRoom') {
      const roomId = String(msg.roomId || '').toUpperCase().trim()
      const playerName = String(msg.playerName || '').trim()

      console.log(`[GameServer] Join room request: roomId="${roomId}", playerName="${playerName}"`)
      console.log(`[GameServer] Available rooms:`, Array.from(rooms.keys()))

      if (!roomId) {
        send(ws, { type: 'error', message: 'Код комнаты не указан' })
        return
      }

      if (!playerName) {
        send(ws, { type: 'error', message: 'Имя игрока не указано' })
        return
      }

      const room = rooms.get(roomId)
      if (!room) {
        console.log(`[GameServer] Room "${roomId}" not found. Available:`, Array.from(rooms.keys()))
        send(ws, { type: 'error', message: `Комната ${roomId} не найдена. Возможно она была удалена.` })
        send(ws, { type: 'roomListUpdate', rooms: Array.from(rooms.values()).map(r => ({ ...r, players: r.players.map(p => p.name) })) })
        return
      }

      if (room.players.length >= room.maxPlayers) {
        send(ws, { type: 'error', message: 'Room is full' })
        return
      }

      if (room.players.some(p => p.name === playerName)) {
        send(ws, { type: 'error', message: 'Name already taken' })
        return
      }

      room.players.push({ id: ws.id!, name: playerName })
      ws.roomId = roomId
      ws.playerName = playerName

      const roomData = {
        id: room.id,
        name: room.name,
        game: room.game,
        players: room.players.map(p => p.name),
        maxPlayers: room.maxPlayers,
        createdAt: room.createdAt
      }
      
      send(ws, { type: 'roomJoined', room: roomData })
      
      broadcastToRoom(roomId, { 
        type: 'playerJoined', 
        player: playerName, 
        players: room.players.map(p => p.name) 
      })

      for (const client of wss.clients) {
        const c = client as ExtWebSocket
        if (c.readyState === 1 && !c.roomId) {
          send(c, { type: 'roomListUpdate', rooms: Array.from(rooms.values()).map(r => ({ ...r, players: r.players.map(p => p.name) })) })
        }
      }

      console.log(`[GameServer] Player ${playerName} joined room ${roomId}`)
      return
    }

    if (type === 'leaveRoom') {
      if (!ws.roomId) return

      const room = rooms.get(ws.roomId)
      if (room) {
        room.players = room.players.filter(p => p.id !== ws.id)

        if (room.players.length === 0) {
          rooms.delete(ws.roomId)
          console.log(`[GameServer] Room ${ws.roomId} deleted (empty)`)
        } else {
          broadcastToRoom(ws.roomId, { 
            type: 'playerLeft', 
            player: ws.playerName, 
            players: room.players.map(p => p.name) 
          })
        }

        for (const client of wss.clients) {
          const c = client as ExtWebSocket
          if (c.readyState === 1 && !c.roomId) {
            send(c, { type: 'roomListUpdate', rooms: Array.from(rooms.values()).map(r => ({ ...r, players: r.players.map(p => p.name) })) })
          }
        }
      }

      ws.roomId = undefined
      ws.playerName = undefined
      send(ws, { type: 'roomLeft' })
      return
    }

    if (type === 'startGame') {
      if (!ws.roomId) return
      
      const room = rooms.get(ws.roomId)
      if (!room) {
        send(ws, { type: 'error', message: 'Комната не найдена' })
        return
      }
      
      if (room.host !== ws.id) {
        send(ws, { type: 'error', message: 'Только хост может начать игру' })
        return
      }
      
      console.log(`[GameServer] Game starting in room ${ws.roomId}, waiting for players to be ready`)
      
      room.gameStarting = true
      room.readyPlayers = []
      
      broadcastToRoom(ws.roomId, {
        type: 'gameStarting',
        game: room.game,
        players: room.players.map(p => p.name),
        roomId: room.id,
        readyPlayers: []
      })
      return
    }

    if (type === 'playerReady') {
      if (!ws.roomId) return
      
      const room = rooms.get(ws.roomId)
      if (!room || !room.gameStarting) return
      
      if (!room.readyPlayers) room.readyPlayers = []
      
      if (!room.readyPlayers.includes(ws.playerName!)) {
        room.readyPlayers.push(ws.playerName!)
        console.log(`[GameServer] Player ${ws.playerName} is ready in room ${ws.roomId} (${room.readyPlayers.length}/${room.players.length})`)
        
        broadcastToRoom(ws.roomId, {
          type: 'playerReady',
          player: ws.playerName,
          readyPlayers: room.readyPlayers
        })
        
        if (room.readyPlayers.length === room.players.length) {
          console.log(`[GameServer] All players ready! Starting game in room ${ws.roomId}`)
          
          room.gameStarting = false
          room.readyPlayers = []
          
          broadcastToRoom(ws.roomId, {
            type: 'gameStarted',
            game: room.game,
            players: room.players.map(p => p.name),
            roomId: room.id
          })
        }
      }
      return
    }

    if (type === 'gameAction') {
      if (!ws.roomId) return
      
      console.log(`[GameServer] Game action in room ${ws.roomId}:`, msg.action)
      
      broadcastToRoom(ws.roomId, {
        type: 'gameAction',
        player: ws.playerName,
        action: msg.action,
        data: msg.data
      })
      return
    }

    if (type === 'gameState') {
      if (!ws.roomId) return
      
      broadcastToRoom(ws.roomId, {
        type: 'gameStateUpdate',
        player: ws.playerName,
        state: msg.state
      })
      return
    }

    if (type === 'chat') {
      if (!ws.roomId) return
      const text = String(msg.text || '').trim()
      if (!text) return
      broadcastToRoom(ws.roomId, {
        type: 'chat',
        player: ws.playerName,
        text: text.slice(0, 500)
      })
      return
    }
  })

  ws.on('close', () => {
    console.log(`[GameServer] Client disconnected: ${ws.id}, remaining clients: ${wss.clients.size - 1}`)

    if (ws.roomId) {
      const room = rooms.get(ws.roomId)
      if (room) {
        room.players = room.players.filter(p => p.id !== ws.id)

        if (room.players.length === 0) {
          rooms.delete(ws.roomId)
          console.log(`[GameServer] Room ${ws.roomId} deleted (empty), remaining rooms: ${rooms.size}`)
        } else {
          console.log(`[GameServer] Player ${ws.playerName} left room ${ws.roomId}, remaining: ${room.players.length}`)
          broadcastToRoom(ws.roomId, {
            type: 'playerLeft',
            player: ws.playerName,
            players: room.players.map(p => p.name)
          })
        }

        for (const client of wss.clients) {
          const c = client as ExtWebSocket
          if (c.readyState === 1 && !c.roomId) {
            send(c, { type: 'roomListUpdate', rooms: Array.from(rooms.values()).map(r => ({ ...r, players: r.players.map(p => p.name) })) })
          }
        }
      }
    }
  })

  send(ws, { type: 'connected', id: ws.id })
})

const interval = setInterval(() => {
  for (const ws of wss.clients) {
    const c = ws as ExtWebSocket
    if (c.isAlive === false) {
      try {
        c.terminate()
      } catch {}
      continue
    }
    c.isAlive = false
    try {
      c.ping()
    } catch {}
  }

  const now = Date.now()
  for (const [roomId, room] of rooms.entries()) {
    if (now - room.createdAt > 24 * 60 * 60 * 1000) {
      rooms.delete(roomId)
      console.log(`[GameServer] Room ${roomId} deleted (expired)`)
    }
  }
}, 30000)

wss.on('close', () => {
  clearInterval(interval)
})

const localIp = getLocalIpAddress()
console.log(`[GameServer] WebSocket server started on ${HOST}:${PORT}`)
console.log(`[GameServer] Local IP: ${localIp}`)
console.log(`[GameServer] Connect from this device: ws://localhost:${PORT}`)
console.log(`[GameServer] Connect from network: ws://${localIp}:${PORT}`)
console.log(`[GameServer] Waiting for connections...`)

export function startGameServer() {
  console.log('[GameServer] Already running')
}

export function getServerInfo() {
  return {
    host: HOST,
    port: PORT,
    localIp,
    localUrl: `ws://localhost:${PORT}`,
    networkUrl: `ws://${localIp}:${PORT}`
  }
}