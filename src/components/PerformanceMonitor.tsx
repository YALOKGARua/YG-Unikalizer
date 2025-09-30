import { useEffect, useState, memo } from 'react'
import { fps } from '../lib/performance'

const PerformanceMonitor = memo(() => {
  const [currentFps, setCurrentFps] = useState(60)
  const [memoryUsage, setMemoryUsage] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setVisible(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  useEffect(() => {
    if (!visible) return

    const stopFps = fps(setCurrentFps)

    const memInterval = setInterval(() => {
      if ('memory' in performance) {
        const mem = (performance as any).memory
        setMemoryUsage(Math.round(mem.usedJSHeapSize / 1048576))
      }
    }, 1000)

    return () => {
      clearInterval(memInterval)
    }
  }, [visible])

  if (!visible) return null

  const fpsColor = currentFps >= 50 ? 'text-green-400' : currentFps >= 30 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="fixed bottom-4 right-4 z-[9999] bg-black/90 backdrop-blur-sm text-white p-3 rounded-lg shadow-lg border border-white/20 font-mono text-xs space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-gray-400">FPS:</span>
        <span className={`font-bold ${fpsColor}`}>{currentFps}</span>
      </div>
      
      {memoryUsage > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Memory:</span>
          <span className="font-bold text-blue-400">{memoryUsage} MB</span>
        </div>
      )}
      
      <div className="text-[10px] text-gray-500 pt-1 border-t border-gray-700">
        Ctrl+Shift+P to toggle
      </div>
    </div>
  )
})

PerformanceMonitor.displayName = 'PerformanceMonitor'

export default PerformanceMonitor
