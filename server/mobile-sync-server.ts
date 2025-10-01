import express from 'express'
import { Server as SocketServer } from 'socket.io'
import { createServer } from 'http'
import multer from 'multer'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import os from 'os'
import fs from 'fs'

const app = express()
const httpServer = createServer(app)
const io = new SocketServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

const PORT = 3030
const sessions = new Map<string, { token: string; desktopSocket: any; mobileSocket: any }>()

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(os.tmpdir(), 'yg-unikalizer-uploads')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`
    cb(null, uniqueName)
  }
})

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }
})

app.use(express.json())
app.use(express.static(path.join(__dirname, '../public')))

app.get('/api/session/create', (req, res) => {
  const token = uuidv4().slice(0, 8)
  const sessionId = uuidv4()
  sessions.set(sessionId, { token, desktopSocket: null, mobileSocket: null })
  const localIP = getLocalIP()
  const hostHeader = String(req.headers.host || '')
  let resolvedPort = PORT
  if (hostHeader.includes(':')) {
    const parts = hostHeader.split(':')
    const portText = parts[parts.length - 1]
    const parsed = parseInt(portText, 10)
    if (!Number.isNaN(parsed) && parsed > 0) resolvedPort = parsed
  }
  const url = `http://${localIP}:${resolvedPort}/mobile?session=${sessionId}&token=${token}`
  res.json({ sessionId, token, url, ip: localIP, port: resolvedPort })
})

app.get('/api/session/:sessionId/validate', (req, res) => {
  const { sessionId } = req.params
  const { token } = req.query
  
  const session = sessions.get(sessionId)
  
  if (!session || session.token !== token) {
    return res.status(401).json({ error: 'Invalid session or token' })
  }
  
  res.json({ valid: true })
})

app.post('/api/upload', upload.array('files', 10), (req, res) => {
  const { sessionId } = req.body
  const session = sessions.get(sessionId)
  
  if (!session) {
    return res.status(401).json({ error: 'Invalid session' })
  }
  
  const files = (req.files as Express.Multer.File[]).map(f => ({
    path: f.path,
    name: f.originalname,
    size: f.size
  }))
  
  if (session.desktopSocket) {
    session.desktopSocket.emit('files-uploaded', { files })
  }
  
  res.json({ success: true, files })
})

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)
  
  socket.on('desktop-connect', ({ sessionId }) => {
    const session = sessions.get(sessionId)
    if (session) {
      session.desktopSocket = socket
      socket.join(`session-${sessionId}`)
      console.log('Desktop connected to session:', sessionId)
    }
  })
  
  socket.on('mobile-connect', ({ sessionId, token }) => {
    const session = sessions.get(sessionId)
    if (session && session.token === token) {
      session.mobileSocket = socket
      socket.join(`session-${sessionId}`)
      
      if (session.desktopSocket) {
        session.desktopSocket.emit('mobile-connected')
      }
      
      socket.emit('connected', { success: true })
      console.log('Mobile connected to session:', sessionId)
    } else {
      socket.emit('error', { message: 'Invalid session or token' })
    }
  })
  
  socket.on('processing-started', ({ sessionId, total }) => {
    const session = sessions.get(sessionId)
    if (session?.mobileSocket) {
      session.mobileSocket.emit('processing-started', { total })
    }
  })
  
  socket.on('processing-progress', ({ sessionId, current, total, fileName }) => {
    const session = sessions.get(sessionId)
    if (session?.mobileSocket) {
      session.mobileSocket.emit('processing-progress', { current, total, fileName })
    }
  })
  
  socket.on('processing-complete', ({ sessionId, results }) => {
    const session = sessions.get(sessionId)
    if (session?.mobileSocket) {
      session.mobileSocket.emit('processing-complete', { results })
    }
  })
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
    sessions.forEach((session, sessionId) => {
      if (session.desktopSocket?.id === socket.id) {
        session.desktopSocket = null
      }
      if (session.mobileSocket?.id === socket.id) {
        session.mobileSocket = null
        if (session.desktopSocket) {
          session.desktopSocket.emit('mobile-disconnected')
        }
      }
    })
  })
})

function getLocalIP(): string {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return 'localhost'
}

export function startMobileSyncServer() {
  return new Promise((resolve, reject) => {
    const server = httpServer.listen(PORT, () => {
      console.log(`🚀 Mobile Sync Server running on port ${PORT}`)
      console.log(`📱 Local IP: ${getLocalIP()}`)
      console.log(`📱 Server URL: http://${getLocalIP()}:${PORT}`)
      console.log(`📱 Mobile URL: http://${getLocalIP()}:${PORT}/mobile`)
      
      resolve({
        port: PORT,
        ip: getLocalIP(),
        stop: () => httpServer.close()
      })
    })
    
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`)
        console.log('🔄 Trying to find available port...')
        
        const tryNextPort = (port: number) => {
          const testServer = httpServer.listen(port, () => {
            console.log(`🚀 Mobile Sync Server running on port ${port}`)
            console.log(`📱 Local IP: ${getLocalIP()}`)
            console.log(`📱 Server URL: http://${getLocalIP()}:${port}`)
            console.log(`📱 Mobile URL: http://${getLocalIP()}:${port}/mobile`)
            
            resolve({
              port: port,
              ip: getLocalIP(),
              stop: () => httpServer.close()
            })
          })
          
          testServer.on('error', (err: any) => {
            if (err.code === 'EADDRINUSE' && port < PORT + 10) {
              tryNextPort(port + 1)
            } else {
              reject(err)
            }
          })
        }
        
        tryNextPort(PORT + 1)
      } else {
        reject(error)
      }
    })
  })
}

if (require.main === module) {
  startMobileSyncServer()
}
