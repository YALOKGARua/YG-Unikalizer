export {};

let wasm: any = null

async function loadWasm() {
  if (wasm) return wasm
  const res = await fetch('/wasm/pu.wasm')
  const buf = await res.arrayBuffer()
  const { instance } = await WebAssembly.instantiate(buf, {}) as any
  wasm = instance && instance.exports ? instance.exports : null
  return wasm
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
