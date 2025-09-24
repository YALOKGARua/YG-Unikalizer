import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import CountUp from 'react-countup'
import Tilt from 'react-parallax-tilt'
import { FaCoins, FaStar, FaTrophy, FaGem, FaCrown, FaFire, FaBolt, FaDice } from 'react-icons/fa'
import Lottie from 'lottie-react'

const SYMBOLS = [
  { id: 'cherry', emoji: '🍒', value: 2, color: 'text-red-500' },
  { id: 'lemon', emoji: '🍋', value: 3, color: 'text-yellow-400' },
  { id: 'orange', emoji: '🍊', value: 4, color: 'text-orange-500' },
  { id: 'plum', emoji: '🍇', value: 5, color: 'text-purple-500' },
  { id: 'bell', emoji: '🔔', value: 10, color: 'text-yellow-300' },
  { id: 'bar', emoji: '🍫', value: 15, color: 'text-amber-600' },
  { id: 'seven', emoji: '7️⃣', value: 20, color: 'text-green-500' },
  { id: 'diamond', emoji: '💎', value: 50, color: 'text-blue-400' },
]

const PAYLINES = [
  [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
  [[1, 0], [1, 1], [1, 2], [1, 3], [1, 4]],
  [[2, 0], [2, 1], [2, 2], [2, 3], [2, 4]],
  [[0, 0], [1, 1], [2, 2], [1, 3], [0, 4]],
  [[2, 0], [1, 1], [0, 2], [1, 3], [2, 4]],
]

interface SpinResult {
  win: boolean
  amount: number
  lines: number[]
  multiplier: number
}

const SlotsGame = () => {
  const [balance, setBalance] = useState(10000)
  const [bet, setBet] = useState(100)
  const [isSpinning, setIsSpinning] = useState(false)
  const [reels, setReels] = useState<typeof SYMBOLS[][]>([])
  const [winningLines, setWinningLines] = useState<number[]>([])
  const [lastWin, setLastWin] = useState(0)
  const [totalSpins, setTotalSpins] = useState(0)
  const [totalWins, setTotalWins] = useState(0)
  const [biggestWin, setBiggestWin] = useState(0)
  const [showWinAnimation, setShowWinAnimation] = useState(false)
  const [currentMultiplier, setCurrentMultiplier] = useState(1)
  const [autoPlay, setAutoPlay] = useState(false)
  const [turboMode, setTurboMode] = useState(false)
  const [jackpot, setJackpot] = useState(50000)
  
  const audioRef = useRef<HTMLAudioElement>(null)
  const autoPlayIntervalRef = useRef<any>(null)

  useEffect(() => {
    initializeReels()
    const jackpotInterval = setInterval(() => {
      setJackpot(prev => prev + Math.floor(Math.random() * 100))
    }, 5000)
    return () => clearInterval(jackpotInterval)
  }, [])

  const initializeReels = () => {
    const initialReels = []
    for (let i = 0; i < 5; i++) {
      const reel = []
      for (let j = 0; j < 3; j++) {
        reel.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)])
      }
      initialReels.push(reel)
    }
    setReels(initialReels)
  }

  const spin = async () => {
    if (isSpinning || bet > balance || bet <= 0) return
    
    setIsSpinning(true)
    setBalance(prev => prev - bet)
    setWinningLines([])
    setLastWin(0)
    setShowWinAnimation(false)
    setTotalSpins(prev => prev + 1)
    
    const spinDuration = turboMode ? 500 : 1500
    const newReels: typeof SYMBOLS[][] = []
    
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const reel = []
        for (let j = 0; j < 3; j++) {
          reel.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)])
        }
        newReels[i] = reel
        
        if (i === 4) {
          setReels([...newReels])
          checkWin(newReels)
        }
      }, (i + 1) * (spinDuration / 5))
    }
  }

  const checkWin = (currentReels: typeof SYMBOLS[][]) => {
    let totalWinAmount = 0
    const winLines: number[] = []
    let maxMultiplier = 1
    
    PAYLINES.forEach((line, lineIndex) => {
      const symbols = line.map(([row, col]) => currentReels[col][row])
      const firstSymbol = symbols[0]
      
      let matchCount = 1
      for (let i = 1; i < symbols.length; i++) {
        if (symbols[i].id === firstSymbol.id) {
          matchCount++
        } else {
          break
        }
      }
      
      if (matchCount >= 3) {
        winLines.push(lineIndex)
        const winAmount = firstSymbol.value * matchCount * bet / 10
        totalWinAmount += winAmount
        
        if (matchCount === 5) {
          maxMultiplier = Math.max(maxMultiplier, 3)
          if (firstSymbol.id === 'diamond') {
            maxMultiplier = 10
            checkJackpot()
          }
        } else if (matchCount === 4) {
          maxMultiplier = Math.max(maxMultiplier, 2)
        }
      }
    })
    
    if (totalWinAmount > 0) {
      const finalWin = Math.floor(totalWinAmount * maxMultiplier)
      setBalance(prev => prev + finalWin)
      setLastWin(finalWin)
      setWinningLines(winLines)
      setCurrentMultiplier(maxMultiplier)
      setTotalWins(prev => prev + 1)
      setBiggestWin(prev => Math.max(prev, finalWin))
      setShowWinAnimation(true)
      
      if (finalWin > bet * 5) {
        confetti({
          particleCount: 200,
          spread: 100,
          origin: { y: 0.5 },
          colors: ['#fbbf24', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6']
        })
      }
    }
    
    setTimeout(() => {
      setIsSpinning(false)
      setShowWinAnimation(false)
    }, turboMode ? 500 : 1500)
  }

  const checkJackpot = () => {
    const jackpotWin = Math.floor(jackpot * 0.1)
    setBalance(prev => prev + jackpotWin)
    setJackpot(50000)
    
    confetti({
      particleCount: 500,
      spread: 180,
      origin: { y: 0.5 },
      colors: ['#fbbf24', '#f59e0b', '#dc2626', '#10b981', '#3b82f6', '#8b5cf6']
    })
  }

  const toggleAutoPlay = () => {
    setAutoPlay(!autoPlay)
    if (!autoPlay) {
      autoPlayIntervalRef.current = setInterval(() => {
        spin()
      }, turboMode ? 1000 : 2500)
    } else {
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current)
      }
    }
  }

  useEffect(() => {
    return () => {
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current)
      }
    }
  }, [])

  const quickBet = (amount: number) => {
    setBet(Math.min(amount, balance))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-red-900 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-5xl font-bold bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 bg-clip-text text-transparent mb-2">
            🎰 Mega Slots
          </h1>
          <div className="flex items-center justify-center gap-4">
            <p className="text-white/60">Испытай удачу в лучших слотах!</p>
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-yellow-600 px-4 py-2 rounded-full"
            >
              <FaCrown className="text-white" />
              <span className="text-white font-bold">
                ДЖЕКПОТ: <CountUp end={jackpot} prefix="$" />
              </span>
            </motion.div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lg:col-span-3 bg-gradient-to-br from-slate-900/90 to-purple-900/90 backdrop-blur-sm rounded-3xl p-8 border border-white/20 shadow-2xl"
          >
            <AnimatePresence>
              {showWinAnimation && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none"
                >
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 1 }}
                    className="text-8xl font-bold text-yellow-400 mb-4"
                  >
                    🎊
                  </motion.div>
                  <div className="text-6xl font-bold text-yellow-400 drop-shadow-lg">
                    +<CountUp end={lastWin} prefix="$" />
                  </div>
                  {currentMultiplier > 1 && (
                    <div className="text-2xl font-bold text-pink-400 mt-2">
                      x{currentMultiplier} МНОЖИТЕЛЬ!
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative bg-gradient-to-b from-purple-800/50 to-pink-800/50 rounded-2xl p-6 mb-6 border-4 border-yellow-400/50 shadow-inner">
              <div className="grid grid-cols-5 gap-2">
                {reels.map((reel, reelIndex) => (
                  <div key={reelIndex} className="space-y-2">
                    {reel.map((symbol, symbolIndex) => {
                      const isWinning = winningLines.some(lineIndex => 
                        PAYLINES[lineIndex].some(([row, col]) => 
                          col === reelIndex && row === symbolIndex
                        )
                      )
                      
                      return (
                        <motion.div
                          key={`${reelIndex}-${symbolIndex}`}
                          initial={{ rotateX: 0 }}
                          animate={isSpinning ? {
                            rotateX: [0, 360],
                          } : {
                            rotateX: 0,
                            scale: isWinning ? [1, 1.2, 1] : 1
                          }}
                          transition={isSpinning ? {
                            duration: turboMode ? 0.3 : 0.8,
                            repeat: Infinity,
                            ease: 'linear',
                            delay: reelIndex * 0.1
                          } : {
                            duration: 0.5,
                            repeat: isWinning ? Infinity : 0
                          }}
                          className={`
                            h-24 flex items-center justify-center text-6xl
                            bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl
                            border-2 transition-all
                            ${isWinning 
                              ? 'border-yellow-400 shadow-lg shadow-yellow-400/50' 
                              : 'border-white/20'
                            }
                          `}
                        >
                          <span className={symbol.color}>{symbol.emoji}</span>
                        </motion.div>
                      )
                    })}
                  </div>
                ))}
              </div>

              <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 rounded-2xl opacity-20 blur-xl animate-pulse" />
            </div>

            <div className="flex gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={spin}
                disabled={isSpinning || autoPlay}
                className={`flex-1 py-4 rounded-2xl font-bold text-xl transition-all shadow-xl ${
                  isSpinning || autoPlay
                    ? 'bg-gray-700 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white'
                }`}
              >
                <div className="flex items-center justify-center gap-3">
                  <FaDice className="text-2xl" />
                  {isSpinning ? 'ВРАЩЕНИЕ...' : 'КРУТИТЬ'}
                </div>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleAutoPlay}
                className={`px-8 py-4 rounded-2xl font-bold transition-all ${
                  autoPlay
                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' 
                    : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                }`}
              >
                {autoPlay ? 'СТОП' : 'АВТО'}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setTurboMode(!turboMode)}
                className={`px-8 py-4 rounded-2xl font-bold transition-all ${
                  turboMode
                    ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white' 
                    : 'bg-gradient-to-r from-gray-600 to-gray-700 text-white'
                }`}
              >
                <FaBolt className={turboMode ? 'text-yellow-300' : ''} />
              </motion.button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5}>
              <div className="bg-gradient-to-br from-yellow-600/30 to-orange-600/30 backdrop-blur-sm rounded-2xl p-6 border border-yellow-400/30">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-white/80 font-semibold">Баланс</span>
                  <FaCoins className="text-yellow-400 text-2xl" />
                </div>
                <div className="text-4xl font-bold text-white">
                  <CountUp end={balance} prefix="$" />
                </div>
                {lastWin > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 text-green-400 font-semibold"
                  >
                    +${lastWin}
                  </motion.div>
                )}
              </div>
            </Tilt>

            <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 border border-white/10 space-y-4">
              <div>
                <label className="text-white/80 text-sm mb-2 block font-semibold">
                  Ставка
                </label>
                <input
                  type="number"
                  value={bet}
                  onChange={(e) => setBet(Number(e.target.value))}
                  className="w-full bg-slate-900/80 border border-white/20 rounded-xl px-4 py-3 text-white font-bold text-lg"
                  min={1}
                  max={balance}
                />
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {[100, 500, 1000, 5000].map(amount => (
                    <motion.button
                      key={amount}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => quickBet(amount)}
                      className="py-2 bg-gradient-to-r from-purple-600/50 to-pink-600/50 hover:from-purple-600 hover:to-pink-600 rounded-lg text-white font-semibold"
                    >
                      ${amount}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-800/30 to-pink-800/30 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <FaTrophy className="text-yellow-400 text-xl" />
                Статистика
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Всего спинов:</span>
                  <span className="text-white font-semibold">{totalSpins}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Выигрышей:</span>
                  <span className="text-green-400 font-semibold">{totalWins}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Лучший выигрыш:</span>
                  <span className="text-yellow-400 font-bold text-lg">${biggestWin}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Винрейт:</span>
                  <span className="text-blue-400 font-semibold">
                    {totalSpins > 0 ? Math.round((totalWins / totalSpins) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <FaGem className="text-purple-400" />
                Таблица выплат
              </h3>
              <div className="space-y-2 text-xs">
                {SYMBOLS.slice(-4).map(symbol => (
                  <div key={symbol.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{symbol.emoji}</span>
                      <span className="text-white/60">x3/x4/x5</span>
                    </div>
                    <span className="text-white font-semibold">
                      {symbol.value * 3}/{symbol.value * 4}/{symbol.value * 5}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default SlotsGame