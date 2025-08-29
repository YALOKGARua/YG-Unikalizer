#include <napi.h>
#include <string>
#include <vector>
#include <thread>
#include <mutex>
#include <queue>
#include <condition_variable>
#include <cctype>
#include <unordered_set>
#include <fstream>
#include <sstream>
#include <cstring>
#include <algorithm>
#include "image_hash.h"
#include "gpu_hash.h"
#include "meta_write.h"
#include "hamming_index.h"
#include "wic_decode.h"
#include "ip_lookup.h"
static Napi::Value IpLookup(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "ip required").ThrowAsJavaScriptException();
    return env.Null();
  }
  std::string ip = info[0].As<Napi::String>().Utf8Value();
  std::string json;
  bool ok = ip_lookup(ip, json);
  if (!ok) return env.Null();
  return Napi::String::New(env, json);
}

using namespace photounikalizer_native;

class AsyncHashWorker : public Napi::AsyncWorker {
 public:
  AsyncHashWorker(const Napi::Function& cb, std::string path)
    : Napi::AsyncWorker(cb), path_(std::move(path)), ok_(false), hash_(0ull) {}
  void Execute() override {
    hash_ = xxh64_file(path_, ok_);
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
  std::string algo = "xxh64";
  if (info.Length() >= 2 && info[1].IsString()) algo = info[1].As<Napi::String>().Utf8Value();
  if (info.Length() >= 2 && info[1].IsFunction()) {
    Napi::Function cb = info[1].As<Napi::Function>();
    (new AsyncHashWorker(cb, path))->Queue();
    return env.Undefined();
  }
  bool ok = false;
  uint64_t h = 0;
  if (algo == "fnv" || algo == "fnv1a" || algo == "fnv1a64") h = fnv1a64_file(path, ok);
  else h = xxh64_file(path, ok);
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

static inline std::string trim_copy(const std::string& s) {
  size_t a = 0, b = s.size();
  while (a < b && std::isspace(static_cast<unsigned char>(s[a]))) a++;
  while (b > a && std::isspace(static_cast<unsigned char>(s[b - 1]))) b--;
  return s.substr(a, b - a);
}

static inline std::vector<std::string> split_header(const std::string& head) {
  std::vector<std::string> parts;
  if (head.empty()) return parts;
  auto flush = [&](std::string& cur){ if (!cur.empty()) { parts.push_back(trim_copy(cur)); cur.clear(); } };
  std::string cur;
  for (size_t i = 0; i < head.size(); ++i) {
    char c = head[i];
    if (c == '|' || c == '\t' || c == ';') { flush(cur); }
    else { cur.push_back(c); }
  }
  flush(cur);
  for (auto& p : parts) p = trim_copy(p);
  return parts;
}

static inline bool is_important_cookie(const std::string& name) {
  return name == "c_user" || name == "xs" || name == "datr" || name == "sb" || name == "fr";
}

static inline std::string remove_trailing_commas(const std::string& in) {
  std::string out; out.reserve(in.size());
  bool in_string = false; bool esc = false;
  for (size_t i = 0; i < in.size(); ++i) {
    char c = in[i];
    if (esc) { out.push_back(c); esc = false; continue; }
    if (in_string) {
      if (c == '\\') { out.push_back(c); esc = true; continue; }
      if (c == '"') { in_string = false; }
      out.push_back(c);
      continue;
    }
    if (c == '"') { in_string = true; out.push_back(c); continue; }
    if (c == ',') {
      size_t j = i + 1; while (j < in.size() && std::isspace(static_cast<unsigned char>(in[j]))) j++;
      if (j < in.size() && (in[j] == ']' || in[j] == '}')) {
        continue;
      }
    }
    out.push_back(c);
  }
  return out;
}

static inline void dedupe_sort_cookies(Napi::Env env, Napi::Array& arr) {
  const uint32_t len = arr.Length();
  std::unordered_set<std::string> seen;
  std::vector<Napi::Object> kept;
  kept.reserve(len);
  for (int64_t idx = static_cast<int64_t>(len) - 1; idx >= 0; --idx) {
    Napi::Value v = arr.Get(static_cast<uint32_t>(idx));
    if (!v.IsObject()) continue;
    Napi::Object c = v.As<Napi::Object>();
    std::string name = c.Has("name") ? c.Get("name").ToString().Utf8Value() : std::string();
    if (name.empty()) continue;
    if (seen.insert(name).second) {
      if (c.Has("value") && !c.Get("value").IsString()) {
        c.Set("value", c.Get("value").ToString());
      }
      kept.push_back(c);
    }
  }
  std::reverse(kept.begin(), kept.end());
  std::stable_sort(kept.begin(), kept.end(), [&](const Napi::Object& a, const Napi::Object& b){
    std::string na = a.Has("name") ? a.Get("name").ToString().Utf8Value() : std::string();
    std::string nb = b.Has("name") ? b.Get("name").ToString().Utf8Value() : std::string();
    bool ia = is_important_cookie(na);
    bool ib = is_important_cookie(nb);
    if (ia != ib) return ia && !ib;
    return na < nb;
  });
  Napi::Array out = Napi::Array::New(env, kept.size());
  for (uint32_t i = 0; i < kept.size(); ++i) out.Set(i, kept[i]);
  arr = out;
}

Napi::Value ParseTxtProfiles(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "text string required").ThrowAsJavaScriptException();
    return env.Null();
  }
  std::string text = info[0].As<Napi::String>().Utf8Value();
  struct Seg { size_t start; size_t end; };
  std::vector<Seg> segments;
  segments.reserve(64);
  bool in_string = false;
  bool esc = false;
  int depth = 0;
  std::vector<char> stack;
  stack.reserve(64);
  long long start = -1;
  for (size_t i = 0; i < text.size(); ++i) {
    char ch = text[i];
    if (esc) { esc = false; continue; }
    if (in_string) {
      if (ch == '\\') { esc = true; continue; }
      if (ch == '"') { in_string = false; }
      continue;
    }
    if (ch == '"') { in_string = true; continue; }
    if (ch == '[' || ch == '{') {
      if (depth == 0) start = static_cast<long long>(i);
      stack.push_back(ch);
      depth += 1;
      continue;
    }
    if (ch == ']' || ch == '}') {
      if (depth > 0) {
        char last = stack.empty() ? 0 : stack.back();
        bool ok = (ch == ']' && last == '[') || (ch == '}' && last == '{');
        if (!ok) {
          depth = 0; stack.clear(); start = -1;
        } else {
          stack.pop_back();
          depth -= 1;
          if (depth == 0 && start != -1) {
            segments.push_back({ static_cast<size_t>(start), i + 1 });
            start = -1;
          }
        }
      }
      continue;
    }
  }

  Napi::Object JSON = env.Global().Get("JSON").As<Napi::Object>();
  Napi::Function parse = JSON.Get("parse").As<Napi::Function>();
  Napi::Array out = Napi::Array::New(env);
  uint32_t outIndex = 0;
  int errors = 0;
  int errorsInvalidJson = 0;
  int errorsUnsupported = 0;
  int parsedSegments = 0;
  int totalSegments = 0;
  std::unordered_set<std::string> seen;
  auto extractIdFromUrl = [](const std::string& url)->std::string{
    size_t idpos = url.find("id=");
    if (idpos != std::string::npos) {
      size_t j = idpos + 3; std::string digits; digits.reserve(32);
      while (j < url.size() && std::isdigit(static_cast<unsigned char>(url[j]))) { digits.push_back(url[j]); j++; }
      return digits;
    }
    return std::string();
  };
  auto getStrProp = [&](const Napi::Object& o, const char* k)->std::string{
    if (o.Has(k)) {
      Napi::Value v = o.Get(k);
      if (v.IsString()) return v.ToString().Utf8Value();
      if (v.IsNumber()) return v.ToString().Utf8Value();
    }
    return std::string();
  };
  auto extractAccount = [&](const Napi::Object& obj, std::string& login, std::string& password, std::string& firstName, std::string& lastName, std::string& birthday){
    login = login.empty() ? getStrProp(obj, "login") : login;
    password = password.empty() ? getStrProp(obj, "password") : password;
    firstName = firstName.empty() ? getStrProp(obj, "firstName") : firstName;
    lastName = lastName.empty() ? getStrProp(obj, "lastName") : lastName;
    birthday = birthday.empty() ? getStrProp(obj, "birthday") : birthday;
    if (obj.Has("account") && obj.Get("account").IsObject()) {
      Napi::Object a = obj.Get("account").As<Napi::Object>();
      if (login.empty()) login = getStrProp(a, "login");
      if (password.empty()) password = getStrProp(a, "password");
      if (firstName.empty()) firstName = getStrProp(a, "firstName");
      if (lastName.empty()) lastName = getStrProp(a, "lastName");
      if (birthday.empty()) birthday = getStrProp(a, "birthday");
    }
  };
  auto markImportant = [&](Napi::Array& cookiesArr){
    for (uint32_t i = 0; i < cookiesArr.Length(); ++i) {
      Napi::Value v = cookiesArr.Get(i);
      if (!v.IsObject()) continue;
      Napi::Object c = v.As<Napi::Object>();
      std::string name = c.Has("name") ? c.Get("name").ToString().Utf8Value() : std::string();
      c.Set("important", Napi::Boolean::New(env, is_important_cookie(name)));
    }
  };
  auto cUserFromCookies = [&](Napi::Array& cookiesArr)->std::string{
    for (uint32_t i = 0; i < cookiesArr.Length(); ++i) {
      Napi::Value v = cookiesArr.Get(i);
      if (!v.IsObject()) continue;
      Napi::Object c = v.As<Napi::Object>();
      std::string name = c.Has("name") ? c.Get("name").ToString().Utf8Value() : std::string();
      if (name == "c_user") {
        if (c.Has("value")) return c.Get("value").ToString().Utf8Value();
      }
    }
    return std::string();
  };
  auto emitProfile = [&](Napi::Array& cookiesArr, std::string url, std::string login, std::string password, std::string firstName, std::string lastName, std::string birthday, std::string profileId){
    markImportant(cookiesArr);
    if (profileId.empty()) profileId = extractIdFromUrl(url);
    if (profileId.empty()) profileId = cUserFromCookies(cookiesArr);
    Napi::Object account = Napi::Object::New(env);
    account.Set("login", Napi::String::New(env, login));
    account.Set("password", Napi::String::New(env, password));
    account.Set("firstName", Napi::String::New(env, firstName));
    account.Set("lastName", Napi::String::New(env, lastName));
    account.Set("birthday", Napi::String::New(env, birthday));
    Napi::Object prof = Napi::Object::New(env);
    prof.Set("profileId", Napi::String::New(env, profileId));
    prof.Set("url", Napi::String::New(env, url));
    prof.Set("account", account);
    prof.Set("cookies", cookiesArr);
    std::string key = (profileId + "|" + login);
    if (seen.find(key) == seen.end()) {
      seen.insert(key);
      out.Set(outIndex++, prof);
    }
  };
  auto processSegment = [&](const Seg* seg, int segIndex) {
    std::string jsonStr;
    std::string head;
    if (seg) {
      jsonStr = text.substr(seg->start, seg->end - seg->start);
      size_t lineStart = text.rfind('\n', seg->start == 0 ? 0 : (seg->start - 1));
      if (lineStart == std::string::npos) lineStart = 0; else lineStart += 1;
      head = trim_copy(text.substr(lineStart, seg->start - lineStart));
    } else {
      jsonStr = trim_copy(text);
    }
    Napi::Value parsed;
    try {
      parsed = parse.Call(JSON, { Napi::String::New(env, jsonStr) });
    } catch (...) {
      try {
        std::string fixed = remove_trailing_commas(jsonStr);
        if (fixed != jsonStr) parsed = parse.Call(JSON, { Napi::String::New(env, fixed) });
        else { errors += 1; errorsInvalidJson += 1; return; }
      } catch (...) { errors += 1; errorsInvalidJson += 1; return; }
    }
    parsedSegments += 1;
    std::vector<std::string> parts = split_header(head);
    std::string url = parts.size() > 0 ? parts[0] : std::string();
    std::string login = parts.size() > 1 ? parts[1] : std::string();
    std::string password = parts.size() > 2 ? parts[2] : std::string();
    std::string firstName = parts.size() > 3 ? parts[3] : std::string();
    std::string lastName = parts.size() > 4 ? parts[4] : std::string();
    std::string birthday = parts.size() > 5 ? parts[5] : std::string();

    if (parsed.IsArray()) {
      Napi::Array arr = parsed.As<Napi::Array>();
      bool looksLikeCookies = false;
      if (arr.Length() > 0) {
        Napi::Value v0 = arr.Get(static_cast<uint32_t>(0));
        if (v0.IsObject()) {
          Napi::Object o0 = v0.As<Napi::Object>();
          looksLikeCookies = o0.Has("name") && o0.Has("value");
        }
      }
      if (looksLikeCookies) {
        Napi::Array cookiesArr = arr;
        dedupe_sort_cookies(env, cookiesArr);
        std::string pid;
        emitProfile(cookiesArr, url, login, password, firstName, lastName, birthday, pid);
        return;
      }
      for (uint32_t i = 0; i < arr.Length(); ++i) {
        Napi::Value v = arr.Get(i);
        if (!v.IsObject()) continue;
        Napi::Object obj = v.As<Napi::Object>();
        if (!(obj.Has("cookies") && obj.Get("cookies").IsArray())) continue;
        Napi::Array cookiesArr = obj.Get("cookies").As<Napi::Array>();
        dedupe_sort_cookies(env, cookiesArr);
        std::string u = url, pid, lg = login, pw = password, fn = firstName, ln = lastName, bd = birthday;
        std::string url2 = getStrProp(obj, "url"); if (!url2.empty()) u = url2;
        std::string pid2 = getStrProp(obj, "profileId"); if (pid2.empty()) pid2 = getStrProp(obj, "id"); if (!pid2.empty()) pid = pid2;
        extractAccount(obj, lg, pw, fn, ln, bd);
        emitProfile(cookiesArr, u, lg, pw, fn, ln, bd, pid);
      }
      return;
    }

    if (parsed.IsObject()) {
      Napi::Object obj = parsed.As<Napi::Object>();
      if (obj.Has("profiles") && obj.Get("profiles").IsArray()) {
        Napi::Array parr = obj.Get("profiles").As<Napi::Array>();
        for (uint32_t i = 0; i < parr.Length(); ++i) {
          Napi::Value pv = parr.Get(i); if (!pv.IsObject()) continue;
          Napi::Object po = pv.As<Napi::Object>();
          if (!(po.Has("cookies") && po.Get("cookies").IsArray())) continue;
          Napi::Array cookiesArr = po.Get("cookies").As<Napi::Array>();
          dedupe_sort_cookies(env, cookiesArr);
          std::string u = url, pid, lg = login, pw = password, fn = firstName, ln = lastName, bd = birthday;
          std::string url2 = getStrProp(po, "url"); if (!url2.empty()) u = url2;
          std::string pid2 = getStrProp(po, "profileId"); if (pid2.empty()) pid2 = getStrProp(po, "id"); if (!pid2.empty()) pid = pid2;
          extractAccount(po, lg, pw, fn, ln, bd);
          emitProfile(cookiesArr, u, lg, pw, fn, ln, bd, pid);
        }
        return;
      }
      if (obj.Has("cookies") && obj.Get("cookies").IsArray()) {
        Napi::Array cookiesArr = obj.Get("cookies").As<Napi::Array>();
        dedupe_sort_cookies(env, cookiesArr);
        std::string u = url, pid, lg = login, pw = password, fn = firstName, ln = lastName, bd = birthday;
        std::string url2 = getStrProp(obj, "url"); if (!url2.empty()) u = url2;
        std::string pid2 = getStrProp(obj, "profileId"); if (pid2.empty()) pid2 = getStrProp(obj, "id"); if (!pid2.empty()) pid = pid2;
        extractAccount(obj, lg, pw, fn, ln, bd);
        emitProfile(cookiesArr, u, lg, pw, fn, ln, bd, pid);
        return;
      }
    }

    errors += 1;
    return;
  };

  totalSegments = static_cast<int>(segments.size());
  if (!segments.empty()) {
    for (size_t i = 0; i < segments.size(); ++i) processSegment(&segments[i], static_cast<int>(i));
  } else if (!trim_copy(text).empty()) {
    processSegment(nullptr, -1);
  }

  Napi::Object res = Napi::Object::New(env);
  res.Set("profiles", out);
  res.Set("errors", Napi::Number::New(env, errors));
  res.Set("errorsInvalidJson", Napi::Number::New(env, errorsInvalidJson));
  res.Set("errorsUnsupported", Napi::Number::New(env, errorsUnsupported));
  res.Set("segments", Napi::Number::New(env, static_cast<double>(totalSegments)));
  res.Set("parsedSegments", Napi::Number::New(env, parsedSegments));
  return res;
}

Napi::Value ParseTxtProfilesFromFile(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "path string required").ThrowAsJavaScriptException();
    return env.Null();
  }
  std::string path = info[0].As<Napi::String>().Utf8Value();
  std::ifstream f(path, std::ios::binary);
  if (!f) return env.Null();
  std::ostringstream ss; ss << f.rdbuf();
  std::string data = ss.str();
  if (data.size() >= 3 && (unsigned char)data[0] == 0xEF && (unsigned char)data[1] == 0xBB && (unsigned char)data[2] == 0xBF) {
    data.erase(0, 3);
  }
  Napi::Function self = Napi::Function::New(env, ParseTxtProfiles);
  return self.Call(env.Global(), { Napi::String::New(env, data) });
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
  exports.Set("parseTxtProfiles", Napi::Function::New(env, ParseTxtProfiles));
  exports.Set("parseTxtProfilesFromFile", Napi::Function::New(env, ParseTxtProfilesFromFile));
  exports.Set("ipLookup", Napi::Function::New(env, IpLookup));
  return exports;
}

NODE_API_MODULE(photounikalizer_native, Init)