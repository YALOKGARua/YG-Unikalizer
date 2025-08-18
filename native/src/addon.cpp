#include <napi.h>
#include <string>
#include <vector>
#include <thread>
#include <mutex>
#include <queue>
#include <condition_variable>
#include "image_hash.h"
#include "gpu_hash.h"
#include "meta_write.h"
#include "hamming_index.h"
#include "wic_decode.h"

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
  std::string algo = "fnv";
  if (info.Length() >= 2 && info[1].IsString()) algo = info[1].As<Napi::String>().Utf8Value();
  if (info.Length() >= 2 && info[1].IsFunction()) {
    Napi::Function cb = info[1].As<Napi::Function>();
    (new AsyncHashWorker(cb, path))->Queue();
    return env.Undefined();
  }
  bool ok = false;
  uint64_t h = 0;
  if (algo == "xxh64") h = xxh64_file(path, ok);
  else h = fnv1a64_file(path, ok);
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

static MetaInput MetaFromJs(const Napi::Env& env, const Napi::Object& o) {
  MetaInput m;
  auto getStr = [&](const char* k) {
    if (o.Has(k)) {
      Napi::Value v = o.Get(k);
      if (v.IsString()) return v.As<Napi::String>().Utf8Value();
    }
    return std::string();
  };
  auto getInt = [&](const char* k) {
    if (o.Has(k)) {
      Napi::Value v = o.Get(k);
      if (v.IsNumber()) return v.As<Napi::Number>().Int32Value();
    }
    return -1;
  };
  auto getDouble = [&](const char* k) {
    if (o.Has(k)) {
      Napi::Value v = o.Get(k);
      if (v.IsNumber()) return v.As<Napi::Number>().DoubleValue();
    }
    return -1.0;
  };
  m.artist = getStr("artist");
  m.description = getStr("description");
  m.copyright = getStr("copyright");
  if (o.Has("keywords") && o.Get("keywords").IsArray()) {
    Napi::Array arr = o.Get("keywords").As<Napi::Array>();
    for (uint32_t i = 0; i < arr.Length(); ++i) {
      Napi::Value v = arr.Get(i);
      if (v.IsString()) m.keywords.push_back(v.As<Napi::String>().Utf8Value());
    }
  }
  m.contact = getStr("contact");
  m.email = getStr("email");
  m.url = getStr("url");
  m.owner = getStr("owner");
  m.creatorTool = getStr("creatorTool");
  m.title = getStr("title");
  m.label = getStr("label");
  m.rating = getInt("rating");
  m.make = getStr("make");
  m.model = getStr("model");
  m.lensModel = getStr("lensModel");
  m.bodySerial = getStr("bodySerial");
  m.exposureTime = getStr("exposureTime");
  m.fNumber = getDouble("fNumber");
  m.iso = getInt("iso");
  m.focalLength = getDouble("focalLength");
  m.exposureProgram = getInt("exposureProgram");
  m.meteringMode = getInt("meteringMode");
  m.flash = getInt("flash");
  m.whiteBalance = getInt("whiteBalance");
  m.colorSpace = getStr("colorSpace");
  if (o.Has("gps") && o.Get("gps").IsObject()) {
    Napi::Object g = o.Get("gps").As<Napi::Object>();
    m.hasGps = true;
    if (g.Has("lat")) m.gpsLat = g.Get("lat").ToNumber().DoubleValue();
    if (g.Has("lon")) m.gpsLon = g.Get("lon").ToNumber().DoubleValue();
    if (g.Has("alt")) m.gpsAlt = g.Get("alt").ToNumber().DoubleValue();
  }
  m.city = getStr("city");
  m.state = getStr("state");
  m.country = getStr("country");
  m.dateCreated = getStr("dateCreated");
  return m;
}

Napi::Value WriteMetadata(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 2 || !info[0].IsString() || !info[1].IsObject()) {
    Napi::TypeError::New(env, "path, meta required").ThrowAsJavaScriptException();
    return env.Null();
  }
  std::string path = info[0].As<Napi::String>().Utf8Value();
  MetaInput m = MetaFromJs(env, info[1].As<Napi::Object>());
  bool ok = write_metadata_file(path, m);
  return Napi::Boolean::New(env, ok);
}

Napi::Value StripMetadata(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "path required").ThrowAsJavaScriptException();
    return env.Null();
  }
  std::string path = info[0].As<Napi::String>().Utf8Value();
  bool ok = strip_metadata_file(path);
  return Napi::Boolean::New(env, ok);
}

Napi::Value CreateHammingIndex(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsArray()) { Napi::TypeError::New(env, "hashes array required").ThrowAsJavaScriptException(); return env.Null(); }
  Napi::Array arr = info[0].As<Napi::Array>();
  std::vector<uint64_t> hashes; hashes.reserve(arr.Length());
  for (uint32_t i=0;i<arr.Length();++i) {
    uint64_t v=0; if (GetUint64FromJs(env, arr.Get(i), v)) hashes.push_back(v);
  }
  int id = create_hamming_index(hashes);
  return Napi::Number::New(env, id);
}

Napi::Value QueryHammingIndex(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length()<4) { Napi::TypeError::New(env, "id, query, k, maxDistance required").ThrowAsJavaScriptException(); return env.Null(); }
  int id = info[0].ToNumber().Int32Value();
  uint64_t q=0; if (!GetUint64FromJs(env, info[1], q)) { Napi::TypeError::New(env, "query").ThrowAsJavaScriptException(); return env.Null(); }
  size_t k = static_cast<size_t>(info[2].ToNumber().Int64Value());
  int maxD = info[3].ToNumber().Int32Value();
  auto hits = query_hamming_index(id, q, k, maxD);
  Napi::Array out = Napi::Array::New(env, hits.size());
  for (size_t i=0;i<hits.size();++i) { Napi::Object o = Napi::Object::New(env); o.Set("index", Napi::Number::New(env, static_cast<double>(hits[i].index))); o.Set("distance", Napi::Number::New(env, hits[i].distance)); out.Set(i, o); }
  return out;
}

Napi::Value FreeHammingIndex(const Napi::CallbackInfo& info) {
  if (info.Length()>=1) { int id = info[0].ToNumber().Int32Value(); free_hamming_index(id); }
  return info.Env().Undefined();
}

Napi::Value ClusterByHamming(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 2 || !info[0].IsArray()) { Napi::TypeError::New(env, "hashes, threshold").ThrowAsJavaScriptException(); return env.Null(); }
  Napi::Array arr = info[0].As<Napi::Array>();
  int thr = info[1].ToNumber().Int32Value();
  std::vector<uint64_t> hashes; hashes.reserve(arr.Length());
  for (uint32_t i=0;i<arr.Length();++i) { uint64_t v=0; if (GetUint64FromJs(env, arr.Get(i), v)) hashes.push_back(v); }
  auto groups = cluster_by_hamming(hashes, thr);
  Napi::Array out = Napi::Array::New(env, groups.size());
  for (size_t i=0;i<groups.size();++i) {
    Napi::Array g = Napi::Array::New(env, groups[i].size());
    for (size_t j=0;j<groups[i].size();++j) g.Set(j, Napi::Number::New(env, static_cast<double>(groups[i][j])));
    out.Set(i, g);
  }
  return out;
}

Napi::Value WicDecodeGray8(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length()<1 || !info[0].IsString()) { Napi::TypeError::New(env, "path required").ThrowAsJavaScriptException(); return env.Null(); }
  std::string p = info[0].As<Napi::String>().Utf8Value();
  std::vector<uint8_t> buf; int w=0,h=0; size_t stride=0;
  if (!wic_decode_gray8_file(p, buf, w, h, stride)) return env.Null();
  Napi::Object o = Napi::Object::New(env);
  Napi::ArrayBuffer ab = Napi::ArrayBuffer::New(env, buf.size());
  std::memcpy(ab.Data(), buf.data(), buf.size());
  o.Set("buffer", Napi::Uint8Array::New(env, buf.size(), ab, 0));
  o.Set("width", Napi::Number::New(env, w));
  o.Set("height", Napi::Number::New(env, h));
  o.Set("stride", Napi::Number::New(env, static_cast<double>(stride)));
  return o;
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
  exports.Set("writeMetadata", Napi::Function::New(env, WriteMetadata));
  exports.Set("stripMetadata", Napi::Function::New(env, StripMetadata));
  exports.Set("gpuInit", Napi::Function::New(env, [](const Napi::CallbackInfo& info){ gpu_init(); return info.Env().Undefined(); }));
  exports.Set("gpuShutdown", Napi::Function::New(env, [](const Napi::CallbackInfo& info){ gpu_shutdown(); return info.Env().Undefined(); }));
  exports.Set("gpuSetEnabled", Napi::Function::New(env, [](const Napi::CallbackInfo& info){ bool v = info.Length()>0 && info[0].ToBoolean().Value(); gpu_set_enabled(v); return info.Env().Undefined(); }));
  exports.Set("gpuIsEnabled", Napi::Function::New(env, [](const Napi::CallbackInfo& info){ return Napi::Boolean::New(info.Env(), gpu_is_enabled()); }));
  exports.Set("gpuSupported", Napi::Function::New(env, [](const Napi::CallbackInfo& info){ return Napi::Boolean::New(info.Env(), gpu_supported()); }));
  exports.Set("gpuAdapterName", Napi::Function::New(env, [](const Napi::CallbackInfo& info){ return Napi::String::New(info.Env(), gpu_adapter_name()); }));
  exports.Set("writeMetadata", Napi::Function::New(env, WriteMetadata));
  exports.Set("stripMetadata", Napi::Function::New(env, StripMetadata));
  exports.Set("createHammingIndex", Napi::Function::New(env, CreateHammingIndex));
  exports.Set("queryHammingIndex", Napi::Function::New(env, QueryHammingIndex));
  exports.Set("freeHammingIndex", Napi::Function::New(env, FreeHammingIndex));
  exports.Set("wicDecodeGray8", Napi::Function::New(env, WicDecodeGray8));
  exports.Set("clusterByHamming", Napi::Function::New(env, ClusterByHamming));
  return exports;
}

NODE_API_MODULE(photounikalizer_native, Init)