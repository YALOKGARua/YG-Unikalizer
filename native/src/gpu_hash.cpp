#include "gpu_hash.h"
#include <windows.h>
#include <d3d11.h>
#include <dxgi.h>
#include <string>

#pragma comment(lib, "d3d11.lib")
#pragma comment(lib, "dxgi.lib")

namespace photounikalizer_native {

static bool g_enabled = false;
static ID3D11Device* g_device = nullptr;
static ID3D11DeviceContext* g_context = nullptr;
static std::string g_adapter_str = "Unknown GPU";

static std::string narrow_from_wide(const wchar_t* ws) {
  if (!ws) return std::string();
  int len = WideCharToMultiByte(CP_UTF8, 0, ws, -1, nullptr, 0, nullptr, nullptr);
  if (len <= 0) return std::string();
  std::string out(static_cast<size_t>(len > 0 ? len - 1 : 0), '\0');
  WideCharToMultiByte(CP_UTF8, 0, ws, -1, out.data(), len, nullptr, nullptr);
  return out;
}

bool gpu_init() {
  if (g_device) return true;
  UINT flags = 0;
#ifdef _DEBUG
  flags |= D3D11_CREATE_DEVICE_DEBUG;
#endif
  D3D_FEATURE_LEVEL levels[] = {
    D3D_FEATURE_LEVEL_11_1,
    D3D_FEATURE_LEVEL_11_0,
    D3D_FEATURE_LEVEL_10_1,
    D3D_FEATURE_LEVEL_10_0
  };
  D3D_FEATURE_LEVEL got = D3D_FEATURE_LEVEL_11_0;
  HRESULT hr = D3D11CreateDevice(
    nullptr,
    D3D_DRIVER_TYPE_HARDWARE,
    nullptr,
    flags,
    levels,
    ARRAYSIZE(levels),
    D3D11_SDK_VERSION,
    &g_device,
    &got,
    &g_context
  );
  if (FAILED(hr)) return false;
  IDXGIDevice* dxgiDevice = nullptr;
  hr = g_device->QueryInterface(__uuidof(IDXGIDevice), reinterpret_cast<void**>(&dxgiDevice));
  if (SUCCEEDED(hr) && dxgiDevice) {
    IDXGIAdapter* adapter = nullptr;
    hr = dxgiDevice->GetAdapter(&adapter);
    if (SUCCEEDED(hr) && adapter) {
      DXGI_ADAPTER_DESC desc;
      if (SUCCEEDED(adapter->GetDesc(&desc))) {
        g_adapter_str = narrow_from_wide(desc.Description);
      }
      adapter->Release();
    }
    dxgiDevice->Release();
  }
  return true;
}

void gpu_shutdown() {
  if (g_context) { g_context->Release(); g_context = nullptr; }
  if (g_device) { g_device->Release(); g_device = nullptr; }
}

void gpu_set_enabled(bool enabled) { g_enabled = enabled; }
bool gpu_is_enabled() { return g_enabled; }
bool gpu_supported() { return g_device != nullptr; }
const char* gpu_adapter_name() { return g_adapter_str.c_str(); }

bool gpu_ahash_from_gray8(const uint8_t* data, int width, int height, size_t stride, uint64_t& out) {
  if (!g_enabled || !g_device || !g_context) return false;
  (void)data; (void)width; (void)height; (void)stride; (void)out;
  return false;
}

bool gpu_dhash_from_gray8(const uint8_t* data, int width, int height, size_t stride, uint64_t& out) {
  if (!g_enabled || !g_device || !g_context) return false;
  (void)data; (void)width; (void)height; (void)stride; (void)out;
  return false;
}

}