import { useState, useCallback, useMemo, useRef, useEffect } from 'react'

export function useOptimizedState<T>(initialValue: T) {
  const [state, setState] = useState<T>(initialValue)
  const stateRef = useRef(state)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const setOptimizedState = useCallback((value: T | ((prev: T) => T)) => {
    setState((prev) => {
      const newValue = typeof value === 'function' ? (value as Function)(prev) : value
      if (JSON.stringify(newValue) === JSON.stringify(prev)) {
        return prev
      }
      return newValue
    })
  }, [])

  return [state, setOptimizedState, stateRef] as const
}

export function useDebouncedState<T>(initialValue: T, delay: number = 300) {
  const [value, setValue] = useState<T>(initialValue)
  const [debouncedValue, setDebouncedValue] = useState<T>(initialValue)
  const timeoutRef = useRef<NodeJS.Timeout>()

  const setOptimizedValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const val = typeof newValue === 'function' ? (newValue as Function)(prev) : newValue

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        setDebouncedValue(val)
      }, delay)

      return val
    })
  }, [delay])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return [value, debouncedValue, setOptimizedValue] as const
}

export function useThrottledState<T>(initialValue: T, delay: number = 300) {
  const [value, setValue] = useState<T>(initialValue)
  const lastUpdate = useRef(Date.now())
  const pending = useRef<T | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()

  const setThrottledValue = useCallback((newValue: T | ((prev: T) => T)) => {
    const now = Date.now()
    const timeSinceLastUpdate = now - lastUpdate.current

    setValue((prev) => {
      const val = typeof newValue === 'function' ? (newValue as Function)(prev) : newValue

      if (timeSinceLastUpdate >= delay) {
        lastUpdate.current = now
        return val
      } else {
        pending.current = val

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }

        timeoutRef.current = setTimeout(() => {
          if (pending.current !== null) {
            setValue(pending.current)
            pending.current = null
            lastUpdate.current = Date.now()
          }
        }, delay - timeSinceLastUpdate)

        return prev
      }
    })
  }, [delay])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return [value, setThrottledValue] as const
}

export function useMemoizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  return useCallback((...args: Parameters<T>) => {
    return callbackRef.current(...args)
  }, deps) as T
}

export function useMemoizedValue<T>(factory: () => T, deps: React.DependencyList): T {
  const valueRef = useRef<T>()
  const depsRef = useRef<React.DependencyList>()

  if (!depsRef.current || !deps.every((dep, i) => Object.is(dep, depsRef.current![i]))) {
    valueRef.current = factory()
    depsRef.current = deps
  }

  return valueRef.current as T
}

export function useBatchedUpdates() {
  const updates = useRef<(() => void)[]>([])
  const timeoutRef = useRef<NodeJS.Timeout>()

  const schedule = useCallback((update: () => void) => {
    updates.current.push(update)

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      const batch = updates.current.slice()
      updates.current = []
      batch.forEach(fn => fn())
    }, 0)
  }, [])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return schedule
}
