import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { FaCopy, FaUsers, FaGamepad, FaWifi, FaSync } from 'react-icons/fa'
import { toast } from 'sonner'

interface Room {
  id: string
  name: string
  game: 'poker' | 'blackjack'
  players: string[]
  maxPlayers: number
  createdAt: number
  isHost?: boolean
  readyPlayers?: string[]
  gameStarting?: boolean
}

const OnlineLobby = () => {
  const [rooms, setRooms] = useState<Room[]>([])
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [selectedGame, setSelectedGame] = useState<'poker' | 'blackjack'>('poker')
  const [maxPlayers, setMaxPlayers] = useState(4)
  const [playerName, setPlayerName] = useState(() => {
    try {
      return localStorage.getItem('onlinePlayerName') || ''
    } catch {
      return ''
    }
  })
  const [joinRoomId, setJoinRoomId] = useState('')
  const [serverUrl, setServerUrl] = useState(() => {
    try {
      return localStorage.getItem('gameServerUrl') || 'ws://localhost:8082'
    } catch {
      return 'ws://localhost:8082'
    }
  })
  const [connected, setConnected] = useState(false)
  const [myRoom, setMyRoom] = useState<Room | null>(null)
  const [localIp, setLocalIp] = useState<string>('')
  const [networkUrl, setNetworkUrl] = useState<string>('')
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5
  const refreshIntervalRef = useRef<number | null>(null)

  useEffect(() => {
    const fetchServerInfo = async () => {
      try {
        const w = window as any
        if (w.electron?.invoke) {
          const info = await w.electron.invoke('game-server-info')
          if (info?.ok) {
            setLocalIp(info.localIp || 'localhost')
            setNetworkUrl(info.networkUrl || `ws://${info.localIp}:8082`)
            console.log('[GameClient] Server info:', info)
          }
        }
      } catch (err) {
        console.error('[GameClient] Failed to get server info:', err)
      }
    }
    
    fetchServerInfo()
  }, [])

  useEffect(() => {
    const connectToServer = () => {
      try {
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
          reconnectTimeoutRef.current = null
        }

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          return
        }

        if (wsRef.current) {
          try {
            wsRef.current.close()
          } catch {}
        }

        const ws = new WebSocket(serverUrl)
        wsRef.current = ws

        ws.onopen = () => {
          console.log('[GameClient] Connected to server')
          setConnected(true)
          reconnectAttemptsRef.current = 0
          ws.send(JSON.stringify({ type: 'getRooms' }))
          
          if (refreshIntervalRef.current) {
            clearInterval(refreshIntervalRef.current)
          }
          refreshIntervalRef.current = window.setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'getRooms' }))
            }
          }, 10000)
        }

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data)
            
            if (msg.type === 'connected') {
              reconnectAttemptsRef.current = 0
            }
            
            if (msg.type === 'roomList' || msg.type === 'roomListUpdate') {
              setRooms(msg.rooms || [])
            }
            
            if (msg.type === 'roomCreated') {
              const room = { 
                ...msg.room, 
                isHost: true,
                gameStarting: false,
                readyPlayers: []
              }
              setMyRoom(room)
              console.log('[OnlineLobby] Room created:', room)
              toast.success('Комната создана!')
            }
            
            if (msg.type === 'roomJoined') {
              const room = { 
                ...msg.room, 
                isHost: false,
                gameStarting: false,
                readyPlayers: []
              }
              setMyRoom(room)
              console.log('[OnlineLobby] Room joined:', room)
              toast.success('Вы присоединились!')
            }
            
            if (msg.type === 'playerJoined') {
              toast.info(`${msg.player} присоединился`)
              setMyRoom(prev => {
                if (!prev) return null
                return { ...prev, players: msg.players }
              })
            }
            
            if (msg.type === 'playerLeft') {
              toast.info(`${msg.player} покинул комнату`)
              setMyRoom(prev => {
                if (!prev) return null
                return { ...prev, players: msg.players }
              })
            }
            
            if (msg.type === 'gameStarting') {
              setMyRoom(prev => prev ? { ...prev, gameStarting: true, readyPlayers: msg.readyPlayers || [] } : null)
              toast.info('Игра начинается! Подтвердите готовность')
            }
            
            if (msg.type === 'playerReady') {
              toast.info(`${msg.player} готов!`)
              setMyRoom(prev => prev ? { ...prev, readyPlayers: msg.readyPlayers || [] } : null)
            }
            
            if (msg.type === 'roomLeft') {
              setMyRoom(null)
            }
            
            if (msg.type === 'error') {
              toast.error(msg.message)
            }
            
            if (msg.type === 'gameStarted') {
              console.log('[GameClient] Game started:', msg)
              toast.success(`Игра начинается: ${msg.game === 'poker' ? 'Poker' : 'Blackjack'}`)
              
              setTimeout(() => {
                const path = `/fun/online/${msg.game}?roomId=${msg.roomId}`
                window.location.hash = path
              }, 500)
            }
          } catch (err) {
            console.error('Error parsing message:', err)
          }
        }

        ws.onerror = () => {
          setConnected(false)
        }

        ws.onclose = () => {
          console.log('[GameClient] Disconnected from server')
          setConnected(false)
          
          if (refreshIntervalRef.current) {
            clearInterval(refreshIntervalRef.current)
            refreshIntervalRef.current = null
          }
          
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current++
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 10000)
            console.log(`[GameClient] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`)
            reconnectTimeoutRef.current = window.setTimeout(connectToServer, delay)
          } else {
            console.log('[GameClient] Max reconnect attempts reached')
            toast.error('Не удалось подключиться к серверу. Проверьте что сервер запущен.')
          }
        }
      } catch (err) {
        console.error('Connection error:', err)
        setConnected(false)
      }
    }

    connectToServer()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
      if (wsRef.current) {
        try {
          wsRef.current.close()
        } catch {}
      }
    }
  }, [serverUrl])

  const createRoom = () => {
    if (!connected) {
      toast.error('Нет подключения к серверу')
      return
    }
    if (!playerName.trim()) {
      toast.error('Введите ваше имя')
      return
    }
    if (!roomName.trim()) {
      toast.error('Введите название комнаты')
      return
    }

    try {
      localStorage.setItem('onlinePlayerName', playerName)
    } catch {}

    wsRef.current?.send(JSON.stringify({
      type: 'createRoom',
      name: roomName.trim(),
      game: selectedGame,
      maxPlayers,
      playerName: playerName.trim()
    }))

    setShowCreateRoom(false)
    setRoomName('')
  }

  const joinRoom = (roomId: string) => {
    if (!connected) {
      toast.error('Нет подключения к серверу')
      return
    }
    if (!playerName.trim()) {
      toast.error('Введите ваше имя')
      return
    }

    try {
      localStorage.setItem('onlinePlayerName', playerName)
    } catch {}

    wsRef.current?.send(JSON.stringify({
      type: 'joinRoom',
      roomId,
      playerName: playerName.trim()
    }))

    setJoinRoomId('')
  }

  const leaveRoom = () => {
    if (!connected) return

    wsRef.current?.send(JSON.stringify({
      type: 'leaveRoom'
    }))

    setMyRoom(null)
  }

  const refreshRooms = () => {
    if (!connected) {
      toast.error('Нет подключения к серверу')
      return
    }

    wsRef.current?.send(JSON.stringify({
      type: 'getRooms'
    }))

    toast.success('Список комнат обновлён')
  }

  const startGame = () => {
    if (!connected) {
      toast.error('Нет подключения к серверу')
      return
    }

    if (!myRoom) {
      toast.error('Вы не в комнате')
      return
    }

    if (myRoom.players.length < 2) {
      toast.error('Нужно минимум 2 игрока')
      return
    }

    wsRef.current?.send(JSON.stringify({
      type: 'startGame'
    }))
    
    toast.info('Ожидание готовности игроков...')
  }

  const markReady = () => {
    if (!connected || !myRoom) return

    wsRef.current?.send(JSON.stringify({
      type: 'playerReady'
    }))
  }

  const copyRoomId = async (roomId: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(roomId)
        toast.success('Код комнаты скопирован!')
        return
      }
    } catch (err) {
      console.log('Clipboard API failed, trying fallback')
    }

    try {
      const textArea = document.createElement('textarea')
      textArea.value = roomId
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)
      
      if (successful) {
        toast.success('Код комнаты скопирован!')
      } else {
        toast.error('Не удалось скопировать. Код: ' + roomId)
      }
    } catch (err) {
      toast.error('Не удалось скопировать. Код: ' + roomId)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-500 bg-clip-text text-transparent mb-2">
                🌐 Онлайн Лобби
              </h1>
              <p className="text-white/60">Играйте с друзьями по локальной сети</p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`px-4 py-2 rounded-lg flex items-center gap-2 ${connected ? 'bg-green-600/30 text-green-300 border border-green-500/50' : 'bg-red-600/30 text-red-300 border border-red-500/50'}`}>
                <FaWifi className={connected ? 'animate-pulse' : ''} />
                <span className="text-sm font-medium">{connected ? 'Подключено' : 'Отключено'}</span>
              </div>
            </div>
          </div>
          <div className="bg-black/40 backdrop-blur rounded-xl border border-white/20 p-3">
            <label className="text-white/60 text-xs mb-1 block">Адрес сервера:</label>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => {
                setServerUrl(e.target.value)
                try {
                  localStorage.setItem('gameServerUrl', e.target.value)
                } catch {}
              }}
              placeholder="ws://192.168.1.100:8082"
              className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded text-white text-sm font-mono"
            />
            {localIp && (
              <div className="mt-3 p-3 bg-green-900/20 border border-green-500/30 rounded">
                <p className="text-green-300 text-xs font-bold mb-1">📡 Ваш IP адрес: {localIp}</p>
                <p className="text-green-200/70 text-xs mb-2">Для подключения с других устройств используйте:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-2 py-1 bg-slate-900 text-green-300 rounded text-xs font-mono">
                    {networkUrl}
                  </code>
                  <button 
                    onClick={() => {
                      navigator.clipboard?.writeText(networkUrl)
                      toast.success('Адрес скопирован!')
                    }}
                    className="btn btn-ghost text-xs"
                  >
                    <FaCopy />
                  </button>
                </div>
              </div>
            )}
            <p className="text-white/40 text-xs mt-2">
              {connected ? '✅ Сервер запущен автоматически' : '⚠️ Убедитесь что приложение запущено'}
            </p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-1 space-y-4">
            <div className="bg-black/40 backdrop-blur rounded-xl border border-white/20 p-4">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <FaUsers className="text-blue-400" />
                Ваш профиль
              </h3>
              <input
                type="text"
                placeholder="Ваше имя"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                disabled={!!myRoom}
                className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded text-white text-sm disabled:opacity-50"
              />
            </div>

            {myRoom && (
              <div className="bg-green-600/20 backdrop-blur rounded-xl border border-green-500/50 p-4">
                <h3 className="text-white font-bold mb-3">Ваша комната</h3>
                <div className="space-y-2">
                  <div className="bg-slate-900/50 rounded p-2">
                    <p className="text-white/60 text-xs">Название:</p>
                    <p className="text-white font-medium">{myRoom.name}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded p-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/60 text-xs">Код комнаты:</p>
                        <p className="text-white font-mono text-lg font-bold">{myRoom.id}</p>
                      </div>
                      <button onClick={() => copyRoomId(myRoom.id)} className="btn btn-ghost text-xs">
                        <FaCopy /> Копировать
                      </button>
                    </div>
                  </div>
                  <div className="bg-slate-900/50 rounded p-2">
                    <p className="text-white/60 text-xs">Игроки ({myRoom.players.length}/{myRoom.maxPlayers}):</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {myRoom.players.map((p, i) => (
                        <span key={i} className="px-2 py-1 bg-blue-600/30 text-blue-200 rounded text-xs">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {myRoom.gameStarting ? (
                      <>
                        {(myRoom.readyPlayers || []).includes(playerName) ? (
                          <div className="flex-1 text-center text-green-400 text-xs py-2">
                            ✅ Вы готовы! Ожидание других...
                          </div>
                        ) : (
                          <button 
                            onClick={markReady}
                            className="btn btn-success flex-1 text-xs"
                          >
                            ✅ Готов!
                          </button>
                        )}
                      </>
                    ) : (
                      myRoom.isHost && (
                        <button 
                          onClick={startGame} 
                          disabled={myRoom.players.length < 2}
                          className="btn btn-success flex-1 text-xs disabled:opacity-50"
                        >
                          🎮 Начать игру
                        </button>
                      )
                    )}
                    <button onClick={leaveRoom} className="btn btn-error flex-1 text-xs">
                      Покинуть
                    </button>
                  </div>
                  
                  {myRoom.gameStarting && (
                    <div className="mt-2 p-2 bg-yellow-900/20 rounded text-xs text-yellow-300">
                      Готовы: {(myRoom.readyPlayers || []).length} / {myRoom.players.length}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {myRoom.players.map(p => (
                          <span 
                            key={p} 
                            className={`px-2 py-1 rounded ${
                              (myRoom.readyPlayers || []).includes(p) 
                                ? 'bg-green-600/30 text-green-200' 
                                : 'bg-gray-600/30 text-gray-300'
                            }`}
                          >
                            {p} {(myRoom.readyPlayers || []).includes(p) ? '✓' : '○'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!myRoom && (
              <div className="bg-black/40 backdrop-blur rounded-xl border border-white/20 p-4">
                <h3 className="text-white font-bold mb-3">Создать комнату</h3>
                {!showCreateRoom ? (
                  <button onClick={() => setShowCreateRoom(true)} disabled={!connected} className="btn btn-primary w-full disabled:opacity-50">
                    + Новая комната
                  </button>
                ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Название комнаты"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded text-white text-sm"
                  />
                  <select
                    value={selectedGame}
                    onChange={(e) => setSelectedGame(e.target.value as 'poker' | 'blackjack')}
                    className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded text-white text-sm"
                  >
                    <option value="poker">Poker</option>
                    <option value="blackjack">Blackjack</option>
                  </select>
                  <div>
                    <label className="text-white/60 text-xs">Максимум игроков: {maxPlayers}</label>
                    <input
                      type="range"
                      min="2"
                      max="8"
                      value={maxPlayers}
                      onChange={(e) => setMaxPlayers(Number(e.target.value))}
                      className="w-full mt-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={createRoom} className="btn btn-success flex-1 text-xs">
                      Создать
                    </button>
                    <button onClick={() => setShowCreateRoom(false)} className="btn btn-ghost flex-1 text-xs">
                      Отмена
                    </button>
                  </div>
                </div>
                )}
              </div>
            )}

            {!myRoom && (
              <div className="bg-black/40 backdrop-blur rounded-xl border border-white/20 p-4">
                <h3 className="text-white font-bold mb-3">Присоединиться по коду</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Код комнаты"
                    value={joinRoomId}
                    onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                    disabled={!connected}
                    className="flex-1 px-3 py-2 bg-slate-900 border border-white/10 rounded text-white text-sm uppercase disabled:opacity-50"
                  />
                  <button onClick={() => joinRoom(joinRoomId)} disabled={!connected} className="btn btn-primary text-xs disabled:opacity-50">
                    Войти
                  </button>
                </div>
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2">
            <div className="bg-black/40 backdrop-blur rounded-xl border border-white/20 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <FaGamepad className="text-purple-400" />
                  Активные комнаты ({rooms.length})
                </h3>
                <button 
                  onClick={refreshRooms} 
                  disabled={!connected}
                  className="btn btn-ghost text-xs flex items-center gap-1 disabled:opacity-50"
                >
                  <FaSync /> Обновить
                </button>
              </div>
              {!connected ? (
                <div className="text-center py-12 text-white/40">
                  <FaWifi className="text-6xl mx-auto mb-4 opacity-20" />
                  <p>Подключитесь к серверу</p>
                  <p className="text-sm mt-2">Укажите адрес сервера выше</p>
                </div>
              ) : rooms.length === 0 ? (
                <div className="text-center py-12 text-white/40">
                  <FaUsers className="text-6xl mx-auto mb-4 opacity-20" />
                  <p>Нет активных комнат</p>
                  <p className="text-sm mt-2">Создайте первую комнату!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rooms.map((room) => (
                    <motion.div
                      key={room.id}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-slate-900/50 rounded-lg p-4 border border-white/10"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="text-white font-semibold">{room.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-1 rounded ${room.game === 'poker' ? 'bg-green-600' : 'bg-red-600'} text-white`}>
                              {room.game === 'poker' ? '🃏 Poker' : '🎴 Blackjack'}
                            </span>
                            <span className="text-xs text-white/60">
                              {room.players.length}/{room.maxPlayers} игроков
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => copyRoomId(room.id)} className="btn btn-ghost text-xs">
                            <FaCopy /> {room.id}
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {room.players.map((player, i) => (
                          <span key={i} className="text-xs bg-blue-600/30 text-blue-200 px-2 py-1 rounded">
                            {player}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button 
                          onClick={() => joinRoom(room.id)} 
                          disabled={room.players.length >= room.maxPlayers || myRoom !== null}
                          className="btn btn-success text-xs flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {room.players.length >= room.maxPlayers ? 'Заполнена' : myRoom ? 'Вы уже в комнате' : 'Присоединиться'}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 bg-yellow-600/20 backdrop-blur rounded-xl border border-yellow-400/30 p-4">
              <h4 className="text-yellow-200 font-semibold mb-2">ℹ️ Как играть онлайн:</h4>
              <ol className="text-yellow-100/80 text-sm space-y-1 list-decimal list-inside">
                <li>Введите ваше имя в профиле</li>
                <li>Создайте комнату или присоединитесь по коду</li>
                <li>Отправьте код комнаты друзьям</li>
                <li>Когда все игроки присоединятся — начинайте игру!</li>
              </ol>
              <p className="text-yellow-100/60 text-xs mt-3">
                💡 Комнаты работают локально и синхронизируются через localStorage между вкладками на одном устройстве.
                Для игры с друзьями используйте screen sharing или играйте на одном компьютере.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default OnlineLobby

