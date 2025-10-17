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

function getInvoker(): ((channel: string, ...args: any[]) => Promise<any>) | undefined {
  try {
    const w = (window as any)
    const inv = w?.api?.invoke
    return typeof inv === 'function' ? inv.bind(w.api) : undefined
  } catch {
    return undefined
  }
}

export async function hashImages(options: HashEngineOptions): Promise<HashResult> {
  const { backend = 'auto', algorithm = 'phash', paths } = options

  const __inv = getInvoker()

  if (!paths || paths.length === 0) {
    return { ok: true, hashes: [] }
  }

  if (backend === 'rust' || backend === 'auto') {
    try {
      const rustResult = __inv ? await __inv('rust-ahash-batch', { paths, algorithm }) : null
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
    const cppResult = __inv ? await __inv('native-ahash-batch', { paths }) : null
    return cppResult && typeof cppResult === 'object' ? { ...(cppResult as any), backend: 'cpp' } : { ok: false, error: 'ipc-unavailable' }
  } catch (error) {
    return { ok: false, error: String(error) }
  }
}

export async function checkRustAvailable(): Promise<boolean> {
  try {
    const __inv2 = getInvoker()
    if (!__inv2) return false
    const result = await __inv2('load-rust-module')
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