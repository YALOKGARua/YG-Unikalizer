import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { FaArrowLeft } from 'react-icons/fa'
import { useNavigate, useSearchParams } from 'react-router-dom'

interface Card {
  suit: '♠' | '♥' | '♦' | '♣'
  value: string
}

interface GameState {
  phase: 'betting' | 'playing' | 'result'
  players: Array<{
    name: string
    balance: number
    bet: number
    hand: Card[]
    score: number
    status: 'playing' | 'stand' | 'bust' | 'blackjack' | 'win' | 'lose' | 'push'
  }>
  dealer: {
    hand: Card[]
    score: number
  }
  currentPlayerIndex: number
  deck: Card[]
}

const OnlineBlackjackGame = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const roomId = searchParams.get('roomId')
  
  const [connected, setConnected] = useState(false)
  const [myName, setMyName] = useState('')
  const [gameState, setGameState] = useState<GameState | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const name = localStorage.getItem('onlinePlayerName') || 'Player'
    setMyName(name)

    const serverUrl = localStorage.getItem('gameServerUrl') || 'ws://localhost:8082'
    const ws = new WebSocket(serverUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[OnlineBlackjack] Connected')
      setConnected(true)
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        
        if (msg.type === 'gameStarted') {
          console.log('[OnlineBlackjack] Game started, players:', msg.players)
          
          const initialState: GameState = {
            phase: 'betting',
            players: msg.players.map((playerName: string) => ({
              name: playerName,
              balance: 10000,
              bet: 0,
              hand: [],
              score: 0,
              status: 'playing'
            })),
            dealer: { hand: [], score: 0 },
            currentPlayerIndex: 0,
            deck: createDeck()
          }
          
          setGameState(initialState)
          
          if (msg.players[0] === name) {
            broadcastState(initialState)
          }
        }
        
        if (msg.type === 'gameStateUpdate') {
          console.log('[OnlineBlackjack] State update from', msg.player)
          setGameState(msg.state)
        }
      } catch (err) {
        console.error('[OnlineBlackjack] Message error:', err)
      }
    }

    ws.onclose = () => {
      console.log('[OnlineBlackjack] Disconnected')
      setConnected(false)
      toast.error('Соединение потеряно')
    }

    return () => {
      ws.close()
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

  const calculateScore = (hand: Card[]): number => {
    let score = 0
    let aces = 0

    for (const card of hand) {
      if (card.value === 'A') {
        aces++
        score += 11
      } else if (['J', 'Q', 'K'].includes(card.value)) {
        score += 10
      } else {
        score += parseInt(card.value)
      }
    }

    while (score > 21 && aces > 0) {
      score -= 10
      aces--
    }

    return score
  }

  const broadcastState = (state: GameState) => {
    wsRef.current?.send(JSON.stringify({
      type: 'gameState',
      state
    }))
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
    newState.currentPlayerIndex = myPlayerIndex
    
    dealInitialCards(newState, myPlayerIndex)
  }

  const dealInitialCards = (state: GameState, playerIndex: number) => {
    const player = state.players[playerIndex]
    
    player.hand = [state.deck.shift()!, state.deck.shift()!]
    
    if (!state.dealer.hand.length) {
      state.dealer.hand = [state.deck.shift()!, state.deck.shift()!]
      state.dealer.score = calculateScore([state.dealer.hand[0]])
    }
    
    player.score = calculateScore(player.hand)
    
    if (player.score === 21) {
      player.status = 'blackjack'
      player.balance += Math.floor(player.bet * 2.5)
      state.phase = 'result'
    } else {
      state.phase = 'playing'
    }

    setGameState(state)
    broadcastState(state)
  }

  const hit = () => {
    if (!gameState || gameState.phase !== 'playing') return

    const newState = { ...gameState }
    const myPlayerIndex = newState.players.findIndex(p => p.name === myName)
    if (myPlayerIndex === -1) return
    
    const player = newState.players[myPlayerIndex]
    
    player.hand.push(newState.deck.shift()!)
    player.score = calculateScore(player.hand)

    if (player.score > 21) {
      player.status = 'bust'
      newState.phase = 'result'
    }

    setGameState(newState)
    broadcastState(newState)
  }

  const stand = () => {
    if (!gameState || gameState.phase !== 'playing') return

    const newState = { ...gameState }
    const myPlayerIndex = newState.players.findIndex(p => p.name === myName)
    if (myPlayerIndex === -1) return
    
    const player = newState.players[myPlayerIndex]
    player.status = 'stand'

    dealerTurn(newState, myPlayerIndex)
  }

  const dealerTurn = (state: GameState, playerIndex: number) => {
    while (calculateScore(state.dealer.hand) < 17) {
      state.dealer.hand.push(state.deck.shift()!)
    }

    state.dealer.score = calculateScore(state.dealer.hand)
    
    const player = state.players[playerIndex]
    const playerScore = player.score
    const dealerScore = state.dealer.score

    if (dealerScore > 21 || playerScore > dealerScore) {
      player.status = 'win'
      player.balance += player.bet * 2
    } else if (playerScore === dealerScore) {
      player.status = 'push'
      player.balance += player.bet
    } else {
      player.status = 'lose'
    }

    state.phase = 'result'
    setGameState(state)
    broadcastState(state)
  }

  const newRound = () => {
    if (!gameState) return
    
    const newState = { ...gameState }
    newState.phase = 'betting'
    
    newState.players.forEach(player => {
      player.hand = []
      player.score = 0
      player.status = 'playing'
      player.bet = 0
    })
    
    newState.dealer.hand = []
    newState.dealer.score = 0
    
    if (newState.deck.length < 52) {
      newState.deck = createDeck()
    }

    setGameState(newState)
    broadcastState(newState)
  }

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Подключение...</div>
      </div>
    )
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-6">🎴 Онлайн Blackjack</h1>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/fun/online')} className="btn btn-ghost text-white">
            <FaArrowLeft /> Вернуться
          </button>
          <div className="text-white text-center">
            <h1 className="text-2xl font-bold">🎴 Онлайн Blackjack</h1>
            <p className="text-sm text-white/60">Комната: {roomId}</p>
          </div>
          <div className="text-white text-right">
            <p className="text-sm">Баланс</p>
            <p className="text-2xl font-bold text-green-400">{myPlayer.balance} 💰</p>
          </div>
        </div>

        <div className="mb-6 bg-black/40 backdrop-blur rounded-xl border border-white/20 p-6">
          <h3 className="text-white font-bold mb-4 text-center">🎩 Дилер</h3>
          <div className="flex gap-2 justify-center mb-3">
            {gameState.dealer.hand.map((card, i) => (
              <motion.div
                key={i}
                initial={{ rotateY: 180 }}
                animate={{ rotateY: 0 }}
                className={`bg-white rounded-lg p-3 ${
                  ['♥', '♦'].includes(card.suit) ? 'text-red-600' : 'text-black'
                }`}
              >
                <div className="text-center text-2xl font-bold">
                  {gameState.phase === 'playing' && i === 1 ? '?' : `${card.value}${card.suit}`}
                </div>
              </motion.div>
            ))}
          </div>
          <div className="text-center text-white text-xl">
            {gameState.phase === 'result' ? `Счёт: ${gameState.dealer.score}` : `Показано: ${gameState.dealer.score}`}
          </div>
        </div>

        {gameState.players.map((player) => (
          <motion.div
            key={player.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/40 backdrop-blur rounded-xl border border-white/20 p-6 mb-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-xl">{player.name}</h3>
              <div className="text-green-400 font-bold text-xl">{player.balance} 💰</div>
            </div>

            {player.hand.length > 0 && (
              <>
                <div className="flex gap-2 justify-center mb-3">
                  {player.hand.map((card, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={`bg-white rounded-lg p-3 ${
                        ['♥', '♦'].includes(card.suit) ? 'text-red-600' : 'text-black'
                      }`}
                    >
                      <div className="text-center text-2xl font-bold">
                        {card.value}{card.suit}
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="text-center text-white text-xl mb-2">
                  Счёт: {player.score}
                </div>
              </>
            )}

            {gameState.phase === 'result' && (
              <div className="text-center">
                {player.status === 'blackjack' && <div className="text-yellow-400 text-2xl font-bold">🎉 БЛЕКДЖЕК! +{Math.floor(player.bet * 2.5)}</div>}
                {player.status === 'win' && <div className="text-green-400 text-2xl font-bold">✅ Победа! +{player.bet * 2}</div>}
                {player.status === 'lose' && <div className="text-red-400 text-2xl font-bold">❌ Проигрыш</div>}
                {player.status === 'bust' && <div className="text-red-400 text-2xl font-bold">💥 Перебор!</div>}
                {player.status === 'push' && <div className="text-yellow-400 text-2xl font-bold">🤝 Ничья</div>}
              </div>
            )}
          </motion.div>
        ))}

        {myPlayer.name === myName && (
          <div className="bg-black/40 backdrop-blur rounded-xl border border-white/20 p-6">
            {gameState.phase === 'betting' && (
              <div className="text-center">
                <p className="text-white mb-4 text-xl">Сделайте ставку:</p>
                <div className="flex gap-3 justify-center">
                  {[10, 50, 100, 500].map(amount => (
                    <button
                      key={amount}
                      onClick={() => placeBet(amount)}
                      disabled={myPlayer.balance < amount}
                      className="btn btn-success text-lg disabled:opacity-50"
                    >
                      {amount} 💰
                    </button>
                  ))}
                </div>
              </div>
            )}

            {gameState.phase === 'playing' && myPlayer.status === 'playing' && (
              <div className="flex gap-4 justify-center">
                <button onClick={hit} className="btn btn-primary btn-lg">
                  🎴 Взять карту
                </button>
                <button onClick={stand} className="btn btn-warning btn-lg">
                  ✋ Хватит
                </button>
              </div>
            )}

            {gameState.phase === 'result' && (
              <div className="text-center">
                <button onClick={newRound} className="btn btn-success btn-lg">
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

export default OnlineBlackjackGame

