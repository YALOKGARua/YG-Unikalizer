#pragma once
#include <cstdint>
#include <vector>
#include <memory>
#include <unordered_map>

namespace photounikalizer_native {

struct HammingHit { size_t index; int distance; };

int create_hamming_index(const std::vector<uint64_t>& hashes);
std::vector<HammingHit> query_hamming_index(int id, uint64_t query, size_t k, int maxDistance);
void free_hamming_index(int id);

std::vector<std::vector<size_t>> cluster_by_hamming(const std::vector<uint64_t>& hashes, int threshold);

}