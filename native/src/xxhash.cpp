#include "image_hash.h"
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <fstream>

namespace photounikalizer_native {

static inline uint64_t rotl64(uint64_t x, int r) { return (x << r) | (x >> (64 - r)); }

uint64_t xxh64_bytes(const void* input, size_t len, uint64_t seed) {
  const uint8_t* p = static_cast<const uint8_t*>(input);
  const uint8_t* const end = p + len;
  const uint64_t PRIME64_1 = 11400714785074694791ULL;
  const uint64_t PRIME64_2 = 14029467366897019727ULL;
  const uint64_t PRIME64_3 = 1609587929392839161ULL;
  const uint64_t PRIME64_4 = 9650029242287828579ULL;
  const uint64_t PRIME64_5 = 2870177450012600261ULL;

  uint64_t h64;
  if (len >= 32) {
    uint64_t v1 = seed + PRIME64_1 + PRIME64_2;
    uint64_t v2 = seed + PRIME64_2;
    uint64_t v3 = seed + 0;
    uint64_t v4 = seed - PRIME64_1;
    const uint8_t* const limit = end - 32;
    do {
      v1 += (*reinterpret_cast<const uint64_t*>(p)) * PRIME64_2; p += 8; v1 = rotl64(v1, 31); v1 *= PRIME64_1;
      v2 += (*reinterpret_cast<const uint64_t*>(p)) * PRIME64_2; p += 8; v2 = rotl64(v2, 31); v2 *= PRIME64_1;
      v3 += (*reinterpret_cast<const uint64_t*>(p)) * PRIME64_2; p += 8; v3 = rotl64(v3, 31); v3 *= PRIME64_1;
      v4 += (*reinterpret_cast<const uint64_t*>(p)) * PRIME64_2; p += 8; v4 = rotl64(v4, 31); v4 *= PRIME64_1;
    } while (p <= limit);
    h64 = rotl64(v1, 1) + rotl64(v2, 7) + rotl64(v3, 12) + rotl64(v4, 18);
    v1 *= PRIME64_2; v1 = rotl64(v1, 31); v1 *= PRIME64_1; h64 ^= v1; h64 = h64 * PRIME64_1 + PRIME64_4;
    v2 *= PRIME64_2; v2 = rotl64(v2, 31); v2 *= PRIME64_1; h64 ^= v2; h64 = h64 * PRIME64_1 + PRIME64_4;
    v3 *= PRIME64_2; v3 = rotl64(v3, 31); v3 *= PRIME64_1; h64 ^= v3; h64 = h64 * PRIME64_1 + PRIME64_4;
    v4 *= PRIME64_2; v4 = rotl64(v4, 31); v4 *= PRIME64_1; h64 ^= v4; h64 = h64 * PRIME64_1 + PRIME64_4;
  } else {
    h64 = seed + PRIME64_5;
  }
  h64 += static_cast<uint64_t>(len);
  while ((p + 8) <= end) { uint64_t k1 = (*reinterpret_cast<const uint64_t*>(p)); p += 8; k1 *= PRIME64_2; k1 = rotl64(k1,31); k1 *= PRIME64_1; h64 ^= k1; h64 = rotl64(h64,27) * PRIME64_1 + PRIME64_4; }
  if ((p + 4) <= end) { h64 ^= static_cast<uint64_t>(*reinterpret_cast<const uint32_t*>(p)) * PRIME64_1; p += 4; h64 = rotl64(h64,23) * PRIME64_2 + PRIME64_3; }
  while (p < end) { h64 ^= (*p) * PRIME64_5; p++; h64 = rotl64(h64,11) * PRIME64_1; }
  h64 ^= h64 >> 33; h64 *= PRIME64_2; h64 ^= h64 >> 29; h64 *= PRIME64_3; h64 ^= h64 >> 32;
  return h64;
}

uint64_t xxh64_file(const std::string& path, bool& ok) {
  std::ifstream in(path, std::ios::binary);
  if (!in.good()) { ok = false; return 0ULL; }
  const size_t BUF = 1 << 20;
  std::vector<uint8_t> buf(BUF);
  uint64_t state = 0;
  while (in.good()) {
    in.read(reinterpret_cast<char*>(buf.data()), BUF);
    std::streamsize got = in.gcount();
    if (got <= 0) break;
    state = xxh64_bytes(buf.data(), static_cast<size_t>(got), state);
  }
  ok = true;
  return state;
}

}