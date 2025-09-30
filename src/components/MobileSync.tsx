import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import QRCode from 'qrcode'
import { FaMobile, FaTimes, FaCheckCircle, FaSpinner, FaCloudUploadAlt } from 'react-icons/fa'
import { toast } from 'sonner'
import { io, Socket } from 'socket.io-client'

interface MobileSyncProps {
  onClose: () => void
  onFilesReceived: (files: string[]) => void
}

interface SessionData {
  sessionId: string
  token: string
  url: string
  ip: string
  port: number
}

export default function MobileSync({ onClose, onFilesReceived }: MobileSyncProps) {
  const [qrCode, setQrCode] = useState<string>('')
  const [session, setSession] = useState<SessionData | null>(null)
  const [mobileConnected, setMobileConnected] = useState(false)
  const [filesReceived, setFilesReceived] = useState(0)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    let retryCount = 0
    const maxRetries = 3
    
    const tryCreateSession = async () => {
      try {
        await createSession()
      } catch (error) {
        if (retryCount < maxRetries) {
          retryCount++
          console.log(`Retrying session creation (${retryCount}/${maxRetries})...`)
          setTimeout(tryCreateSession, 1000 * retryCount)
        }
      }
    }
    
    tryCreateSession()
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [])

  const createSession = async () => {
    try {
      const serverUrl = 'http://localhost:3030'
      
      const checkServer = await fetch(`${serverUrl}/api/session/create`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }).catch(() => null)
      
      if (!checkServer || !checkServer.ok) {
        throw new Error('Сервер недоступен. Перезапустите приложение.')
      }
      
      const data: SessionData = await checkServer.json()
      
      setSession(data)
      
      const qr = await QRCode.toDataURL(data.url, {
        width: 250,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        type: 'image/png',
        quality: 1.0,
        errorCorrectionLevel: 'L'
      })
      
      setQrCode(qr)
      
      const socket = io(serverUrl)
      socketRef.current = socket
      
      socket.emit('desktop-connect', { sessionId: data.sessionId })
      
      socket.on('mobile-connected', () => {
        setMobileConnected(true)
        toast.success('📱 Телефон подключен!', {
          duration: 3000,
          style: { background: 'var(--bg-success)', color: 'var(--text-success)' }
        })
      })
      
      socket.on('mobile-disconnected', () => {
        setMobileConnected(false)
        toast.info('📱 Телефон отключен', {
          duration: 2000
        })
      })
      
      socket.on('files-uploaded', ({ files }) => {
        const paths = files.map((f: any) => f.path)
        setFilesReceived(prev => prev + files.length)
        onFilesReceived(paths)
        
        toast.success(`📸 Получено ${files.length} фото с телефона`, {
          duration: 3000,
          style: { background: 'var(--bg-success)', color: 'var(--text-success)' }
        })
      })
      
    } catch (error) {
      console.error('Error creating session:', error)
      const message = error instanceof Error ? error.message : 'Ошибка создания сессии'
      toast.error(`❌ ${message}`, {
        duration: 5000,
        description: 'Убедитесь, что приложение запущено корректно'
      })
    }
  }

  const sendProcessingUpdate = (type: string, data: any) => {
    if (socketRef.current && session) {
      socketRef.current.emit(type, { sessionId: session.sessionId, ...data })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 max-w-md w-full mx-4 border border-white/10 shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          <FaTimes className="w-5 h-5 text-slate-400" />
        </button>

        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/20 mb-6"
          >
            <FaMobile className="w-8 h-8 text-blue-400" />
          </motion.div>

          <h2 className="text-3xl font-bold text-white mb-2">
            Мобильная синхронизация
          </h2>
          
          <p className="text-slate-400 mb-6">
            Отсканируйте QR-код на телефоне
          </p>

          <AnimatePresence mode="wait">
            {!qrCode ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center h-[300px]"
              >
                <FaSpinner className="w-12 h-12 text-blue-400 animate-spin" />
              </motion.div>
            ) : (
              <motion.div
                key="qr"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative"
              >
                <div className="bg-white rounded-2xl p-4 inline-block shadow-lg">
                  <img src={qrCode} alt="QR Code" className="w-[250px] h-[250px]" />
                </div>

                {mobileConnected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-4 -right-4 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg"
                  >
                    <FaCheckCircle className="w-6 h-6 text-white" />
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {session && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-6 space-y-3"
            >
              <div className="flex items-center justify-center gap-3 text-sm">
                <div className={`px-3 py-1 rounded-full ${
                  mobileConnected 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-slate-700/50 text-slate-400'
                }`}>
                  {mobileConnected ? '✓ Подключено' : '○ Ожидание'}
                </div>
                {filesReceived > 0 && (
                  <div className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400">
                    <FaCloudUploadAlt className="inline w-3 h-3 mr-1" />
                    {filesReceived} файлов
                  </div>
                )}
              </div>

              <div className="text-xs text-slate-500 space-y-1">
                <div>IP: {session.ip}:{session.port}</div>
                <div>Код: {session.token}</div>
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20"
          >
            <p className="text-sm text-blue-300 mb-2">
              💡 Как использовать:
            </p>
            <ol className="text-xs text-slate-400 text-left space-y-1">
              <li>1. Откройте камеру на телефоне</li>
              <li>2. Наведите на QR-код</li>
              <li>3. Нажмите на уведомление/ссылку</li>
              <li>4. Загрузите фото</li>
            </ol>
            
            <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-xs text-yellow-300">
                ⚠️ Если QR не читается, используйте ссылку ниже
              </p>
            </div>
            
            {session && (
              <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
                <p className="text-xs text-slate-300 mb-2">
                  🔗 Или введите ссылку вручную:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={session.url}
                    readOnly
                    className="flex-1 px-2 py-1 bg-slate-700/50 border border-slate-600 rounded text-xs text-slate-300"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(session.url)
                      toast.success('Ссылка скопирована!', { duration: 2000 })
                    }}
                    className="px-2 py-1 bg-blue-600/80 hover:bg-blue-500 rounded text-xs"
                  >
                    📋
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  )
}