import { useEffect, useRef, useState } from 'react'

export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0)
  const renderTimes = useRef<number[]>([])
  const startTime = useRef(performance.now())

  useEffect(() => {
    renderCount.current++
    const endTime = performance.now()
    const renderTime = endTime - startTime.current
    renderTimes.current.push(renderTime)

    if (renderCount.current % 10 === 0) {
      const avg = renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length
      console.log(`[Perf] ${componentName}: ${renderCount.current} renders, avg ${avg.toFixed(2)}ms`)
      renderTimes.current = []
    }

    startTime.current = performance.now()
  })

  return renderCount.current
}

export function useDebounceCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>()

  return ((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      callback(...args)
    }, delay)
  }) as T
}

export function useThrottle<T>(value: T, delay: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value)
  const lastRan = useRef(Date.now())

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= delay) {
        setThrottledValue(value)
        lastRan.current = Date.now()
      }
    }, delay - (Date.now() - lastRan.current))

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return throttledValue
}

export function measurePerformance(name: string, fn: () => void) {
  const start = performance.now()
  fn()
  const end = performance.now()
  console.log(`[Perf] ${name}: ${(end - start).toFixed(2)}ms`)
}

export async function measureAsync(name: string, fn: () => Promise<void>) {
  const start = performance.now()
  await fn()
  const end = performance.now()
  console.log(`[Perf] ${name}: ${(end - start).toFixed(2)}ms`)
}

export class PerformanceTracker {
  private marks: Map<string, number> = new Map()

  start(label: string) {
    this.marks.set(label, performance.now())
  }

  end(label: string, log = true): number {
    const startTime = this.marks.get(label)
    if (!startTime) {
      console.warn(`[Perf] No start mark for "${label}"`)
      return 0
    }

    const duration = performance.now() - startTime
    if (log) {
      console.log(`[Perf] ${label}: ${duration.toFixed(2)}ms`)
    }

    this.marks.delete(label)
    return duration
  }

  clear() {
    this.marks.clear()
  }
}

export const perf = new PerformanceTracker()

export function fps(callback: (fps: number) => void) {
  let lastTime = performance.now()
  let frames = 0

  function loop() {
    const now = performance.now()
    frames++

    if (now >= lastTime + 1000) {
      const currentFps = Math.round((frames * 1000) / (now - lastTime))
      callback(currentFps)
      frames = 0
      lastTime = now
    }

    requestAnimationFrame(loop)
  }

  requestAnimationFrame(loop)
}
