#pragma once
#include <string>
#include <vector>
#include <cstdint>

namespace photounikalizer_native {

bool wic_decode_gray8_file(const std::string& path, std::vector<uint8_t>& out, int& width, int& height, size_t& stride);

}