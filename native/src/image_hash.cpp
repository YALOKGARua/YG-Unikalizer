#include "image_hash.h"
#include <cstdint>
#include <filesystem>
#include <fstream>
#include <algorithm>
#include <vector>
#include <immintrin.h>
#include <cmath>

namespace fs = std::filesystem;

namespace photounikalizer_native {

static inline char to_lower_char(char c) {
    if (c >= 'A' && c <= 'Z') return c - 'A' + 'a';
    return c;
}

static inline std::string to_lower_copy(const std::string& s) {
    std::string out(s);
    std::transform(out.begin(), out.end(), out.begin(), to_lower_char);
    return out;
}

bool is_allowed_image_extension(const std::string& path) {
    std::string lower = to_lower_copy(path);
    size_t dot = lower.find_last_of('.');
    if (dot == std::string::npos) return false;
    std::string ext = lower.substr(dot);
    return ext == ".jpg" || ext == ".jpeg" || ext == ".png" || ext == ".webp" || ext == ".avif" || ext == ".tif" || ext == ".tiff";
}

uint64_t fnv1a64_file(const std::string& path, bool& ok) {
    static const uint64_t FNV_OFFSET_BASIS = 14695981039346656037ull;
    static const uint64_t FNV_PRIME = 1099511628211ull;
    std::ifstream in(path, std::ios::binary);
    if (!in.good()) {
        ok = false;
        return 0ull;
    }
    uint64_t hash = FNV_OFFSET_BASIS;
    char buffer[64 * 1024];
    while (in.good()) {
        in.read(buffer, sizeof(buffer));
        std::streamsize got = in.gcount();
        for (std::streamsize i = 0; i < got; ++i) {
            hash ^= static_cast<unsigned char>(buffer[i]);
            hash *= FNV_PRIME;
        }
    }
    ok = true;
    return hash;
}

std::vector<std::string> list_files(const std::string& root, bool recursive) {
    std::vector<std::string> out;
    std::error_code ec;
    fs::file_status st = fs::status(root, ec);
    if (ec) return out;
    if (fs::is_regular_file(st)) {
        if (is_allowed_image_extension(root)) out.push_back(root);
        return out;
    }
    if (!fs::is_directory(st)) return out;
    if (recursive) {
        for (fs::recursive_directory_iterator it(root, ec), end; it != end && !ec; it.increment(ec)) {
            if (ec) break;
            const fs::directory_entry& de = *it;
            if (!de.is_regular_file()) continue;
            std::string p = de.path().string();
            if (is_allowed_image_extension(p)) out.push_back(p);
        }
    } else {
        for (fs::directory_iterator it(root, ec), end; it != end && !ec; it.increment(ec)) {
            if (ec) break;
            const fs::directory_entry& de = *it;
            if (!de.is_regular_file()) continue;
            std::string p = de.path().string();
            if (is_allowed_image_extension(p)) out.push_back(p);
        }
    }
    return out;
}

int hamming_distance_uint64(uint64_t a, uint64_t b) {
    uint64_t x = a ^ b;
#if defined(__POPCNT__) || defined(_MSC_VER)
    return static_cast<int>(__popcnt64(x));
#else
    int c = 0;
    while (x) { x &= (x - 1); ++c; }
    return c;
#endif
}

static inline uint8_t clamp_u8(int v) {
    if (v < 0) return 0;
    if (v > 255) return 255;
    return static_cast<uint8_t>(v);
}

static std::vector<uint8_t> resize_bilinear_gray8(const uint8_t* src, int sw, int sh, size_t sstride, int dw, int dh) {
    std::vector<uint8_t> out(static_cast<size_t>(dw) * static_cast<size_t>(dh));
    const double x_ratio = (sw > 1 && dw > 1) ? static_cast<double>(sw - 1) / (dw - 1) : 0.0;
    const double y_ratio = (sh > 1 && dh > 1) ? static_cast<double>(sh - 1) / (dh - 1) : 0.0;
    for (int y = 0; y < dh; ++y) {
        double sy = y * y_ratio;
        int y0 = static_cast<int>(sy);
        int y1 = std::min(y0 + 1, sh - 1);
        double fy = sy - y0;
        for (int x = 0; x < dw; ++x) {
            double sx = x * x_ratio;
            int x0 = static_cast<int>(sx);
            int x1 = std::min(x0 + 1, sw - 1);
            double fx = sx - x0;
            const uint8_t* row0 = src + static_cast<size_t>(y0) * sstride;
            const uint8_t* row1 = src + static_cast<size_t>(y1) * sstride;
            int p00 = row0[x0];
            int p01 = row0[x1];
            int p10 = row1[x0];
            int p11 = row1[x1];
            double top = p00 + (p01 - p00) * fx;
            double bot = p10 + (p11 - p10) * fx;
            int val = static_cast<int>(top + (bot - top) * fy + 0.5);
            out[static_cast<size_t>(y) * dw + x] = clamp_u8(val);
        }
    }
    return out;
}

uint64_t ahash_from_gray8(const uint8_t* data, int width, int height, size_t stride) {
    if (!data || width <= 0 || height <= 0 || stride < static_cast<size_t>(width)) return 0ull;
    const int dw = 8, dh = 8;
    std::vector<uint8_t> img = resize_bilinear_gray8(data, width, height, stride, dw, dh);
    uint64_t hash = 0ull;
    uint32_t sum = 0;
    for (int i = 0; i < dw * dh; ++i) sum += img[static_cast<size_t>(i)];
    uint8_t avg = static_cast<uint8_t>(sum / (dw * dh));
    for (int i = 0; i < dw * dh; ++i) {
        hash <<= 1;
        if (img[static_cast<size_t>(i)] >= avg) hash |= 1ull;
    }
    return hash;
}

uint64_t dhash_from_gray8(const uint8_t* data, int width, int height, size_t stride) {
    if (!data || width <= 0 || height <= 0 || stride < static_cast<size_t>(width)) return 0ull;
    const int dw = 9, dh = 8;
    std::vector<uint8_t> img = resize_bilinear_gray8(data, width, height, stride, dw, dh);
    uint64_t hash = 0ull;
    for (int y = 0; y < 8; ++y) {
        for (int x = 0; x < 8; ++x) {
            uint8_t a = img[static_cast<size_t>(y) * dw + x];
            uint8_t b = img[static_cast<size_t>(y) * dw + x + 1];
            hash <<= 1;
            if (a < b) hash |= 1ull;
        }
    }
    return hash;
}

static void dct_1d(const double* in, double* out, int n) {
    const double PI = 3.14159265358979323846;
    for (int k = 0; k < n; ++k) {
        double sum = 0.0;
        for (int i = 0; i < n; ++i) {
            sum += in[i] * std::cos(PI * (i + 0.5) * k / n);
        }
        out[k] = sum;
    }
}

uint64_t phash_from_gray8(const uint8_t* data, int width, int height, size_t stride) {
    if (!data || width <= 0 || height <= 0 || stride < static_cast<size_t>(width)) return 0ull;
    const int dw = 32, dh = 32;
    std::vector<uint8_t> img = resize_bilinear_gray8(data, width, height, stride, dw, dh);
    std::vector<double> fimg(static_cast<size_t>(dw) * dh);
    for (int i = 0; i < dw * dh; ++i) fimg[static_cast<size_t>(i)] = static_cast<double>(img[static_cast<size_t>(i)]);
    std::vector<double> temp(static_cast<size_t>(dw) * dh);
    std::vector<double> dct(static_cast<size_t>(dw) * dh);
    for (int y = 0; y < dh; ++y) dct_1d(&fimg[static_cast<size_t>(y) * dw], &temp[static_cast<size_t>(y) * dw], dw);
    for (int x = 0; x < dw; ++x) {
        std::vector<double> col(static_cast<size_t>(dh));
        std::vector<double> out(static_cast<size_t>(dh));
        for (int y = 0; y < dh; ++y) col[static_cast<size_t>(y)] = temp[static_cast<size_t>(y) * dw + x];
        dct_1d(col.data(), out.data(), dh);
        for (int y = 0; y < dh; ++y) dct[static_cast<size_t>(y) * dw + x] = out[static_cast<size_t>(y)];
    }
    const int sz = 8;
    double sum = 0.0;
    int cnt = 0;
    for (int y = 0; y < sz; ++y) {
        for (int x = 0; x < sz; ++x) {
            if (y == 0 && x == 0) continue;
            sum += dct[static_cast<size_t>(y) * dw + x];
            cnt += 1;
        }
    }
    double avg = cnt > 0 ? (sum / cnt) : 0.0;
    uint64_t hash = 0ull;
    for (int y = 0; y < sz; ++y) {
        for (int x = 0; x < sz; ++x) {
            if (y == 0 && x == 0) continue;
            hash <<= 1;
            if (dct[static_cast<size_t>(y) * dw + x] >= avg) hash |= 1ull;
        }
    }
    return hash;
}

std::vector<std::pair<size_t,int>> topk_hamming(const std::vector<uint64_t>& hashes, uint64_t query, size_t k) {
    std::vector<std::pair<size_t,int>> out;
    out.reserve(hashes.size());
    for (size_t i = 0; i < hashes.size(); ++i) out.emplace_back(i, hamming_distance_uint64(hashes[i], query));
    std::stable_sort(out.begin(), out.end(), [](const auto& a, const auto& b){ return a.second < b.second; });
    if (out.size() > k) out.resize(k);
    return out;
}

static inline char lower_char(char c) { return (c >= 'A' && c <= 'Z') ? static_cast<char>(c - ('A' - 'a')) : c; }

static bool contains_any(const std::string& haystack, const std::vector<std::string>& needles) {
    std::string lower = haystack;
    std::transform(lower.begin(), lower.end(), lower.begin(), lower_char);
    for (const auto& n : needles) {
        if (n.empty()) continue;
        if (lower.find(n) != std::string::npos) return true;
    }
    return false;
}

std::vector<std::string> list_files_filtered(const std::string& root, bool recursive, const std::vector<std::string>& excludes) {
    std::vector<std::string> files = list_files(root, recursive);
    if (excludes.empty()) return files;
    std::vector<std::string> out;
    out.reserve(files.size());
    for (const auto& f : files) if (!contains_any(f, excludes)) out.push_back(f);
    return out;
}

}