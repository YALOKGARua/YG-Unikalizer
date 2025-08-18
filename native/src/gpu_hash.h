#pragma once
#include <cstdint>
#include <cstddef>

namespace photounikalizer_native {

bool gpu_init();
void gpu_shutdown();
void gpu_set_enabled(bool enabled);
bool gpu_is_enabled();
bool gpu_supported();
const char* gpu_adapter_name();

bool gpu_ahash_from_gray8(const uint8_t* data, int width, int height, size_t stride, uint64_t& out);
bool gpu_dhash_from_gray8(const uint8_t* data, int width, int height, size_t stride, uint64_t& out);

}