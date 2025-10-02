import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import CountUp from 'react-countup'
import confetti from 'canvas-confetti'
import { FaCoins, FaTrophy } from 'react-icons/fa'
import { useAppStore } from '../../private/src/subscription/store'
import { toast } from 'sonner'

type Suit = '♠' | '♥' | '♦' | '♣'
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'

interface Card {
  suit: Suit
  rank: Rank
}

const BlackjackGame = () => {
  const [balance, setBalance] = useState(() => {
    try {
      const saved = localStorage.getItem('blackjackGame_balance')
      return saved ? Number(saved) : 10000
    } catch {
      return 10000
    }
  })
  const [bet, setBet] = useState(100)
  const [playerHands, setPlayerHands] = useState<Card[][]>([[]])
  const [dealerHand, setDealerHand] = useState<Card[]>([])
  const [deck, setDeck] = useState<Card[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [dealerRevealed, setDealerRevealed] = useState(false)
  const [result, setResult] = useState<{ win: boolean; message: string; profit: number }>({ win: false, message: '', profit: 0 })
  const [stats, setStats] = useState(() => {
    try {
      const saved = localStorage.getItem('blackjackGame_stats')
      return saved ? JSON.parse(saved) : { totalGames: 0, wins: 0, blackjacks: 0, biggestWin: 0 }
    } catch {
      return { totalGames: 0, wins: 0, blackjacks: 0, biggestWin: 0 }
    }
  })
  const [currentHandIndex, setCurrentHandIndex] = useState(0)
  const [handsFinished, setHandsFinished] = useState<boolean[]>([false])
  const [insurance, setInsurance] = useState(false)
  const [canSplit, setCanSplit] = useState(false)
  const [canDouble, setCanDouble] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const suits: Suit[] = ['♠', '♥', '♦', '♣']
  const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

  useEffect(() => {
    try {
      localStorage.setItem('blackjackGame_balance', String(balance))
    } catch {}
  }, [balance])

  useEffect(() => {
    try {
      localStorage.setItem('blackjackGame_stats', JSON.stringify(stats))
    } catch {}
  }, [stats])

  const resetProgress = () => {
    setBalance(10000)
    setStats({ totalGames: 0, wins: 0, blackjacks: 0, biggestWin: 0 })
    try {
      localStorage.removeItem('blackjackGame_balance')
      localStorage.removeItem('blackjackGame_stats')
    } catch {}
    toast.success('Прогресс сброшен!')
    setShowResetConfirm(false)
  }

  const createDeck = (): Card[] => {
    const deck: Card[] = []
    for (let i = 0; i < 6; i++) {
      for (const suit of suits) {
        for (const rank of ranks) {
          deck.push({ suit, rank })
        }
      }
    }
    return deck.sort(() => Math.random() - 0.5)
  }

  const getCardValue = (card: Card, currentTotal: number = 0): number => {
    if (card.rank === 'A') {
      return currentTotal + 11 > 21 ? 1 : 11
    }
    if (['J', 'Q', 'K'].includes(card.rank)) return 10
    return parseInt(card.rank)
  }

  const calculateHandValue = (hand: Card[]): number => {
    let total = 0
    let aces = 0

    for (const card of hand) {
      if (card.rank === 'A') {
        aces++
        total += 11
      } else if (['J', 'Q', 'K'].includes(card.rank)) {
        total += 10
      } else {
        total += parseInt(card.rank)
      }
    }

    while (total > 21 && aces > 0) {
      total -= 10
      aces--
    }

    return total
  }

  const isBlackjack = (hand: Card[]): boolean => {
    return hand.length === 2 && calculateHandValue(hand) === 21
  }

  const startGame = () => {
    if (bet > balance || bet <= 0) return

    const { isSubscribed } = useAppStore.getState()
    if (bet > 1000 && !isSubscribed()) {
      toast.error('Максимальная ставка для бесплатной версии: 1000')
      return
    }

    setBalance(prev => prev - bet)
    setIsPlaying(true)
    setShowResult(false)
    setDealerRevealed(false)
    setCurrentHandIndex(0)
    setHandsFinished([false])
    setInsurance(false)

    const newDeck = createDeck()
    const player = [newDeck.pop()!, newDeck.pop()!]
    const dealer = [newDeck.pop()!, newDeck.pop()!]

    setPlayerHands([player])
    setDealerHand(dealer)
    setDeck(newDeck)

    const playerValue = calculateHandValue(player)
    const canSplitNow = player[0].rank === player[1].rank && balance >= bet
    const canDoubleNow = balance >= bet

    setCanSplit(canSplitNow)
    setCanDouble(canDoubleNow)

    if (isBlackjack(player)) {
      if (isBlackjack(dealer)) {
        endGame([player], dealer, true)
      } else {
        const profit = Math.floor(bet * 2.5)
        setBalance(prev => prev + profit)
        setResult({ win: true, message: 'BLACKJACK!', profit })
        setShowResult(true)
        setIsPlaying(false)
        setDealerRevealed(true)
        setStats(prev => ({ ...prev, totalGames: prev.totalGames + 1, wins: prev.wins + 1, blackjacks: prev.blackjacks + 1, biggestWin: Math.max(prev.biggestWin, profit) }))
        confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } })
      }
    }
  }

  const hit = () => {
    const newDeck = [...deck]
    const card = newDeck.pop()!
    setDeck(newDeck)

    const newHands = [...playerHands]
    newHands[currentHandIndex] = [...newHands[currentHandIndex], card]
    setPlayerHands(newHands)

    const value = calculateHandValue(newHands[currentHandIndex])
    setCanDouble(false)
    setCanSplit(false)

    if (value > 21) {
      stand()
    }
  }

  const stand = () => {
    const newFinished = [...handsFinished]
    newFinished[currentHandIndex] = true
    setHandsFinished(newFinished)

    if (currentHandIndex < playerHands.length - 1) {
      setCurrentHandIndex(currentHandIndex + 1)
      setCanDouble(playerHands[currentHandIndex + 1].length === 2 && balance >= bet)
      setCanSplit(false)
    } else {
      dealerPlay()
    }
  }

  const double = () => {
    if (balance < bet) return
    setBalance(prev => prev - bet)

    const newDeck = [...deck]
    const card = newDeck.pop()!
    setDeck(newDeck)

    const newHands = [...playerHands]
    newHands[currentHandIndex] = [...newHands[currentHandIndex], card]
    setPlayerHands(newHands)

    stand()
  }

  const split = () => {
    if (balance < bet || !canSplit) return
    setBalance(prev => prev - bet)

    const hand = playerHands[currentHandIndex]
    const newDeck = [...deck]
    const card1 = newDeck.pop()!
    const card2 = newDeck.pop()!

    const newHands = [...playerHands]
    newHands[currentHandIndex] = [hand[0], card1]
    newHands.splice(currentHandIndex + 1, 0, [hand[1], card2])

    setPlayerHands(newHands)
    setHandsFinished([...handsFinished, false])
    setDeck(newDeck)
    setCanSplit(false)
    setCanDouble(false)
  }

  const dealerPlay = () => {
    setDealerRevealed(true)
    let newDealerHand = [...dealerHand]
    let newDeck = [...deck]

    while (calculateHandValue(newDealerHand) < 17) {
      const card = newDeck.pop()!
      newDealerHand.push(card)
    }

    setDealerHand(newDealerHand)
    setDeck(newDeck)
    endGame(playerHands, newDealerHand, true)
  }

  const endGame = (finalPlayerHands: Card[][], finalDealerHand: Card[], revealDealer: boolean = false) => {
    if (revealDealer) setDealerRevealed(true)

    const dealerValue = calculateHandValue(finalDealerHand)
    const dealerBust = dealerValue > 21
    let totalProfit = 0
    let wins = 0
    let messages: string[] = []

    finalPlayerHands.forEach((hand, i) => {
      const playerValue = calculateHandValue(hand)
      const playerBust = playerValue > 21

      if (playerBust) {
        messages.push(`Рука ${i + 1}: Перебор`)
      } else if (dealerBust) {
        const profit = bet * 2
        totalProfit += profit
        wins++
        messages.push(`Рука ${i + 1}: Дилер перебрал!`)
      } else if (playerValue > dealerValue) {
        const profit = bet * 2
        totalProfit += profit
        wins++
        messages.push(`Рука ${i + 1}: Победа!`)
      } else if (playerValue === dealerValue) {
        totalProfit += bet
        messages.push(`Рука ${i + 1}: Ничья`)
      } else {
        messages.push(`Рука ${i + 1}: Проигрыш`)
      }
    })

    setBalance(prev => prev + totalProfit)
    const netProfit = totalProfit - bet * finalPlayerHands.length

    setResult({
      win: wins > 0,
      message: messages.join(' | '),
      profit: netProfit
    })

    setShowResult(true)
    setIsPlaying(false)

    setStats(prev => ({
      totalGames: prev.totalGames + 1,
      wins: prev.wins + (wins > 0 ? 1 : 0),
      blackjacks: prev.blackjacks,
      biggestWin: Math.max(prev.biggestWin, Math.max(0, netProfit))
    }))

    if (wins > 0 && netProfit > bet * 2) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
    }
  }

  const CardComponent = ({ card, hidden = false }: { card: Card; hidden?: boolean }) => {
    const isRed = card.suit === '♥' || card.suit === '♦'
    return (
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        className={`w-20 h-28 rounded-lg border-2 flex flex-col items-center justify-center ${
          hidden ? 'bg-gradient-to-br from-blue-600 to-purple-600 border-white/20' : 'bg-white border-gray-300'
        }`}
      >
        {!hidden && (
          <>
            <div className={`text-3xl font-bold ${isRed ? 'text-red-600' : 'text-gray-900'}`}>{card.rank}</div>
            <div className={`text-4xl ${isRed ? 'text-red-600' : 'text-gray-900'}`}>{card.suit}</div>
          </>
        )}
        {hidden && <div className="text-white text-2xl">🂠</div>}
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-zinc-900 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent mb-2">
            🃏 Blackjack 21
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
                <div className="space-y-2">
                  <button onClick={hit} disabled={handsFinished[currentHandIndex]} className="btn btn-success w-full text-xs">
                    Взять карту
                  </button>
                  <button onClick={stand} disabled={handsFinished[currentHandIndex]} className="btn btn-warning w-full text-xs">
                    Хватит
                  </button>
                  {canDouble && (
                    <button onClick={double} className="btn btn-info w-full text-xs">
                      Удвоить
                    </button>
                  )}
                  {canSplit && (
                    <button onClick={split} className="btn btn-secondary w-full text-xs">
                      Разделить
                    </button>
                  )}
                </div>
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
                  <span className="text-white/60">Блекджеков:</span>
                  <span className="text-yellow-400">{stats.blackjacks}</span>
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
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-white/60 text-sm">Дилер</div>
                  <div className="text-2xl font-bold text-white">{dealerRevealed ? calculateHandValue(dealerHand) : '?'}</div>
                </div>
                <div className="flex gap-2 justify-center">
                  {dealerHand.map((card, i) => (
                    <CardComponent key={i} card={card} hidden={i === 1 && !dealerRevealed} />
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {playerHands.map((hand, handIndex) => (
                  <div key={handIndex} className={`${currentHandIndex === handIndex && isPlaying ? 'ring-2 ring-yellow-400 rounded-lg p-2' : ''}`}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-white/60 text-sm">
                        {playerHands.length > 1 ? `Рука ${handIndex + 1}` : 'Ваши карты'}
                        {currentHandIndex === handIndex && isPlaying && <span className="ml-2 text-yellow-400">← Сейчас</span>}
                      </div>
                      <div className="text-2xl font-bold text-white">{calculateHandValue(hand)}</div>
                    </div>
                    <div className="flex gap-2 justify-center">
                      {hand.map((card, i) => (
                        <CardComponent key={i} card={card} />
                      ))}
                    </div>
                  </div>
                ))}
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
                  <div className="text-2xl font-bold text-white mb-2">{result.message}</div>
                  <div className="text-xl text-white">{result.profit >= 0 ? '+' : ''}${result.profit}</div>
                </motion.div>
              )}
            </AnimatePresence>
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
            <p className="text-white/70 mb-6">Вы уверены, что хотите сбросить весь прогресс в блекджеке? Баланс и статистика будут обнулены.</p>
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

export default BlackjackGame