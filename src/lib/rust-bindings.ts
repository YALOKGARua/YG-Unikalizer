import { ipcRenderer } from 'electron'

export interface ImageHasher {
  new(): ImageHasher
  ahash(path: string): string
  dhash(path: string): string
  phash(path: string): string
}

export interface ImageInfo {
  width: number
  height: number
  format: string
  has_alpha: boolean
}

export async function loadRustModule() {
  try {
    const rustModule = await ipcRenderer.invoke('load-rust-module')
    return rustModule
  } catch (error) {
    console.warn('Rust module not available, falling back to C++:', error)
    return null
  }
}

export async function hashImageRust(
  path: string,
  algorithm: 'ahash' | 'dhash' | 'phash' = 'phash'
): Promise<string | null> {
  try {
    const rust = await loadRustModule()
    if (!rust) return null

    const hasher = new rust.ImageHasher()
    return hasher[algorithm](path)
  } catch (error) {
    console.error('Rust hash error:', error)
    return null
  }
}

export async function batchHashRust(
  paths: string[],
  algorithm: 'ahash' | 'dhash' | 'phash' = 'phash'
): Promise<string[]> {
  try {
    const rust = await loadRustModule()
    if (!rust) return []

    return rust.batchHash(paths, algorithm)
  } catch (error) {
    console.error('Rust batch hash error:', error)
    return []
  }
}

export async function hammingDistanceRust(
  hash1: string,
  hash2: string
): Promise<number | null> {
  try {
    const rust = await loadRustModule()
    if (!rust) return null

    return rust.hammingDistance(hash1, hash2)
  } catch (error) {
    console.error('Rust hamming distance error:', error)
    return null
  }
}

export async function getImageInfoRust(
  path: string
): Promise<ImageInfo | null> {
  try {
    const rust = await loadRustModule()
    if (!rust) return null

    return rust.getImageInfo(path)
  } catch (error) {
    console.error('Rust image info error:', error)
    return null
  }
}

export async function xxhash64Rust(data: Uint8Array): Promise<string | null> {
  try {
    const rust = await loadRustModule()
    if (!rust) return null

    return rust.xxhash64(Buffer.from(data))
  } catch (error) {
    console.error('Rust xxhash error:', error)
    return null
  }
}