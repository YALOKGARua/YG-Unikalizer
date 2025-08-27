export function init(): void {}

@inline
function sample(gray: Uint8Array, w: i32, h: i32, x: f32, y: f32): i32 {
  let xi = i32(<f32>Math.floor(x))
  let yi = i32(<f32>Math.floor(y))
  if (xi < 0) xi = 0; if (yi < 0) yi = 0
  if (xi >= w) xi = w - 1; if (yi >= h) yi = h - 1
  return gray[yi * w + xi]
}

export function aHashGray(gray: Uint8Array, width: i32, height: i32): u64 {
  const w = width, h = height
  let vals = new Array<i32>(64)
  let idx = 0
  for (let j = 0; j < 8; j++) {
    for (let i = 0; i < 8; i++) {
      const x = (i as f32 + 0.5) * (<f32>w / 8.0)
      const y = (j as f32 + 0.5) * (<f32>h / 8.0)
      vals[idx++] = sample(gray, w, h, x, y)
    }
  }
  let sum = 0
  for (let k = 0; k < 64; k++) sum += vals[k]
  const avg = sum / 64
  let bits: u64 = 0
  for (let k = 0; k < 64; k++) {
    bits = (bits << 1) | (vals[k] >= avg ? 1 : 0)
  }
  return bits
}

export function dHashGray(gray: Uint8Array, width: i32, height: i32): u64 {
  const w = width, h = height
  let bits: u64 = 0
  for (let j = 0; j < 8; j++) {
    for (let i = 0; i < 8; i++) {
      const x1 = (i as f32 + 0.5) * (<f32>w / 9.0)
      const x2 = (i as f32 + 1.5) * (<f32>w / 9.0)
      const y = (j as f32 + 0.5) * (<f32>h / 8.0)
      const a = sample(gray, w, h, x1, y)
      const b = sample(gray, w, h, x2, y)
      bits = (bits << 1) | (a < b ? 1 : 0)
    }
  }
  return bits
}