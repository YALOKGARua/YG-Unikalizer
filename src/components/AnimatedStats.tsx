import { motion } from 'framer-motion'
import CountUp from 'react-countup'
import { useInView } from 'react-intersection-observer'
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts'
import { FaImages, FaClock, FaChartLine, FaCheckCircle } from 'react-icons/fa'

interface StatsData {
  totalFiles: number
  processedFiles: number
  timeElapsed: number
  averageSpeed: number
  chartData?: Array<{ name: string; value: number }>
}

const AnimatedStats = ({ 
  totalFiles, 
  processedFiles, 
  timeElapsed, 
  averageSpeed,
  chartData = []
}: StatsData) => {
  const { ref, inView } = useInView({
    threshold: 0.3,
    triggerOnce: true
  })

  const percentage = totalFiles > 0 ? (processedFiles / totalFiles) * 100 : 0

  const stats = [
    {
      icon: FaImages,
      label: 'Файлов обработано',
      value: processedFiles,
      total: totalFiles,
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: FaClock,
      label: 'Время работы',
      value: timeElapsed,
      suffix: ' сек',
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: FaChartLine,
      label: 'Скорость',
      value: averageSpeed,
      suffix: ' файл/сек',
      decimals: 2,
      color: 'from-green-500 to-green-600'
    },
    {
      icon: FaCheckCircle,
      label: 'Прогресс',
      value: percentage,
      suffix: '%',
      decimals: 1,
      color: 'from-amber-500 to-amber-600'
    }
  ]

  return (
    <div ref={ref} className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            className="relative group"
          >
            <div className={`
              bg-gradient-to-br ${stat.color} p-4 rounded-xl
              shadow-lg hover:shadow-2xl transition-all duration-300
              transform hover:scale-105 hover:-translate-y-1
            `}>
              <div className="flex items-center justify-between mb-2">
                <stat.icon className="w-6 h-6 text-white/90" />
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  className="w-8 h-8 rounded-full bg-white/10"
                />
              </div>
              
              <div className="text-white">
                <div className="text-2xl font-bold">
                  {inView && (
                    <CountUp
                      start={0}
                      end={stat.value}
                      duration={2}
                      decimals={stat.decimals || 0}
                      suffix={stat.suffix || ''}
                    />
                  )}
                  {stat.total && (
                    <span className="text-sm font-normal opacity-80">
                      {' '}/ {stat.total}
                    </span>
                  )}
                </div>
                <div className="text-xs opacity-80 mt-1">{stat.label}</div>
              </div>

              <motion.div
                className="absolute inset-0 bg-white/10 rounded-xl"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 0 }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {chartData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-4 border border-white/10"
        >
          <h3 className="text-sm font-semibold text-white/80 mb-3">
            График обработки
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="name" stroke="#ffffff40" />
              <YAxis stroke="#ffffff40" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px'
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#colorGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      <motion.div
        initial={{ scaleX: 0 }}
        animate={inView ? { scaleX: 1 } : {}}
        transition={{ duration: 1, ease: 'easeOut' }}
        className="h-2 bg-slate-800 rounded-full overflow-hidden"
      >
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
      </motion.div>
    </div>
  )
}

export default AnimatedStats
