import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Line, LineChart, ResponsiveContainer, YAxis, XAxis, Tooltip, Area, AreaChart } from 'recharts'
import CountUp from 'react-countup'
import confetti from 'canvas-confetti'
import { FaRocket, FaCoins, FaFire, FaTrophy, FaChartLine } from 'react-icons/fa'
import Tilt from 'react-parallax-tilt'
import FeatureGate, { PremiumBadge } from './FeatureGate'
import FeatureGateFloating, { PremiumBadgeFloating } from './FeatureGateFloating'
import FeatureGateCompact, { PremiumBadgeCompact } from './FeatureGateCompact'
import { useAppStore } from '../../private/src/subscription/store'
import { toast } from 'sonner'

interface GameHistory {
  multiplier: number
  win: boolean
  bet: number
  profit: number
}

const CrashGame = () => {
  const [balance, setBalance] = useState(() => {
    try {
      const saved = localStorage.getItem('crashGame_balance')
      return saved ? Number(saved) : 10000
    } catch {
      return 10000
    }
  })
  const [bet, setBet] = useState(100)
  const [autoCashout, setAutoCashout] = useState(2.0)
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isCrashed, setIsCrashed] = useState(false)
  const [userCashedOut, setUserCashedOut] = useState(false)
  const [cashoutMultiplier, setCashoutMultiplier] = useState(0)
  const [chartData, setChartData] = useState<any[]>([])
  const [history, setHistory] = useState<GameHistory[]>([])
  const [showWinAnimation, setShowWinAnimation] = useState(false)
  const [stats, setStats] = useState(() => {
    try {
      const saved = localStorage.getItem('crashGame_stats')
      return saved ? JSON.parse(saved) : { totalBets: 0, totalWins: 0, biggestWin: 0 }
    } catch {
      return { totalBets: 0, totalWins: 0, biggestWin: 0 }
    }
  })
  
  const intervalRef = useRef<any>(null)
  const crashPointRef = useRef(1.0)
  const rocketRef = useRef<HTMLDivElement>(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem('crashGame_balance', String(balance))
    } catch {}
  }, [balance])

  useEffect(() => {
    try {
      localStorage.setItem('crashGame_stats', JSON.stringify(stats))
    } catch {}
  }, [stats])

  const resetProgress = () => {
    setBalance(10000)
    setStats({ totalBets: 0, totalWins: 0, biggestWin: 0 })
    setHistory([])
    try {
      localStorage.removeItem('crashGame_balance')
      localStorage.removeItem('crashGame_stats')
    } catch {}
    toast.success('Прогресс сброшен!')
    setShowResetConfirm(false)
  }

  const generateCrashPoint = () => {
    const random = Math.random()
    const v = Math.floor(100 / Math.max(1e-6, (1 - random))) / 100
    return Math.max(1.01, v)
  }

  const startGame = useCallback(() => {
    if (bet > balance || bet <= 0) return
    
    const { isSubscribed } = useAppStore.getState()
    if (bet > 1000 && !isSubscribed()) {
      toast.error('Максимальная ставка для бесплатной версии: 1000. Подпишитесь для больших ставок!')
      return
    }
    
    setBalance(prev => prev - bet)
    setIsPlaying(true)
    setIsCrashed(false)
    setUserCashedOut(false)
    setCashoutMultiplier(0)
    setCurrentMultiplier(1.0)
    setChartData([{ x: 0, y: 1.0 }])
    setShowWinAnimation(false)
    
    crashPointRef.current = generateCrashPoint()
    
    let mult = 1.0
    let time = 0
    const data: any[] = [{ x: 0, y: 1.0 }]
    
    intervalRef.current = setInterval(() => {
      time += 0.05
      mult = Math.pow(Math.E, time * 0.05)
      
      if (mult >= crashPointRef.current) {
        mult = crashPointRef.current
        setCurrentMultiplier(mult)
        data.push({ x: time, y: mult })
        setChartData([...data])
        crashGame()
        return
      }
      
      setCurrentMultiplier(mult)
      data.push({ x: time, y: mult })
      setChartData([...data])
      
      if (mult >= autoCashout && !userCashedOut) {
        cashOut()
      }
    }, 50)
  }, [bet, balance, autoCashout, userCashedOut])

  const crashGame = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setIsCrashed(true)
    setIsPlaying(false)
    
    if (rocketRef.current) {
      rocketRef.current.style.animation = 'crash 0.5s ease-out'
    }
    
    if (!userCashedOut) {
      setHistory(prev => [...prev, {
        multiplier: crashPointRef.current,
        win: false,
        bet,
        profit: -bet
      }])
      setStats(prev => ({ ...prev, totalBets: prev.totalBets + 1 }))
    }
  }

  const cashOut = () => {
    if (!isPlaying || userCashedOut || isCrashed) return
    
    const winAmount = Math.floor(bet * currentMultiplier)
    setBalance(prev => prev + winAmount)
    setUserCashedOut(true)
    setCashoutMultiplier(currentMultiplier)
    setShowWinAnimation(true)
    
    setHistory(prev => [...prev, {
      multiplier: currentMultiplier,
      win: true,
      bet,
      profit: winAmount - bet
    }])
    
    setStats(prev => ({
      totalBets: prev.totalBets + 1,
      totalWins: prev.totalWins + 1,
      biggestWin: Math.max(prev.biggestWin, winAmount)
    }))
    
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b']
    })
  }

  const quickBet = (amount: number) => {
    setBet(Math.min(amount, balance))
  }

  const quickMultiplier = (mult: number) => {
    setAutoCashout(mult)
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-5xl font-bold bg-gradient-to-r from-yellow-400 to-red-600 bg-clip-text text-transparent mb-2">
            🚀 Crash Game
          </h1>
          <p className="text-white/60">Испытай удачу и выведи ставку вовремя!</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lg:col-span-2 bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-white/10"
          >
            <div className="relative h-96 mb-4">
              <AnimatePresence>
                {showWinAnimation && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center z-20"
                  >
                    <div className="text-6xl font-bold text-green-400">
                      +${Math.floor(bet * cashoutMultiplier)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="absolute top-4 left-4 z-10">
                <motion.div
                  animate={isPlaying && !isCrashed ? {
                    scale: [1, 1.1, 1],
                  } : {}}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className={`text-6xl font-bold ${
                    isCrashed ? 'text-red-500' : 
                    userCashedOut ? 'text-green-500' : 
                    'text-white'
                  }`}
                >
                  <CountUp
                    start={1}
                    end={currentMultiplier}
                    decimals={2}
                    suffix="x"
                    duration={0.1}
                  />
                </motion.div>
              </div>

              <div 
                ref={rocketRef}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
              >
                <motion.div
                  animate={isPlaying && !isCrashed ? {
                    y: [-10, -30, -10],
                    rotate: [-5, 5, -5]
                  } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <FaRocket 
                    className={`text-6xl transition-all duration-300 ${
                      isCrashed ? 'text-red-500 rotate-180' : 
                      userCashedOut ? 'text-green-500' : 
                      'text-blue-500'
                    }`}
                  />
                </motion.div>
              </div>

              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="x" hide />
                  <YAxis domain={[1, 'dataMax']} hide />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload[0]) {
                        return (
                          <div className="bg-slate-900/90 p-2 rounded border border-white/20">
                            <p className="text-white text-sm">
                              {Number(payload[0].value).toFixed(2)}x
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="y"
                    stroke={isCrashed ? '#ef4444' : userCashedOut ? '#10b981' : '#8b5cf6'}
                    strokeWidth={3}
                    fill="url(#colorGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startGame}
                disabled={isPlaying}
                className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${
                  isPlaying 
                    ? 'bg-gray-700 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg'
                }`}
              >
                {isPlaying ? 'Ожидание...' : 'Поставить'}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={cashOut}
                disabled={!isPlaying || userCashedOut || isCrashed}
                className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${
                  !isPlaying || userCashedOut || isCrashed
                    ? 'bg-gray-700 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white shadow-lg animate-pulse'
                }`}
              >
                Забрать {isPlaying && !userCashedOut && !isCrashed && 
                  `($${(bet * currentMultiplier).toFixed(0)})`}
              </motion.button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <Tilt tiltMaxAngleX={5} tiltMaxAngleY={5}>
              <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-white/60">Баланс</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowResetConfirm(true)} className="text-xs text-red-400 hover:text-red-300">Сброс</button>
                    <FaCoins className="text-yellow-400 text-xl" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-white">
                  <CountUp end={balance} prefix="$" />
                </div>
              </div>
            </Tilt>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-white/10 space-y-4">
              <div>
                <label className="text-white/60 text-sm mb-2 block flex items-center gap-2">
                  Ставка
                  {bet > 1000 && <PremiumBadgeCompact feature="high_stakes" />}
                </label>
                <FeatureGateCompact feature="high_stakes" showUpgrade={bet > 1000}>
                  <input
                    type="number"
                    value={bet}
                    onChange={(e) => setBet(Number(e.target.value))}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-white"
                    min={1}
                    max={balance}
                  />
                  <div className="flex gap-2 mt-2">
                    {[100, 500, 1000, 5000].map(amount => (
                      <button
                        key={amount}
                        onClick={() => quickBet(amount)}
                        className="flex-1 py-1 bg-slate-700/50 hover:bg-slate-600/50 rounded text-xs text-white/80"
                      >
                        {amount}
                      </button>
                    ))}
                  </div>
                </FeatureGateCompact>
              </div>

              <div>
                <label className="text-white/60 text-sm mb-2 block">Авто-вывод</label>
                <input
                  type="number"
                  value={autoCashout}
                  onChange={(e) => setAutoCashout(Number(e.target.value))}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-white"
                  min={1.01}
                  step={0.1}
                />
                <div className="flex gap-2 mt-2">
                  {[1.5, 2, 3, 5].map(mult => (
                    <button
                      key={mult}
                      onClick={() => quickMultiplier(mult)}
                      className="flex-1 py-1 bg-slate-700/50 hover:bg-slate-600/50 rounded text-xs text-white/80"
                    >
                      {mult}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <FaTrophy className="text-yellow-400" />
                Статистика
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Всего игр:</span>
                  <span className="text-white">{stats.totalBets}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Выигрышей:</span>
                  <span className="text-green-400">{stats.totalWins}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Лучший выигрыш:</span>
                  <span className="text-yellow-400">${stats.biggestWin}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 border border-white/10 max-h-48 overflow-y-auto">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <FaChartLine className="text-blue-400" />
                История
              </h3>
              <div className="space-y-1">
                {history.slice(-5).reverse().map((game, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`flex justify-between text-xs p-2 rounded ${
                      game.win ? 'bg-green-500/10' : 'bg-red-500/10'
                    }`}
                  >
                    <span className={game.win ? 'text-green-400' : 'text-red-400'}>
                      {game.multiplier.toFixed(2)}x
                    </span>
                    <span className={game.win ? 'text-green-400' : 'text-red-400'}>
                      {game.profit > 0 ? '+' : ''}${Math.abs(game.profit)}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <style>{`
        @keyframes crash {
          0% { transform: translateY(0) rotate(0); }
          100% { transform: translateY(100px) rotate(180deg); opacity: 0; }
        }
      `}</style>

      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80" onClick={() => setShowResetConfirm(false)} />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-slate-900 rounded-xl border border-white/20 p-6 max-w-md mx-4"
          >
            <h3 className="text-xl font-bold text-white mb-2">Подтверждение сброса</h3>
            <p className="text-white/70 mb-6">Вы уверены, что хотите сбросить весь прогресс в Crash? Баланс, статистика и история будут обнулены.</p>
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

export default CrashGame