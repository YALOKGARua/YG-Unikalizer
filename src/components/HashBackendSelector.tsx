import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { checkRustAvailable, benchmarkBackends } from '../lib/hash-engine'

type HashBackend = 'auto' | 'rust' | 'cpp'

interface Props {
  value: HashBackend
  onChange: (backend: HashBackend) => void
}

export default function HashBackendSelector({ value, onChange }: Props) {
  const { t } = useTranslation()
  const [rustAvailable, setRustAvailable] = useState(false)
  const [benchmarking, setBenchmarking] = useState(false)
  const [speedup, setSpeedup] = useState<number | null>(null)

  useEffect(() => {
    checkRustAvailable().then(setRustAvailable)
  }, [])

  const handleBenchmark = async () => {
    setBenchmarking(true)
    try {
      const testPaths: string[] = []
      const results = await benchmarkBackends(testPaths)
      
      if (results.rust.available && results.cpp.available) {
        const speedupVal = results.cpp.time / results.rust.time
        setSpeedup(speedupVal)
      }
    } catch (error) {
      console.error('Benchmark failed:', error)
    } finally {
      setBenchmarking(false)
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {t('hash.backend')}
      </label>
      
      <div className="flex gap-2">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as HashBackend)}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
        >
          <option value="auto">{t('hash.auto')}</option>
          <option value="rust" disabled={!rustAvailable}>
            {t('hash.rust')} {!rustAvailable && `(${t('hash.unavailable')})`}
          </option>
          <option value="cpp">{t('hash.cpp')}</option>
        </select>

        <button
          onClick={handleBenchmark}
          disabled={benchmarking || !rustAvailable}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
        >
          {benchmarking ? '...' : t('hash.benchmark')}
        </button>
      </div>

      {speedup && (
        <p className="text-sm text-green-600 dark:text-green-400">
          {t('hash.rustFaster', { x: speedup.toFixed(1) })}
        </p>
      )}

      {!rustAvailable && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          🦀 Rust {t('hash.unavailable')} — см. RUST_SETUP.md
        </p>
      )}
    </div>
  )
}
