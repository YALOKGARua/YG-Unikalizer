export {};

let wasm: any = null

async function loadWasm() {
  if (wasm) return wasm
  const candidates: string[] = []
  try { candidates.push(new URL('/wasm/pu.wasm', (self as any).location?.origin || '').toString()) } catch {}
  try { candidates.push(new URL('wasm/pu.wasm', (self as any).location?.href || '').toString()) } catch {}
  try { candidates.push('/wasm/pu.wasm') } catch {}
  let lastErr: any = null
  for (const url of Array.from(new Set(candidates)).filter(Boolean)) {
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const buf = await res.arrayBuffer()
      const { instance } = await WebAssembly.instantiate(buf, {}) as any
      wasm = instance && instance.exports ? instance.exports : null
      if (wasm) return wasm
    } catch (e) { lastErr = e }
  }
  throw lastErr || new Error('wasm-not-found')
}

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data || {}
  if (msg.type === 'ahash-gray') {
    try {
      const mod = await loadWasm()
      if (!mod || !mod.memory || !mod.aHashGray) {
        ;(self as any).postMessage({ id: msg.id, ok: false, error: 'wasm-missing' })
        return
      }
      const width = Number(msg.width||0)
      const height = Number(msg.height||0)
      const data: Uint8Array = msg.gray
      const mem = new Uint8Array(mod.memory.buffer)
      const len = width * height
      const ptr = mod.__new ? mod.__new(len, 0) : 0
      if (!ptr) { (self as any).postMessage({ id: msg.id, ok: false, error: 'alloc-failed' }); return }
      mem.set(data, ptr)
      const v = mod.aHashGray(ptr, width, height)
      const hex = typeof v === 'bigint' ? v.toString(16) : v.toString(16)
      ;(self as any).postMessage({ id: msg.id, ok: true, hash: hex })
    } catch (err) {
      ;(self as any).postMessage({ id: msg.id, ok: false, error: String(err||'error') })
    }
  }
}
