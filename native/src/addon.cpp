#include <napi.h>
#include <string>
#include <vector>
#include <thread>
#include <mutex>
#include <queue>
#include <condition_variable>
#include "image_hash.h"
#include "gpu_hash.h"

using namespace photounikalizer_native;

class AsyncHashWorker : public Napi::AsyncWorker {
 public:
  AsyncHashWorker(const Napi::Function& cb, std::string path)
    : Napi::AsyncWorker(cb), path_(std::move(path)), ok_(false), hash_(0ull) {}
  void Execute() override {
    hash_ = fnv1a64_file(path_, ok_);
  }
  void OnOK() override {
    Napi::Env env = Env();
    if (!ok_) {
      Callback().Call({ env.Null(), env.Null() });
      return;
    }
    Napi::BigInt bi = Napi::BigInt::New(env, hash_);
    Callback().Call({ env.Null(), bi });
  }
 private:
  std::string path_;
  bool ok_;
  uint64_t hash_;
};

static bool GetUint64FromJs(const Napi::Env& env, const Napi::Value& v, uint64_t& out) {
  if (v.IsBigInt()) {
    bool lossless = false;
    out = v.As<Napi::BigInt>().Uint64Value(&lossless);
    return true;
  }
  if (v.IsNumber()) {
    double d = v.As<Napi::Number>().DoubleValue();
    if (d < 0) return false;
    out = static_cast<uint64_t>(d);
    return true;
  }
  if (v.IsString()) {
    std::string s = v.As<Napi::String>().Utf8Value();
    try {
      out = std::stoull(s);
      return true;
    } catch (...) {
      return false;
    }
  }
  return false;
}

Napi::Value ComputeFileHash(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "path required").ThrowAsJavaScriptException();
    return env.Null();
  }
  std::string path = info[0].As<Napi::String>().Utf8Value();
  if (info.Length() >= 2 && info[1].IsFunction()) {
    Napi::Function cb = info[1].As<Napi::Function>();
    (new AsyncHashWorker(cb, path))->Queue();
    return env.Undefined();
  }
  bool ok = false;
  uint64_t h = fnv1a64_file(path, ok);
  if (!ok) return env.Null();
  return Napi::BigInt::New(env, h);
}

Napi::Value HammingDistance(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 2) {
    Napi::TypeError::New(env, "two hashes required").ThrowAsJavaScriptException();
    return env.Null();
  }
  uint64_t a = 0, b = 0;
  if (!GetUint64FromJs(env, info[0], a) || !GetUint64FromJs(env, info[1], b)) {
    Napi::TypeError::New(env, "invalid hash arguments").ThrowAsJavaScriptException();
    return env.Null();
  }
  int d = hamming_distance_uint64(a, b);
  return Napi::Number::New(env, d);
}

Napi::Value ScanDirectory(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "path required").ThrowAsJavaScriptException();
    return env.Null();
  }
  std::string root = info[0].As<Napi::String>().Utf8Value();
  bool recursive = true;
  if (info.Length() >= 2 && info[1].IsBoolean()) {
    recursive = info[1].As<Napi::Boolean>().Value();
  }
  std::vector<std::string> files = list_files(root, recursive);
  Napi::Array arr = Napi::Array::New(env, files.size());
  for (size_t i = 0; i < files.size(); ++i) {
    arr.Set(i, Napi::String::New(env, files[i]));
  }
  return arr;
}

Napi::Value AHashFromGray8(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 4) {
    Napi::TypeError::New(env, "buffer,width,height,stride required").ThrowAsJavaScriptException();
    return env.Null();
  }
  if (!info[0].IsTypedArray()) {
    Napi::TypeError::New(env, "Uint8Array required").ThrowAsJavaScriptException();
    return env.Null();
  }
  Napi::Uint8Array arr = info[0].As<Napi::Uint8Array>();
  int width = info[1].ToNumber().Int32Value();
  int height = info[2].ToNumber().Int32Value();
  size_t stride = static_cast<size_t>(info[3].ToNumber().Int64Value());
  uint64_t h = 0;
  if (!gpu_ahash_from_gray8(arr.Data(), width, height, stride, h)) {
    h = ahash_from_gray8(arr.Data(), width, height, stride);
  }
  return Napi::BigInt::New(env, h);
}

Napi::Value DHashFromGray8(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 4) {
    Napi::TypeError::New(env, "buffer,width,height,stride required").ThrowAsJavaScriptException();
    return env.Null();
  }
  Napi::Uint8Array arr = info[0].As<Napi::Uint8Array>();
  int width = info[1].ToNumber().Int32Value();
  int height = info[2].ToNumber().Int32Value();
  size_t stride = static_cast<size_t>(info[3].ToNumber().Int64Value());
  uint64_t h = 0;
  if (!gpu_dhash_from_gray8(arr.Data(), width, height, stride, h)) {
    h = dhash_from_gray8(arr.Data(), width, height, stride);
  }
  return Napi::BigInt::New(env, h);
}

Napi::Value PHashFromGray8(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 4) {
    Napi::TypeError::New(env, "buffer,width,height,stride required").ThrowAsJavaScriptException();
    return env.Null();
  }
  Napi::Uint8Array arr = info[0].As<Napi::Uint8Array>();
  int width = info[1].ToNumber().Int32Value();
  int height = info[2].ToNumber().Int32Value();
  size_t stride = static_cast<size_t>(info[3].ToNumber().Int64Value());
  uint64_t h = phash_from_gray8(arr.Data(), width, height, stride);
  return Napi::BigInt::New(env, h);
}

Napi::Value TopKHamming(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 3) {
    Napi::TypeError::New(env, "hashes, query, k required").ThrowAsJavaScriptException();
    return env.Null();
  }
  if (!info[0].IsArray()) {
    Napi::TypeError::New(env, "array required").ThrowAsJavaScriptException();
    return env.Null();
  }
  Napi::Array arr = info[0].As<Napi::Array>();
  uint64_t query = 0;
  if (!GetUint64FromJs(env, info[1], query)) {
    Napi::TypeError::New(env, "invalid query").ThrowAsJavaScriptException();
    return env.Null();
  }
  size_t k = static_cast<size_t>(info[2].ToNumber().Int64Value());
  std::vector<uint64_t> hashes;
  hashes.reserve(arr.Length());
  for (uint32_t i = 0; i < arr.Length(); ++i) {
    uint64_t v = 0;
    if (!GetUint64FromJs(env, arr.Get(i), v)) continue;
    hashes.push_back(v);
  }
  auto res = topk_hamming(hashes, query, k);
  Napi::Array out = Napi::Array::New(env, res.size());
  for (size_t i = 0; i < res.size(); ++i) {
    Napi::Object obj = Napi::Object::New(env);
    obj.Set("index", Napi::Number::New(env, static_cast<double>(res[i].first)));
    obj.Set("distance", Napi::Number::New(env, res[i].second));
    out.Set(i, obj);
  }
  return out;
}

Napi::Value ScanDirectoryFiltered(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "path required").ThrowAsJavaScriptException();
    return env.Null();
  }
  std::string root = info[0].As<Napi::String>().Utf8Value();
  bool recursive = true;
  if (info.Length() >= 2 && info[1].IsBoolean()) recursive = info[1].As<Napi::Boolean>().Value();
  std::vector<std::string> excludes;
  if (info.Length() >= 3 && info[2].IsArray()) {
    Napi::Array ex = info[2].As<Napi::Array>();
    for (uint32_t i = 0; i < ex.Length(); ++i) excludes.push_back(ex.Get(i).ToString().Utf8Value());
  }
  auto files = list_files_filtered(root, recursive, excludes);
  Napi::Array arr = Napi::Array::New(env, files.size());
  for (size_t i = 0; i < files.size(); ++i) arr.Set(i, Napi::String::New(env, files[i]));
  return arr;
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("computeFileHash", Napi::Function::New(env, ComputeFileHash));
  exports.Set("hammingDistance", Napi::Function::New(env, HammingDistance));
  exports.Set("scanDirectory", Napi::Function::New(env, ScanDirectory));
  exports.Set("scanDirectoryFiltered", Napi::Function::New(env, ScanDirectoryFiltered));
  exports.Set("aHashFromGray8", Napi::Function::New(env, AHashFromGray8));
  exports.Set("dHashFromGray8", Napi::Function::New(env, DHashFromGray8));
  exports.Set("pHashFromGray8", Napi::Function::New(env, PHashFromGray8));
  exports.Set("topKHamming", Napi::Function::New(env, TopKHamming));
  exports.Set("gpuInit", Napi::Function::New(env, [](const Napi::CallbackInfo& info){ gpu_init(); return info.Env().Undefined(); }));
  exports.Set("gpuShutdown", Napi::Function::New(env, [](const Napi::CallbackInfo& info){ gpu_shutdown(); return info.Env().Undefined(); }));
  exports.Set("gpuSetEnabled", Napi::Function::New(env, [](const Napi::CallbackInfo& info){ bool v = info.Length()>0 && info[0].ToBoolean().Value(); gpu_set_enabled(v); return info.Env().Undefined(); }));
  exports.Set("gpuIsEnabled", Napi::Function::New(env, [](const Napi::CallbackInfo& info){ return Napi::Boolean::New(info.Env(), gpu_is_enabled()); }));
  exports.Set("gpuSupported", Napi::Function::New(env, [](const Napi::CallbackInfo& info){ return Napi::Boolean::New(info.Env(), gpu_supported()); }));
  exports.Set("gpuAdapterName", Napi::Function::New(env, [](const Napi::CallbackInfo& info){ return Napi::String::New(info.Env(), gpu_adapter_name()); }));
  return exports;
}

NODE_API_MODULE(photounikalizer_native, Init)