#include "hamming_index.h"
#include <queue>
#include <unordered_map>
#include <limits>
#include <algorithm>

namespace photounikalizer_native {

static int hd64(uint64_t a, uint64_t b) {
#if defined(__POPCNT__) || defined(_MSC_VER)
  return static_cast<int>(__popcnt64(a ^ b));
#else
  uint64_t x = a ^ b; int c=0; while (x) { x &= x-1; ++c; } return c;
#endif
}

struct VpNode {
  uint64_t pivot;
  int thresh;
  int left;
  int right;
  int idx;
};

struct VpTree {
  std::vector<uint64_t> hashes;
  std::vector<int> indices;
  std::vector<VpNode> nodes;
};

static int build_node(VpTree& t, std::vector<int>& ids) {
  if (ids.empty()) return -1;
  int pivotIdx = ids.back(); ids.pop_back();
  VpNode node; node.pivot = t.hashes[pivotIdx]; node.idx = pivotIdx; node.left = -1; node.right = -1; node.thresh = -1;
  if (ids.empty()) { int id = static_cast<int>(t.nodes.size()); t.nodes.push_back(node); return id; }
  std::vector<std::pair<int,int>> distIds;
  distIds.reserve(ids.size());
  for (int id : ids) distIds.emplace_back(id, hd64(t.hashes[pivotIdx], t.hashes[id]));
  size_t mid = distIds.size() / 2;
  std::nth_element(distIds.begin(), distIds.begin()+mid, distIds.end(), [](const auto& a, const auto& b){ return a.second < b.second; });
  int mu = distIds[mid].second;
  std::vector<int> left, right;
  left.reserve(distIds.size()); right.reserve(distIds.size());
  for (const auto& p : distIds) { if (p.second <= mu) left.push_back(p.first); else right.push_back(p.first); }
  node.thresh = mu;
  int self = static_cast<int>(t.nodes.size());
  t.nodes.push_back(node);
  t.nodes[self].left = build_node(t, left);
  t.nodes[self].right = build_node(t, right);
  return self;
}

static int next_id = 1;
static std::unordered_map<int, std::unique_ptr<VpTree>> g_indices;

int create_hamming_index(const std::vector<uint64_t>& hashes) {
  auto tree = std::make_unique<VpTree>();
  tree->hashes = hashes;
  std::vector<int> ids(hashes.size());
  for (size_t i=0;i<hashes.size();++i) ids[i] = static_cast<int>(i);
  build_node(*tree, ids);
  int id = next_id++;
  g_indices[id] = std::move(tree);
  return id;
}

static void search_node(const VpTree& t, int nodeId, uint64_t q, size_t k, int maxD, std::priority_queue<std::pair<int,int>>& heap) {
  if (nodeId < 0) return;
  const VpNode& n = t.nodes[nodeId];
  int d = hd64(q, n.pivot);
  if (d <= maxD) {
    if (heap.size() < k) heap.emplace(d, n.idx);
    else if (d < heap.top().first) { heap.pop(); heap.emplace(d, n.idx); }
  }
  if (n.left < 0 && n.right < 0) return;
  if (d - maxD <= n.thresh) search_node(t, n.left, q, k, maxD, heap);
  if (d + maxD >= n.thresh) search_node(t, n.right, q, k, maxD, heap);
}

std::vector<HammingHit> query_hamming_index(int id, uint64_t query, size_t k, int maxDistance) {
  std::vector<HammingHit> out;
  auto it = g_indices.find(id);
  if (it == g_indices.end()) return out;
  std::priority_queue<std::pair<int,int>> heap;
  search_node(*it->second, 0, query, k, maxDistance, heap);
  out.reserve(heap.size());
  while (!heap.empty()) { auto p = heap.top(); heap.pop(); out.push_back({ static_cast<size_t>(p.second), p.first }); }
  std::reverse(out.begin(), out.end());
  return out;
}

void free_hamming_index(int id) { g_indices.erase(id); }

std::vector<std::vector<size_t>> cluster_by_hamming(const std::vector<uint64_t>& hashes, int threshold) {
  std::vector<int> parent(hashes.size()); for (size_t i=0;i<hashes.size();++i) parent[i]=static_cast<int>(i);
  auto find=[&](int x){ while(parent[x]!=x) x=parent[x]=parent[parent[x]]; return x; };
  auto unite=[&](int a,int b){ a=find(a); b=find(b); if(a!=b) parent[a]=b; };
  for (size_t i=0;i<hashes.size();++i) for (size_t j=i+1;j<hashes.size();++j) if (hd64(hashes[i], hashes[j]) <= threshold) unite(static_cast<int>(i), static_cast<int>(j));
  std::unordered_map<int,std::vector<size_t>> groups;
  for (size_t i=0;i<hashes.size();++i) groups[find(static_cast<int>(i))].push_back(i);
  std::vector<std::vector<size_t>> out; out.reserve(groups.size());
  for (auto& kv : groups) out.push_back(std::move(kv.second));
  return out;
}

}