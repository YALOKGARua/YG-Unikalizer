import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import CountUp from 'react-countup'
import confetti from 'canvas-confetti'
import { FaCoins, FaTrophy, FaFire } from 'react-icons/fa'
import { useAppStore } from '../../private/src/subscription/store'
import { toast } from 'sonner'

type Suit = '♠' | '♥' | '♦' | '♣'
type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'

interface Card {
  suit: Suit
  rank: Rank
}

type HandRank = 'High Card' | 'Pair' | 'Two Pair' | 'Three of a Kind' | 'Straight' | 'Flush' | 'Full House' | 'Four of a Kind' | 'Straight Flush' | 'Royal Flush'

const PokerGame = () => {
  const [balance, setBalance] = useState(() => {
    try {
      const saved = localStorage.getItem('pokerGame_balance')
      return saved ? Number(saved) : 10000
    } catch {
      return 10000
    }
  })
  const [bet, setBet] = useState(100)
  const [playerHand, setPlayerHand] = useState<Card[]>([])
  const [dealerHand, setDealerHand] = useState<Card[]>([])
  const [communityCards, setCommunityCards] = useState<Card[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [result, setResult] = useState<{ win: boolean; message: string; profit: number }>({ win: false, message: '', profit: 0 })
  const [stats, setStats] = useState(() => {
    try {
      const saved = localStorage.getItem('pokerGame_stats')
      return saved ? JSON.parse(saved) : { totalGames: 0, wins: 0, biggestWin: 0 }
    } catch {
      return { totalGames: 0, wins: 0, biggestWin: 0 }
    }
  })
  const [stage, setStage] = useState<'bet' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'>('bet')
  const [pot, setPot] = useState(0)
  const [heldCards, setHeldCards] = useState<boolean[]>([false, false, false, false, false])
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem('pokerGame_balance', String(balance))
    } catch {}
  }, [balance])

  useEffect(() => {
    try {
      localStorage.setItem('pokerGame_stats', JSON.stringify(stats))
    } catch {}
  }, [stats])

  const resetProgress = () => {
    setBalance(10000)
    setStats({ totalGames: 0, wins: 0, biggestWin: 0 })
    try {
      localStorage.removeItem('pokerGame_balance')
      localStorage.removeItem('pokerGame_stats')
    } catch {}
    toast.success('Прогресс сброшен!')
    setShowResetConfirm(false)
  }

  const suits: Suit[] = ['♠', '♥', '♦', '♣']
  const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']

  const createDeck = (): Card[] => {
    const deck: Card[] = []
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ suit, rank })
      }
    }
    return deck.sort(() => Math.random() - 0.5)
  }

  const getRankValue = (rank: Rank): number => {
    if (rank === 'A') return 14
    if (rank === 'K') return 13
    if (rank === 'Q') return 12
    if (rank === 'J') return 11
    return parseInt(rank)
  }

  const evaluateHand = (cards: Card[]): { rank: HandRank; value: number } => {
    if (cards.length !== 5) return { rank: 'High Card', value: 0 }

    const rankCounts: { [key: string]: number } = {}
    const suitCounts: { [key: string]: number } = {}
    const rankValues = cards.map(c => getRankValue(c.rank)).sort((a, b) => b - a)

    cards.forEach(card => {
      rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1
      suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1
    })

    const counts = Object.values(rankCounts).sort((a, b) => b - a)
    const isFlush = Object.values(suitCounts).some(count => count >= 5)
    const isStraight = rankValues.every((val, i) => i === 0 || val === rankValues[i - 1] - 1) ||
      (rankValues[0] === 14 && rankValues[1] === 5 && rankValues[2] === 4 && rankValues[3] === 3 && rankValues[4] === 2)

    if (isStraight && isFlush && rankValues[0] === 14) return { rank: 'Royal Flush', value: 10000 }
    if (isStraight && isFlush) return { rank: 'Straight Flush', value: 9000 + rankValues[0] }
    if (counts[0] === 4) return { rank: 'Four of a Kind', value: 8000 + rankValues[0] }
    if (counts[0] === 3 && counts[1] === 2) return { rank: 'Full House', value: 7000 + rankValues[0] }
    if (isFlush) return { rank: 'Flush', value: 6000 + rankValues[0] }
    if (isStraight) return { rank: 'Straight', value: 5000 + rankValues[0] }
    if (counts[0] === 3) return { rank: 'Three of a Kind', value: 4000 + rankValues[0] }
    if (counts[0] === 2 && counts[1] === 2) return { rank: 'Two Pair', value: 3000 + rankValues[0] }
    if (counts[0] === 2) return { rank: 'Pair', value: 2000 + rankValues[0] }
    return { rank: 'High Card', value: 1000 + rankValues[0] }
  }

  const startGame = () => {
    if (bet > balance || bet <= 0) return

    const { isSubscribed } = useAppStore.getState()
    if (bet > 1000 && !isSubscribed()) {
      toast.error('Максимальная ставка для бесплатной версии: 1000')
      return
    }

    setBalance(prev => prev - bet)
    
    setPot(bet)
    setIsPlaying(true)
    setShowResult(false)
    setStage('preflop')
    setHeldCards([false, false, false, false, false])

    const deck = createDeck()
    setPlayerHand(deck.slice(0, 5))
    setDealerHand(deck.slice(5, 10))
    setCommunityCards([])
  }

  const draw = () => {
    const deck = createDeck()
    const newHand = playerHand.map((card, i) => heldCards[i] ? card : deck.pop()!)
    setPlayerHand(newHand)
    endGame(newHand)
  }

  const endGame = (finalPlayerHand: Card[]) => {
    const playerEval = evaluateHand(finalPlayerHand)
    const dealerEval = evaluateHand(dealerHand)

    let win = false
    let profit = 0
    let message = ''

    if (playerEval.value > dealerEval.value) {
      win = true
      const multiplier = getMultiplier(playerEval.rank)
      profit = bet * multiplier
      message = `Вы выиграли с ${playerEval.rank}! x${multiplier}`
      setBalance(prev => prev + profit)
    } else if (playerEval.value === dealerEval.value) {
      profit = bet
      message = 'Ничья!'
      setBalance(prev => prev + bet)
    } else {
      message = `Дилер выиграл с ${dealerEval.rank}`
    }

    setResult({ win, message, profit })
    setShowResult(true)
    setIsPlaying(false)
    setStage('bet')

    setStats(prev => ({
      totalGames: prev.totalGames + 1,
      wins: prev.wins + (win ? 1 : 0),
      biggestWin: Math.max(prev.biggestWin, profit)
    }))

    if (win && profit > bet * 5) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
    }
  }

  const getMultiplier = (rank: HandRank): number => {
    const multipliers: { [key in HandRank]: number } = {
      'Royal Flush': 250,
      'Straight Flush': 50,
      'Four of a Kind': 25,
      'Full House': 9,
      'Flush': 6,
      'Straight': 4,
      'Three of a Kind': 3,
      'Two Pair': 2,
      'Pair': 1.5,
      'High Card': 1
    }
    return multipliers[rank] || 1
  }

  const CardComponent = ({ card, hidden = false, held = false, onClick }: { card: Card; hidden?: boolean; held?: boolean; onClick?: () => void }) => {
    const isRed = card.suit === '♥' || card.suit === '♦'
    return (
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className={`relative w-20 h-28 rounded-lg border-2 flex flex-col items-center justify-center cursor-pointer ${
          hidden ? 'bg-gradient-to-br from-blue-600 to-purple-600 border-white/20' : 'bg-white border-gray-300'
        } ${held ? 'ring-4 ring-yellow-400' : ''}`}
      >
        {!hidden && (
          <>
            <div className={`text-3xl font-bold ${isRed ? 'text-red-600' : 'text-gray-900'}`}>{card.rank}</div>
            <div className={`text-4xl ${isRed ? 'text-red-600' : 'text-gray-900'}`}>{card.suit}</div>
          </>
        )}
        {hidden && <div className="text-white text-2xl">🂠</div>}
        {held && <div className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs px-2 py-1 rounded-full font-bold">HOLD</div>}
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-yellow-400 via-green-400 to-emerald-500 bg-clip-text text-transparent mb-2">
            🃏 Poker Texas Hold'em
          </h1>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="lg:col-span-1 space-y-4">
            <div className="bg-black/40 backdrop-blur rounded-xl border border-white/20 p-4">
              <div className="flex justify-between items-center mb-1">
                <div className="text-white/60 text-sm">Баланс</div>
                <button onClick={() => setShowResetConfirm(true)} className="text-xs text-red-400 hover:text-red-300">Сброс</button>
              </div>
              <div className="text-3xl font-bold text-white">
                $<CountUp end={balance} duration={0.5} />
              </div>
            </div>

            <div className="bg-black/40 backdrop-blur rounded-xl border border-white/20 p-4 space-y-3">
              <div>
                <label className="text-white/60 text-sm">Ставка: ${bet}</label>
                <input
                  type="range"
                  min="10"
                  max={Math.min(balance, 5000)}
                  step="10"
                  value={bet}
                  onChange={(e) => setBet(Number(e.target.value))}
                  disabled={isPlaying}
                  className="w-full mt-2"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[100, 500, 1000].map(amount => (
                  <button
                    key={amount}
                    onClick={() => setBet(Math.min(amount, balance))}
                    disabled={isPlaying}
                    className="btn btn-ghost text-xs"
                  >
                    ${amount}
                  </button>
                ))}
              </div>
              {!isPlaying ? (
                <button onClick={startGame} disabled={bet > balance || bet <= 0} className="btn btn-primary w-full">
                  Раздать
                </button>
              ) : (
                <button onClick={draw} className="btn btn-success w-full">
                  Обменять
                </button>
              )}
            </div>

            <div className="bg-black/40 backdrop-blur rounded-xl border border-white/20 p-4">
              <div className="text-white/60 text-sm mb-2">Статистика</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Игр:</span>
                  <span className="text-white">{stats.totalGames}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Побед:</span>
                  <span className="text-green-400">{stats.wins}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Винрейт:</span>
                  <span className="text-white">{stats.totalGames > 0 ? ((stats.wins / stats.totalGames) * 100).toFixed(1) : 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Макс выигрыш:</span>
                  <span className="text-yellow-400">${stats.biggestWin}</span>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="lg:col-span-3 space-y-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-black/40 backdrop-blur rounded-xl border border-white/20 p-6">
              <div className="mb-4">
                <div className="text-white/60 text-sm mb-2">Дилер</div>
                <div className="flex gap-2 justify-center">
                  {dealerHand.map((card, i) => (
                    <CardComponent key={i} card={card} hidden={!showResult} />
                  ))}
                </div>
              </div>

              <div className="my-8 text-center">
                <div className="text-white/40 text-sm mb-2">Банк</div>
                <div className="text-4xl font-bold text-yellow-400">${pot}</div>
              </div>

              <div>
                <div className="text-white/60 text-sm mb-2">Ваши карты</div>
                <div className="flex gap-2 justify-center">
                  {playerHand.map((card, i) => (
                    <CardComponent
                      key={i}
                      card={card}
                      held={heldCards[i]}
                      onClick={() => {
                        if (isPlaying && !showResult) {
                          setHeldCards(prev => {
                            const next = [...prev]
                            next[i] = !next[i]
                            return next
                          })
                        }
                      }}
                    />
                  ))}
                </div>
                {isPlaying && !showResult && (
                  <div className="text-center text-white/60 text-xs mt-2">Нажмите на карты чтобы оставить их</div>
                )}
              </div>
            </motion.div>

            <AnimatePresence>
              {showResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={`bg-gradient-to-r ${result.win ? 'from-green-600 to-emerald-600' : 'from-red-600 to-rose-600'} rounded-xl p-6 text-center`}
                >
                  <div className="text-3xl font-bold text-white mb-2">{result.message}</div>
                  {result.win && <div className="text-xl text-white">+${result.profit}</div>}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="bg-black/40 backdrop-blur rounded-xl border border-white/20 p-4">
              <div className="text-white/60 text-sm mb-2">Таблица выплат</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between text-white/80"><span>Royal Flush</span><span className="text-yellow-400">x250</span></div>
                <div className="flex justify-between text-white/80"><span>Straight Flush</span><span className="text-yellow-400">x50</span></div>
                <div className="flex justify-between text-white/80"><span>Four of a Kind</span><span className="text-yellow-400">x25</span></div>
                <div className="flex justify-between text-white/80"><span>Full House</span><span className="text-yellow-400">x9</span></div>
                <div className="flex justify-between text-white/80"><span>Flush</span><span className="text-yellow-400">x6</span></div>
                <div className="flex justify-between text-white/80"><span>Straight</span><span className="text-yellow-400">x4</span></div>
                <div className="flex justify-between text-white/80"><span>Three of a Kind</span><span className="text-yellow-400">x3</span></div>
                <div className="flex justify-between text-white/80"><span>Two Pair</span><span className="text-yellow-400">x2</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80" onClick={() => setShowResetConfirm(false)} />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-slate-900 rounded-xl border border-white/20 p-6 max-w-md mx-4"
          >
            <h3 className="text-xl font-bold text-white mb-2">Подтверждение сброса</h3>
            <p className="text-white/70 mb-6">Вы уверены, что хотите сбросить весь прогресс в покере? Баланс и статистика будут обнулены.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowResetConfirm(false)} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition">
                Отмена
              </button>
              <button onClick={resetProgress} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition">
                Сбросить
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default PokerGame