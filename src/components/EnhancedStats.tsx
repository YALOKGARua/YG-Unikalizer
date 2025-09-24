import React from 'react'
import { motion } from 'framer-motion'
import { 
  FaClock, 
  FaImages, 
  FaCheckCircle, 
  FaTachometerAlt,
  FaHdd,
  FaMicrochip,
  FaMemory
} from 'react-icons/fa'

interface EnhancedStatsProps {
  totalFiles: number
  processedFiles: number
  timeElapsed: number
  averageSpeed: number
  estimatedTimeRemaining?: number
  memoryUsage?: number
  cpuUsage?: number
  diskUsage?: number
  className?: string
}

export default function EnhancedStats({
  totalFiles,
  processedFiles,
  timeElapsed,
  averageSpeed,
  estimatedTimeRemaining,
  memoryUsage,
  cpuUsage,
  diskUsage,
  className = ''
}: EnhancedStatsProps) {
  const progress = totalFiles > 0 ? (processedFiles / totalFiles) * 100 : 0
  
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const formatSize = (bytes?: number) => {
    if (!bytes) return 'N/A'
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  const stats = [
    {
      icon: FaImages,
      label: 'Прогресс',
      value: `${processedFiles}/${totalFiles}`,
      color: 'from-blue-500 to-cyan-500',
      progress: progress
    },
    {
      icon: FaClock,
      label: 'Время',
      value: formatTime(timeElapsed),
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: FaTachometerAlt,
      label: 'Скорость',
      value: `${averageSpeed.toFixed(1)} фото/сек`,
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: FaCheckCircle,
      label: 'Завершено',
      value: `${progress.toFixed(1)}%`,
      color: 'from-orange-500 to-red-500'
    }
  ]

  const systemStats = [
    ...(cpuUsage !== undefined ? [{
      icon: FaMicrochip,
      label: 'CPU',
      value: `${cpuUsage.toFixed(1)}%`,
      color: 'from-yellow-500 to-orange-500',
      progress: cpuUsage
    }] : []),
    ...(memoryUsage !== undefined ? [{
      icon: FaMemory,
      label: 'RAM',
      value: formatSize(memoryUsage),
      color: 'from-indigo-500 to-purple-500'
    }] : []),
    ...(diskUsage !== undefined ? [{
      icon: FaHdd,
      label: 'Диск',
      value: formatSize(diskUsage),
      color: 'from-teal-500 to-cyan-500'
    }] : [])
  ]

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-white/10"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg bg-gradient-to-r ${stat.color}`}>
                <stat.icon className="w-4 h-4 text-white" />
              </div>
              <div className="text-xs text-slate-400 font-medium">{stat.label}</div>
            </div>
            <div className="text-lg font-bold text-white mb-2">{stat.value}</div>
            {stat.progress !== undefined && (
              <div className="w-full bg-slate-700 rounded-full h-2">
                <motion.div 
                  className={`h-2 rounded-full bg-gradient-to-r ${stat.color}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${stat.progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {estimatedTimeRemaining && estimatedTimeRemaining > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 backdrop-blur rounded-xl p-4 border border-indigo-500/30"
        >
          <div className="flex items-center gap-2 text-indigo-300 text-sm font-medium mb-1">
            <FaClock className="w-3 h-3" />
            Осталось времени
          </div>
          <div className="text-xl font-bold text-white">
            {formatTime(estimatedTimeRemaining)}
          </div>
        </motion.div>
      )}

      {systemStats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {systemStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-slate-800/30 backdrop-blur rounded-lg p-3 border border-white/10"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`p-1.5 rounded bg-gradient-to-r ${stat.color}`}>
                  <stat.icon className="w-3 h-3 text-white" />
                </div>
                <div className="text-xs text-slate-400">{stat.label}</div>
              </div>
              <div className="text-sm font-bold text-white">{stat.value}</div>
              {stat.progress !== undefined && (
                <div className="w-full bg-slate-700 rounded-full h-1 mt-1">
                  <div 
                    className={`h-1 rounded-full bg-gradient-to-r ${stat.color}`}
                    style={{ width: `${Math.min(100, stat.progress)}%` }}
                  />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}