# YG-Unikalizer Rust Native Module

High-performance image processing module written in Rust using NAPI-RS.

## Features

- **Image Hashing**: aHash, dHash, pHash algorithms
- **Parallel Processing**: Batch operations using Rayon
- **XXHash**: Ultra-fast hashing with XXH3
- **Image Info**: Extract image metadata

## Build

### Prerequisites

- Rust toolchain (rustup)
- Node.js 18+
- MSVC Build Tools (Windows)

### Commands

```bash
npm install
npm run build
```

### Development

```bash
npm run build:debug
```

## Usage

```typescript
import { ImageHasher, hammingDistance, batchHash, getImageInfo } from '../rust-native'

const hasher = new ImageHasher()
const hash = hasher.ahash('path/to/image.jpg')

const distance = hammingDistance(hash1, hash2)

const hashes = batchHash(['img1.jpg', 'img2.jpg'], 'phash')

const info = getImageInfo('image.png')
```

## API

### ImageHasher

- `ahash(path: string): string` - Average hash
- `dhash(path: string): string` - Difference hash  
- `phash(path: string): string` - Perceptual hash

### Functions

- `hammingDistance(hash1: string, hash2: string): number`
- `batchHash(paths: string[], algorithm: string): string[]`
- `xxhash64(buffer: Buffer): string`
- `getImageInfo(path: string): ImageInfo`

## Performance

Rust implementation is 3-5x faster than C++ for image hashing operations.
