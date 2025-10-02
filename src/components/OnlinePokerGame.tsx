import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { FaArrowLeft } from 'react-icons/fa'
import { useNavigate, useSearchParams } from 'react-router-dom'

interface Card {
  suit: '♠' | '♥' | '♦' | '♣'
  value: string
  held?: boolean
}

interface GameState {
  phase: 'waiting' | 'betting' | 'dealing' | 'holding' | 'result'
  players: Array<{
    name: string
    balance: number
    bet: number
    cards: Card[]
    hand: string
    payout: number
  }>
  currentPlayerIndex: number
  deck: Card[]
}

const OnlinePokerGame = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const roomId = searchParams.get('roomId')
  
  console.log('[OnlinePoker] Component loaded with roomId:', roomId)
  console.log('[OnlinePoker] URL search params:', searchParams.toString())
  console.log('[OnlinePoker] Current URL:', window.location.href)
  
  const [connected, setConnected] = useState(false)
  const [myName, setMyName] = useState('')
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const connectionAttemptRef = useRef<number>(0)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const maxReconnectAttempts = 3
  const hasInitializedRef = useRef<boolean>(false)

  useEffect(() => {
    // Prevent multiple initializations of the same component
    if (hasInitializedRef.current) {
      console.log('[OnlinePoker] Component already initialized, skipping...')
      return
    }
    hasInitializedRef.current = true

    const name = localStorage.getItem('onlinePlayerName') || 'Player'
    setMyName(name)

    if (!roomId) {
      console.error('[OnlinePoker] No roomId found!')
      return
    }

    if (isConnecting) {
      console.log('[OnlinePoker] Already connecting, skipping...')
      return
    }

    const attemptNumber = ++connectionAttemptRef.current
    console.log(`[OnlinePoker] Starting connection attempt ${attemptNumber}`)

    const savedUrl = localStorage.getItem('gameServerUrl')
    const serverUrl = (savedUrl && !savedUrl.includes('10.11.10.217')) ? savedUrl : 'ws://localhost:8082'

    setIsConnecting(true)
    const ws = new WebSocket(serverUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log(`[OnlinePoker] Connected (attempt ${attemptNumber})`)
      setConnected(true)
      setIsConnecting(false)

      console.log('[OnlinePoker] Joining room:', roomId, 'as', name)
      ws.send(JSON.stringify({
        type: 'joinRoom',
        roomId: roomId,
        playerName: name
      }))
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        console.log('[OnlinePoker] Received message:', msg.type, msg)

        if (msg.type === 'connected') {
          console.log('[OnlinePoker] Connected to server')
        }

        if (msg.type === 'roomJoined') {
          console.log('[OnlinePoker] Successfully joined room:', msg.room)
          if (msg.room && msg.room.gameInProgress) {
            console.log('[OnlinePoker] Game already in progress, requesting state')
            ws.send(JSON.stringify({
              type: 'requestGameState'
            }))

            // Set a timeout to request state again if we don't get it
            setTimeout(() => {
              if (!gameState && ws.readyState === WebSocket.OPEN) {
                console.log('[OnlinePoker] No game state received, requesting again')
                ws.send(JSON.stringify({
                  type: 'requestGameState'
                }))
              }
            }, 2000)
          }
        }

        if (msg.type === 'error') {
          console.error('[OnlinePoker] Server error:', msg.message)
          toast.error(msg.message)
        }

        if (msg.type === 'gameStarted') {
          console.log('[OnlinePoker] Game started, players:', msg.players)

          const initialState: GameState = {
            phase: 'betting',
            players: msg.players.map((playerName: string) => ({
              name: playerName,
              balance: 10000,
              bet: 0,
              cards: [],
              hand: '',
              payout: 0
            })),
            currentPlayerIndex: 0,
            deck: createDeck()
          }

          setGameState(initialState)

          if (msg.players[0] === myName) {
            console.log('[OnlinePoker] I am the host, broadcasting initial state')
            broadcastState(initialState)
          } else {
            console.log('[OnlinePoker] I am a client, waiting for host state')
          }
        }

        if (msg.type === 'gameStateUpdate') {
          console.log('[OnlinePoker] State update from', msg.player)
          setGameState(msg.state)
        }

        if (msg.type === 'gameAction') {
          console.log('[OnlinePoker] Action from', msg.player, ':', msg.action)
        }
      } catch (err) {
        console.error('[OnlinePoker] Message error:', err)
      }
    }

    ws.onclose = (event) => {
      console.log(`[OnlinePoker] Disconnected (attempt ${attemptNumber})`, event.code, event.reason)
      setConnected(false)
      setIsConnecting(false)

      // Don't retry on normal closure (1000) or if we're already at max attempts
      if (event.code !== 1000 && attemptNumber < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, attemptNumber - 1), 5000)
        console.log(`[OnlinePoker] Reconnecting in ${delay}ms (attempt ${attemptNumber + 1}/${maxReconnectAttempts})`)
        reconnectTimeoutRef.current = window.setTimeout(() => {
          if (roomId) {
            // This will trigger the useEffect again
            setConnected(false)
            setIsConnecting(false)
          }
        }, delay)
      } else if (event.code !== 1000) {
        toast.error('Соединение с игрой потеряно')
      }
    }

    ws.onerror = (error) => {
      console.error(`[OnlinePoker] WebSocket error (attempt ${attemptNumber}):`, error)
      setIsConnecting(false)

      if (attemptNumber < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, attemptNumber - 1), 5000)
        console.log(`[OnlinePoker] Retrying connection in ${delay}ms (attempt ${attemptNumber + 1}/${maxReconnectAttempts})`)
        reconnectTimeoutRef.current = window.setTimeout(() => {
          if (roomId) {
            // This will trigger the useEffect again
            setConnected(false)
            setIsConnecting(false)
          }
        }, delay)
      } else {
        toast.error('Не удалось подключиться к игре. Проверьте подключение к серверу.')
      }
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [roomId])


  const createDeck = (): Card[] => {
    const suits: Array<'♠' | '♥' | '♦' | '♣'> = ['♠', '♥', '♦', '♣']
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
    const deck: Card[] = []
    
    for (const suit of suits) {
      for (const value of values) {
        deck.push({ suit, value })
      }
    }
    
    return deck.sort(() => Math.random() - 0.5)
  }

  const broadcastState = (state: GameState) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[OnlinePoker] Broadcasting state:', state.phase, 'players:', state.players.length)
      wsRef.current.send(JSON.stringify({
        type: 'gameState',
        state
      }))
    } else {
      console.error('[OnlinePoker] Cannot broadcast - WebSocket not open')
    }
  }

  const placeBet = (amount: number) => {
    if (!gameState || gameState.phase !== 'betting') return

    const newState = { ...gameState }
    const myPlayerIndex = newState.players.findIndex(p => p.name === myName)
    if (myPlayerIndex === -1) return
    
    const player = newState.players[myPlayerIndex]
    
    if (player.balance < amount) {
      toast.error('Недостаточно средств')
      return
    }

    player.bet = amount
    player.balance -= amount
    newState.phase = 'dealing'

    dealCards(newState, myPlayerIndex)
  }

  const dealCards = (state: GameState, playerIndex: number) => {
    const player = state.players[playerIndex]
    const cards = state.deck.splice(0, 5)
    player.cards = cards

    state.phase = 'holding'
    state.currentPlayerIndex = playerIndex
    setGameState(state)
    broadcastState(state)
  }

  const toggleHold = (index: number) => {
    if (!gameState || gameState.phase !== 'holding') return

    const newState = { ...gameState }
    const myPlayerIndex = newState.players.findIndex(p => p.name === myName)
    if (myPlayerIndex === -1) return
    
    const player = newState.players[myPlayerIndex]
    if (!player.cards[index]) return
    
    player.cards[index].held = !player.cards[index].held

    setGameState(newState)
    broadcastState(newState)
  }

  const draw = () => {
    if (!gameState || gameState.phase !== 'holding') return

    const newState = { ...gameState }
    const myPlayerIndex = newState.players.findIndex(p => p.name === myName)
    if (myPlayerIndex === -1) return
    
    const player = newState.players[myPlayerIndex]

    for (let i = 0; i < player.cards.length; i++) {
      if (!player.cards[i].held && newState.deck.length > 0) {
        player.cards[i] = newState.deck.shift()!
      }
    }

    const hand = evaluateHand(player.cards)
    player.hand = hand
    player.payout = calculatePayout(hand, player.bet)
    player.balance += player.payout

    newState.phase = 'result'
    setGameState(newState)
    broadcastState(newState)

    if (player.payout > 0) {
      toast.success(`Выигрыш: ${player.payout} монет!`)
    }
  }

  const evaluateHand = (cards: Card[]): string => {
    const values = cards.map(c => c.value)
    const suits = cards.map(c => c.suit)
    
    const valueCounts: Record<string, number> = {}
    values.forEach(v => valueCounts[v] = (valueCounts[v] || 0) + 1)
    
    const counts = Object.values(valueCounts).sort((a, b) => b - a)
    const isFlush = suits.every(s => s === suits[0])
    
    const valueOrder = ['2','3','4','5','6','7','8','9','10','J','Q','K','A']
    const indices = values.map(v => valueOrder.indexOf(v)).sort((a,b)=>a-b)
    const isStraight = indices.every((v, i) => i === 0 || v === indices[i-1] + 1)
    
    if (isStraight && isFlush && values.includes('A') && values.includes('K')) return 'Royal Flush'
    if (isStraight && isFlush) return 'Straight Flush'
    if (counts[0] === 4) return 'Four of a Kind'
    if (counts[0] === 3 && counts[1] === 2) return 'Full House'
    if (isFlush) return 'Flush'
    if (isStraight) return 'Straight'
    if (counts[0] === 3) return 'Three of a Kind'
    if (counts[0] === 2 && counts[1] === 2) return 'Two Pair'
    if (counts[0] === 2) return 'Pair'
    return 'High Card'
  }

  const calculatePayout = (hand: string, bet: number): number => {
    const payouts: Record<string, number> = {
      'Royal Flush': 250,
      'Straight Flush': 50,
      'Four of a Kind': 25,
      'Full House': 9,
      'Flush': 6,
      'Straight': 4,
      'Three of a Kind': 3,
      'Two Pair': 2,
      'Pair': 1,
      'High Card': 0
    }
    return bet * (payouts[hand] || 0)
  }

  const newRound = () => {
    if (!gameState) return
    
    const newState = { ...gameState }
    newState.phase = 'betting'
    
    newState.players.forEach(player => {
      player.cards = []
      player.hand = ''
      player.payout = 0
      player.bet = 0
    })
    
    if (newState.deck.length < 52) {
      newState.deck = createDeck()
    }

    setGameState(newState)
    broadcastState(newState)
  }

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">Подключение к игре...</div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
        </div>
      </div>
    )
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-6">🃏 Онлайн Покер</h1>
          <p className="text-white/70 mb-8">Комната: {roomId}</p>
          <p className="text-white/70 mb-8">Ожидание начала игры...</p>
          <button onClick={() => navigate('/fun/online')} className="btn btn-ghost mt-4">
            <FaArrowLeft /> Назад в лобби
          </button>
        </div>
      </div>
    )
  }

  const myPlayer = gameState.players.find(p => p.name === myName) || gameState.players[0]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/fun/online')} className="btn btn-ghost text-white">
            <FaArrowLeft /> Вернуться
          </button>
          <div className="text-white text-center">
            <h1 className="text-2xl font-bold">🃏 Онлайн Покер</h1>
            <p className="text-sm text-white/60">Комната: {roomId}</p>
          </div>
          <div className="text-white text-right">
            <p className="text-sm">Баланс</p>
            <p className="text-2xl font-bold text-green-400">{myPlayer.balance} 💰</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {gameState.players.map((player, idx) => (
            <motion.div
              key={player.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-black/40 backdrop-blur rounded-xl border ${
                idx === gameState.currentPlayerIndex ? 'border-yellow-400' : 'border-white/20'
              } p-4`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-bold">{player.name}</h3>
                <div className="text-green-400 font-bold">{player.balance} 💰</div>
              </div>

              {player.cards.length > 0 && (
                <div className="flex gap-2 mb-3">
                  {player.cards.map((card, i) => (
                    <motion.div
                      key={i}
                      whileHover={{ scale: 1.05 }}
                      onClick={() => player.name === myName && toggleHold(i)}
                      className={`bg-white rounded-lg p-2 cursor-pointer ${
                        card.held ? 'ring-2 ring-yellow-400' : ''
                      } ${['♥', '♦'].includes(card.suit) ? 'text-red-600' : 'text-black'}`}
                    >
                      <div className="text-center text-lg font-bold">
                        {card.value}
                        {card.suit}
                      </div>
                      {card.held && <div className="text-xs text-center text-yellow-600">HOLD</div>}
                    </motion.div>
                  ))}
                </div>
              )}

              {player.hand && (
                <div className="text-center text-yellow-400 font-bold mb-2">
                  {player.hand}
                </div>
              )}

              {player.payout > 0 && (
                <div className="text-center text-green-400 font-bold">
                  Выигрыш: {player.payout} 💰
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {myPlayer.name === myName && (
          <div className="mt-6 bg-black/40 backdrop-blur rounded-xl border border-white/20 p-6">
            {gameState.phase === 'betting' && (
              <div className="text-center">
                <p className="text-white mb-4">Сделайте ставку:</p>
                <div className="flex gap-3 justify-center">
                  {[10, 50, 100, 500].map(amount => (
                    <button
                      key={amount}
                      onClick={() => placeBet(amount)}
                      disabled={myPlayer.balance < amount}
                      className="btn btn-primary disabled:opacity-50"
                    >
                      {amount} 💰
                    </button>
                  ))}
                </div>
              </div>
            )}

            {gameState.phase === 'holding' && (
              <div className="text-center">
                <p className="text-white mb-4">Выберите карты для обмена (нажмите HOLD)</p>
                <button onClick={draw} className="btn btn-success btn-lg">
                  🔄 Обменять карты
                </button>
              </div>
            )}

            {gameState.phase === 'result' && (
              <div className="text-center">
                <button onClick={newRound} className="btn btn-primary btn-lg">
                  ▶️ Следующий раунд
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default OnlinePokerGame