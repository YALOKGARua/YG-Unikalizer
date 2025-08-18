#pragma once
#include <string>
#include <vector>
#include <cstdint>
#include <utility>

namespace photounikalizer_native {

bool is_allowed_image_extension(const std::string& path);

uint64_t fnv1a64_file(const std::string& path, bool& ok);
uint64_t xxh64_file(const std::string& path, bool& ok);
uint64_t xxh64_bytes(const void* input, size_t len, uint64_t seed = 0);

std::vector<std::string> list_files(const std::string& root, bool recursive);

int hamming_distance_uint64(uint64_t a, uint64_t b);

uint64_t ahash_from_gray8(const uint8_t* data, int width, int height, size_t stride);
uint64_t dhash_from_gray8(const uint8_t* data, int width, int height, size_t stride);
uint64_t phash_from_gray8(const uint8_t* data, int width, int height, size_t stride);

std::vector<std::pair<size_t,int>> topk_hamming(const std::vector<uint64_t>& hashes, uint64_t query, size_t k);

std::vector<std::string> list_files_filtered(const std::string& root, bool recursive, const std::vector<std::string>& excludes);

uint64_t xxh64_bytes(const void* input, size_t len, uint64_t seed);

}