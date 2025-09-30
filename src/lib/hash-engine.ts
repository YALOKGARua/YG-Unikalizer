export type HashBackend = 'cpp' | 'rust' | 'auto'
export type HashAlgorithm = 'ahash' | 'dhash' | 'phash'

export interface HashEngineOptions {
  backend?: HashBackend
  algorithm?: HashAlgorithm
  paths: string[]
}

export interface HashResult {
  ok: boolean
  hashes?: string[]
  backend?: string
  error?: string
}

declare global {
  interface Window {
    api?: {
      invoke?: (channel: string, ...args: any[]) => Promise<any>
    }
  }
}

export async function hashImages(options: HashEngineOptions): Promise<HashResult> {
  const { backend = 'auto', algorithm = 'phash', paths } = options

  if (!paths || paths.length === 0) {
    return { ok: true, hashes: [] }
  }

  if (backend === 'rust' || backend === 'auto') {
    try {
      const rustResult = await window.api?.invoke('rust-ahash-batch', { paths, algorithm })
      if (rustResult?.ok) {
        return rustResult
      }
      if (backend === 'rust') {
        return { ok: false, error: rustResult?.error || 'rust-failed' }
      }
    } catch (error) {
      if (backend === 'rust') {
        return { ok: false, error: String(error) }
      }
    }
  }

  try {
    const cppResult = await window.api?.invoke('native-ahash-batch', { paths })
    return { ...cppResult, backend: 'cpp' }
  } catch (error) {
    return { ok: false, error: String(error) }
  }
}

export async function checkRustAvailable(): Promise<boolean> {
  try {
    const result = await window.api?.invoke('load-rust-module')
    return result !== null && result !== undefined
  } catch {
    return false
  }
}

export async function benchmarkBackends(testPaths: string[]): Promise<{
  rust: { time: number; available: boolean }
  cpp: { time: number; available: boolean }
}> {
  const results = {
    rust: { time: 0, available: false },
    cpp: { time: 0, available: false }
  }

  const rustStart = performance.now()
  const rustResult = await hashImages({ backend: 'rust', paths: testPaths })
  results.rust.time = performance.now() - rustStart
  results.rust.available = rustResult.ok

  const cppStart = performance.now()
  const cppResult = await hashImages({ backend: 'cpp', paths: testPaths })
  results.cpp.time = performance.now() - cppStart
  results.cpp.available = cppResult.ok

  return results
}
