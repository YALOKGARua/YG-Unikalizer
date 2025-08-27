export async function initCodecs() {
  async function instantiate(buffer) {
    try { const { instance } = await WebAssembly.instantiate(buffer, {}); return instance && instance.exports ? instance.exports : null } catch { return null }
  }
  async function tryLoadFromUserData(name) {
    try {
      if (!window.api || !window.api.wasmCodecs || !window.api.wasmCodecs.load) return null
      const r = await window.api.wasmCodecs.load(name)
      if (!r || !r.ok || !r.data) return null
      return await instantiate(new Uint8Array(r.data).buffer)
    } catch { return null }
  }
  async function tryFetchLocal(name) {
    try {
      const res = await fetch(`/wasm-codecs/${name}`)
      if (!res.ok) return null
      const buf = await res.arrayBuffer()
      return await instantiate(buf)
    } catch { return null }
  }
  const mozjpeg = await (tryLoadFromUserData('mozjpeg.wasm') || tryFetchLocal('mozjpeg.wasm'))
  const webp = await (tryLoadFromUserData('libwebp.wasm') || tryFetchLocal('libwebp.wasm'))
  const avif = await (tryLoadFromUserData('libavif.wasm') || tryFetchLocal('libavif.wasm'))

  return {
    mozjpeg,
    webp,
    avif,
    async encodeJpeg(rgba, width, height, quality = 85) {
      if (!mozjpeg || !mozjpeg.encode) return null
      try {
        const mem = new Uint8Array(mozjpeg.memory.buffer)
        const len = rgba.length
        const ptr = mozjpeg.__new ? mozjpeg.__new(len, 0) : 0
        if (!ptr) return null
        mem.set(rgba, ptr)
        const outPtr = mozjpeg.encode(ptr, width, height, quality)
        const size = mozjpeg.get_size ? mozjpeg.get_size() : 0
        return size ? new Uint8Array(mozjpeg.memory.buffer, outPtr, size) : null
      } catch { return null }
    },
    async encodeWebp(rgba, width, height, quality = 80) {
      if (!webp || !webp.encode) return null
      try {
        const mem = new Uint8Array(webp.memory.buffer)
        const len = rgba.length
        const ptr = webp.__new ? webp.__new(len, 0) : 0
        if (!ptr) return null
        mem.set(rgba, ptr)
        const outPtr = webp.encode(ptr, width, height, quality)
        const size = webp.get_size ? webp.get_size() : 0
        return size ? new Uint8Array(webp.memory.buffer, outPtr, size) : null
      } catch { return null }
    },
    async encodeAvif(rgba, width, height, quality = 50) {
      if (!avif || !avif.encode) return null
      try {
        const mem = new Uint8Array(avif.memory.buffer)
        const len = rgba.length
        const ptr = avif.__new ? avif.__new(len, 0) : 0
        if (!ptr) return null
        mem.set(rgba, ptr)
        const outPtr = avif.encode(ptr, width, height, quality)
        const size = avif.get_size ? avif.get_size() : 0
        return size ? new Uint8Array(avif.memory.buffer, outPtr, size) : null
      } catch { return null }
    }
  }
}