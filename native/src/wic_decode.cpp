#include "wic_decode.h"
#include <wincodec.h>
#include <vector>
#pragma comment(lib, "windowscodecs.lib")

namespace photounikalizer_native {

static bool init_wic(IWICImagingFactory** pp) {
  static IWICImagingFactory* g = nullptr;
  if (g) { *pp = g; return true; }
  HRESULT hrInit = CoInitializeEx(nullptr, COINIT_MULTITHREADED);
  (void)hrInit;
  HRESULT hr = CoCreateInstance(CLSID_WICImagingFactory, nullptr, CLSCTX_INPROC_SERVER, IID_PPV_ARGS(&g));
  if (FAILED(hr)) return false;
  *pp = g; return true;
}

bool wic_decode_gray8_file(const std::string& path, std::vector<uint8_t>& out, int& width, int& height, size_t& stride) {
  IWICImagingFactory* fac = nullptr;
  if (!init_wic(&fac)) return false;
  std::wstring wpath(path.begin(), path.end());
  IWICBitmapDecoder* dec = nullptr;
  HRESULT hr = fac->CreateDecoderFromFilename(wpath.c_str(), nullptr, GENERIC_READ, WICDecodeMetadataCacheOnLoad, &dec);
  if (FAILED(hr) || !dec) return false;
  IWICBitmapFrameDecode* frame = nullptr;
  hr = dec->GetFrame(0, &frame);
  if (FAILED(hr) || !frame) { dec->Release(); return false; }
  IWICFormatConverter* conv = nullptr;
  hr = fac->CreateFormatConverter(&conv);
  if (FAILED(hr) || !conv) { frame->Release(); dec->Release(); return false; }
  hr = conv->Initialize(frame, GUID_WICPixelFormat8bppGray, WICBitmapDitherTypeNone, nullptr, 0.0, WICBitmapPaletteTypeCustom);
  if (FAILED(hr)) { conv->Release(); frame->Release(); dec->Release(); return false; }
  UINT w=0,h=0; conv->GetSize(&w,&h);
  width = static_cast<int>(w); height = static_cast<int>(h); stride = static_cast<size_t>(w);
  out.resize(static_cast<size_t>(width) * height);
  hr = conv->CopyPixels(nullptr, static_cast<UINT>(stride), static_cast<UINT>(out.size()), out.data());
  conv->Release(); frame->Release(); dec->Release();
  return SUCCEEDED(hr);
}

}