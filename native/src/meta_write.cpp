#include "meta_write.h"
#include <string>
#include <vector>
#include <cstdio>
#include <cstdint>
#include <cstring>
#include <filesystem>
#include <vector>
#include <fstream>

namespace fs = std::filesystem;

namespace photounikalizer_native {

static std::string build_xmp(const MetaInput& m) {
  std::string x;
  x += "<?xpacket begin=' ' id='W5M0MpCehiHzreSzNTczkc9d'?>\n";
  x += "<x:xmpmeta xmlns:x='adobe:ns:meta/'>\n";
  x += " <rdf:RDF xmlns:rdf='http://www.w3.org/1999/02/22-rdf-syntax-ns#'";
  x += " xmlns:xmp='http://ns.adobe.com/xap/1.0/'";
  x += " xmlns:dc='http://purl.org/dc/elements/1.1/'";
  x += " xmlns:xmpRights='http://ns.adobe.com/xap/1.0/rights/'";
  x += " xmlns:photoshop='http://ns.adobe.com/photoshop/1.0/'";
  x += " xmlns:xmpMM='http://ns.adobe.com/xap/1.0/mm/'";
  x += " xmlns:exif='http://ns.adobe.com/exif/1.0/'>\n";
  x += "  <rdf:Description rdf:about=''>\n";
  if (!m.artist.empty()) x += "   <dc:creator><rdf:Seq><rdf:li>" + m.artist + "</rdf:li></rdf:Seq></dc:creator>\n";
  if (!m.description.empty()) x += "   <dc:description><rdf:Alt><rdf:li xml:lang='x-default'>" + m.description + "</rdf:li></rdf:Alt></dc:description>\n";
  if (!m.copyright.empty()) x += "   <dc:rights><rdf:Alt><rdf:li xml:lang='x-default'>" + m.copyright + "</rdf:li></rdf:Alt></dc:rights>\n";
  if (!m.keywords.empty()) {
    x += "   <dc:subject><rdf:Bag>";
    for (const auto& k : m.keywords) x += "<rdf:li>" + k + "</rdf:li>";
    x += "</rdf:Bag></dc:subject>\n";
  }
  if (!m.title.empty()) x += "   <dc:title><rdf:Alt><rdf:li xml:lang='x-default'>" + m.title + "</rdf:li></rdf:Alt></dc:title>\n";
  if (!m.owner.empty()) x += "   <xmpRights:Owner><rdf:Bag><rdf:li>" + m.owner + "</rdf:li></rdf:Bag></xmpRights:Owner>\n";
  if (!m.creatorTool.empty()) x += "   <xmp:CreatorTool>" + m.creatorTool + "</xmp:CreatorTool>\n";
  if (!m.url.empty()) x += "   <xmp:WebURL>" + m.url + "</xmp:WebURL>\n";
  if (!m.contact.empty()) x += "   <photoshop:AuthorsPosition>" + m.contact + "</photoshop:AuthorsPosition>\n";
  if (!m.email.empty()) x += "   <photoshop:CaptionWriter>" + m.email + "</photoshop:CaptionWriter>\n";
  if (!m.label.empty()) x += "   <xmp:Label>" + m.label + "</xmp:Label>\n";
  if (m.rating >= 0) x += "   <xmp:Rating>" + std::to_string(m.rating) + "</xmp:Rating>\n";
  if (!m.make.empty()) x += "   <tiff:Make xmlns:tiff='http://ns.adobe.com/tiff/1.0/'>" + m.make + "</tiff:Make>\n";
  if (!m.model.empty()) x += "   <tiff:Model xmlns:tiff='http://ns.adobe.com/tiff/1.0/'>" + m.model + "</tiff:Model>\n";
  if (!m.lensModel.empty()) x += "   <aux:Lens xmlns:aux='http://ns.adobe.com/exif/1.0/aux/'>" + m.lensModel + "</aux:Lens>\n";
  if (!m.bodySerial.empty()) x += "   <aux:SerialNumber xmlns:aux='http://ns.adobe.com/exif/1.0/aux/'>" + m.bodySerial + "</aux:SerialNumber>\n";
  if (!m.exposureTime.empty()) x += "   <exif:ExposureTime>" + m.exposureTime + "</exif:ExposureTime>\n";
  if (m.fNumber > 0) x += "   <exif:FNumber>" + std::to_string(m.fNumber) + "</exif:FNumber>\n";
  if (m.iso > 0) x += "   <exif:ISOSpeedRatings><rdf:Seq><rdf:li>" + std::to_string(m.iso) + "</rdf:li></rdf:Seq></exif:ISOSpeedRatings>\n";
  if (m.focalLength > 0) x += "   <exif:FocalLength>" + std::to_string(m.focalLength) + "</exif:FocalLength>\n";
  if (m.exposureProgram >= 0) x += "   <exif:ExposureProgram>" + std::to_string(m.exposureProgram) + "</exif:ExposureProgram>\n";
  if (m.meteringMode >= 0) x += "   <exif:MeteringMode>" + std::to_string(m.meteringMode) + "</exif:MeteringMode>\n";
  if (m.flash >= 0) x += "   <exif:Flash>" + std::to_string(m.flash) + "</exif:Flash>\n";
  if (m.whiteBalance >= 0) x += "   <exif:WhiteBalance>" + std::to_string(m.whiteBalance) + "</exif:WhiteBalance>\n";
  if (!m.colorSpace.empty()) x += "   <exif:ColorSpace>" + m.colorSpace + "</exif:ColorSpace>\n";
  if (!m.city.empty()) x += "   <photoshop:City>" + m.city + "</photoshop:City>\n";
  if (!m.state.empty()) x += "   <photoshop:State>" + m.state + "</photoshop:State>\n";
  if (!m.country.empty()) x += "   <photoshop:Country>" + m.country + "</photoshop:Country>\n";
  if (!m.dateCreated.empty()) x += "   <photoshop:DateCreated>" + m.dateCreated + "</photoshop:DateCreated>\n";
  if (m.hasGps) {
    x += "   <exif:GPSLatitude>" + std::to_string(m.gpsLat) + "</exif:GPSLatitude>\n";
    x += "   <exif:GPSLongitude>" + std::to_string(m.gpsLon) + "</exif:GPSLongitude>\n";
    x += "   <exif:GPSAltitude>" + std::to_string(m.gpsAlt) + "</exif:GPSAltitude>\n";
  }
  x += "  </rdf:Description>\n";
  x += " </rdf:RDF>\n";
  x += "</x:xmpmeta>\n";
  x += "<?xpacket end='w'?>\n";
  return x;
}

static bool write_jpeg_xmp(const std::vector<uint8_t>& in, const std::string& xmp, std::vector<uint8_t>& out) {
  if (in.size() < 4 || in[0] != 0xFF || in[1] != 0xD8) return false;
  size_t pos = 2;
  const char* header = "http://ns.adobe.com/xap/1.0/\0";
  std::vector<uint8_t> app1;
  app1.push_back(0xFF); app1.push_back(0xE1);
  uint16_t payloadLen = static_cast<uint16_t>(strlen(header) + xmp.size());
  uint16_t segLen = payloadLen + 2;
  app1.push_back(static_cast<uint8_t>(segLen >> 8));
  app1.push_back(static_cast<uint8_t>(segLen & 0xFF));
  app1.insert(app1.end(), header, header + strlen(header));
  app1.insert(app1.end(), xmp.begin(), xmp.end());
  out.clear();
  out.reserve(in.size() + app1.size());
  out.push_back(0xFF); out.push_back(0xD8);
  bool inserted = false;
  while (pos + 4 <= in.size()) {
    if (in[pos] != 0xFF) { break; }
    uint8_t marker = in[pos + 1];
    if (marker == 0xDA) {
      if (!inserted) { out.insert(out.end(), app1.begin(), app1.end()); inserted = true; }
      out.insert(out.end(), in.begin() + pos, in.end());
      return true;
    }
    if (marker == 0xD9) {
      if (!inserted) { out.insert(out.end(), app1.begin(), app1.end()); inserted = true; }
      out.insert(out.end(), in.begin() + pos, in.end());
      return true;
    }
    if (marker == 0x00 || marker == 0x01 || (marker >= 0xD0 && marker <= 0xD7)) {
      out.push_back(0xFF); out.push_back(marker);
      pos += 2;
      continue;
    }
    if (pos + 4 > in.size()) break;
    uint16_t len = (static_cast<uint16_t>(in[pos + 2]) << 8) | in[pos + 3];
    size_t segEnd = pos + 2 + len;
    bool drop = false;
    if (marker == 0xE1 && segEnd <= in.size()) {
      const uint8_t* p = &in[pos + 4];
      size_t rem = len - 2;
      if (rem >= 6 && std::memcmp(p, "Exif\0\0", 6) == 0) drop = true;
      const char* xmpId = "http://ns.adobe.com/xap/1.0/\0";
      size_t xlen = strlen(xmpId);
      if (rem >= xlen && std::memcmp(p, xmpId, xlen) == 0) drop = true;
    }
    if (!inserted && !drop) {
      out.insert(out.end(), app1.begin(), app1.end());
      inserted = true;
    }
    if (!drop) out.insert(out.end(), in.begin() + pos, in.begin() + segEnd);
    pos = segEnd;
  }
  if (!inserted) out.insert(out.end(), app1.begin(), app1.end());
  if (pos < in.size()) out.insert(out.end(), in.begin() + pos, in.end());
  return true;
}

static uint32_t crc32_update(uint32_t crc, const uint8_t* data, size_t len) {
  static uint32_t table[256];
  static bool inited = false;
  if (!inited) {
    for (uint32_t i = 0; i < 256; ++i) {
      uint32_t c = i;
      for (int j = 0; j < 8; ++j) c = (c & 1) ? (0xEDB88320u ^ (c >> 1)) : (c >> 1);
      table[i] = c;
    }
    inited = true;
  }
  crc = crc ^ 0xFFFFFFFFu;
  for (size_t i = 0; i < len; ++i) crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >> 8);
  return crc ^ 0xFFFFFFFFu;
}

static void be32(std::vector<uint8_t>& v, uint32_t x) {
  v.push_back(static_cast<uint8_t>((x >> 24) & 0xFF));
  v.push_back(static_cast<uint8_t>((x >> 16) & 0xFF));
  v.push_back(static_cast<uint8_t>((x >> 8) & 0xFF));
  v.push_back(static_cast<uint8_t>(x & 0xFF));
}

static bool write_png_xmp(const std::vector<uint8_t>& in, const std::string& xmp, std::vector<uint8_t>& out) {
  static const uint8_t sig[8] = {137,80,78,71,13,10,26,10};
  if (in.size() < 8 || std::memcmp(in.data(), sig, 8) != 0) return false;
  out.clear();
  out.insert(out.end(), in.begin(), in.begin() + 8);
  size_t pos = 8;
  const std::string keyword = "XML:com.adobe.xmp";
  std::vector<uint8_t> chunkType = {'i','T','X','t'};
  std::vector<uint8_t> data;
  data.insert(data.end(), keyword.begin(), keyword.end());
  data.push_back(0);
  data.push_back(0);
  data.push_back(0);
  data.push_back(0);
  data.push_back(0);
  data.insert(data.end(), xmp.begin(), xmp.end());
  while (pos + 12 <= in.size()) {
    uint32_t len = (static_cast<uint32_t>(in[pos]) << 24) | (static_cast<uint32_t>(in[pos+1]) << 16) | (static_cast<uint32_t>(in[pos+2]) << 8) | (static_cast<uint32_t>(in[pos+3]));
    if (pos + 12 + len > in.size()) break;
    const uint8_t* type = &in[pos + 4];
    if (type[0]=='I' && type[1]=='E' && type[2]=='N' && type[3]=='D') {
      std::vector<uint8_t> rec;
      be32(rec, static_cast<uint32_t>(data.size()));
      rec.insert(rec.end(), chunkType.begin(), chunkType.end());
      rec.insert(rec.end(), data.begin(), data.end());
      uint32_t crc = crc32_update(0, &rec[4], chunkType.size() + data.size());
      be32(rec, crc);
      out.insert(out.end(), rec.begin(), rec.end());
      out.insert(out.end(), in.begin() + pos, in.begin() + pos + 12 + len);
      out.insert(out.end(), in.begin() + pos + 12 + len, in.end());
      return true;
    }
    out.insert(out.end(), in.begin() + pos, in.begin() + pos + 12 + len);
    pos += 12 + len;
  }
  return false;
}

static void le32(std::vector<uint8_t>& v, uint32_t x) {
  v.push_back(static_cast<uint8_t>(x & 0xFF));
  v.push_back(static_cast<uint8_t>((x >> 8) & 0xFF));
  v.push_back(static_cast<uint8_t>((x >> 16) & 0xFF));
  v.push_back(static_cast<uint8_t>((x >> 24) & 0xFF));
}

static bool write_webp_xmp(const std::vector<uint8_t>& in, const std::string& xmp, std::vector<uint8_t>& out) {
  if (in.size() < 12) return false;
  if (!(in[0]=='R'&&in[1]=='I'&&in[2]=='F'&&in[3]=='F'&&in[8]=='W'&&in[9]=='E'&&in[10]=='B'&&in[11]=='P')) return false;
  size_t pos = 12;
  std::vector<uint8_t> chunks;
  while (pos + 8 <= in.size()) {
    uint32_t sz = static_cast<uint32_t>(in[pos+4]) | (static_cast<uint32_t>(in[pos+5])<<8) | (static_cast<uint32_t>(in[pos+6])<<16) | (static_cast<uint32_t>(in[pos+7])<<24);
    const uint8_t* id = &in[pos];
    bool isXmp = (id[0]=='X'&&id[1]=='M'&&id[2]=='P'&&id[3]==' ');
    bool isExif = (id[0]=='E'&&id[1]=='X'&&id[2]=='I'&&id[3]=='F');
    if (!isXmp && !isExif) {
      size_t end = pos + 8 + sz + (sz & 1);
      if (end > in.size()) return false;
      chunks.insert(chunks.end(), in.begin()+pos, in.begin()+end);
    }
    size_t step = 8 + sz + (sz & 1);
    if (pos + step > in.size()) break;
    pos += step;
  }
  std::vector<uint8_t> xmpChunk;
  xmpChunk.push_back('X'); xmpChunk.push_back('M'); xmpChunk.push_back('P'); xmpChunk.push_back(' ');
  le32(xmpChunk, static_cast<uint32_t>(xmp.size()));
  xmpChunk.insert(xmpChunk.end(), xmp.begin(), xmp.end());
  if (xmpChunk.size() & 1) xmpChunk.push_back(0);
  out.clear();
  out.insert(out.end(), {'R','I','F','F'});
  uint32_t riffSize = static_cast<uint32_t>(4 + chunks.size() + xmpChunk.size());
  le32(out, riffSize);
  out.insert(out.end(), {'W','E','B','P'});
  out.insert(out.end(), chunks.begin(), chunks.end());
  out.insert(out.end(), xmpChunk.begin(), xmpChunk.end());
  return true;
}

static void write_le16(std::vector<uint8_t>& v, uint16_t x) { v.push_back(static_cast<uint8_t>(x & 0xFF)); v.push_back(static_cast<uint8_t>((x >> 8) & 0xFF)); }
static void write_le32(std::vector<uint8_t>& v, uint32_t x) { v.push_back(static_cast<uint8_t>(x & 0xFF)); v.push_back(static_cast<uint8_t>((x >> 8) & 0xFF)); v.push_back(static_cast<uint8_t>((x >> 16) & 0xFF)); v.push_back(static_cast<uint8_t>((x >> 24) & 0xFF)); }

static bool build_jpeg_exif_app1(const MetaInput& m, std::vector<uint8_t>& app1) {
  std::vector<std::pair<uint16_t,std::string>> tags;
  if (!m.artist.empty()) tags.emplace_back(0x013B, m.artist);
  if (!m.creatorTool.empty()) tags.emplace_back(0x0131, m.creatorTool);
  if (!m.make.empty()) tags.emplace_back(0x010F, m.make);
  if (!m.model.empty()) tags.emplace_back(0x0110, m.model);
  if (!m.dateCreated.empty()) tags.emplace_back(0x0132, m.dateCreated);
  if (tags.empty()) return false;
  std::vector<uint8_t> tiff;
  tiff.push_back('I'); tiff.push_back('I');
  write_le16(tiff, 42);
  write_le32(tiff, 8);
  size_t ifdPos = tiff.size();
  write_le16(tiff, static_cast<uint16_t>(tags.size()));
  size_t entriesPos = tiff.size();
  tiff.resize(tiff.size() + tags.size() * 12);
  write_le32(tiff, 0);
  uint32_t dataOffset = static_cast<uint32_t>(8 + 2 + tags.size() * 12 + 4);
  for (size_t i = 0; i < tags.size(); ++i) {
    uint16_t tag = tags[i].first;
    const std::string& s = tags[i].second;
    uint32_t count = static_cast<uint32_t>(s.size() + 1);
    size_t base = entriesPos + i * 12;
    tiff[base + 0] = static_cast<uint8_t>(tag & 0xFF);
    tiff[base + 1] = static_cast<uint8_t>((tag >> 8) & 0xFF);
    tiff[base + 2] = 2;
    tiff[base + 3] = 0;
    tiff[base + 4] = static_cast<uint8_t>(count & 0xFF);
    tiff[base + 5] = static_cast<uint8_t>((count >> 8) & 0xFF);
    tiff[base + 6] = static_cast<uint8_t>((count >> 16) & 0xFF);
    tiff[base + 7] = static_cast<uint8_t>((count >> 24) & 0xFF);
    tiff[base + 8] = static_cast<uint8_t>(dataOffset & 0xFF);
    tiff[base + 9] = static_cast<uint8_t>((dataOffset >> 8) & 0xFF);
    tiff[base + 10] = static_cast<uint8_t>((dataOffset >> 16) & 0xFF);
    tiff[base + 11] = static_cast<uint8_t>((dataOffset >> 24) & 0xFF);
    dataOffset += count;
  }
  for (const auto& p : tags) {
    tiff.insert(tiff.end(), p.second.begin(), p.second.end());
    tiff.push_back(0);
  }
  std::vector<uint8_t> payload;
  payload.insert(payload.end(), {'E','x','i','f',0,0});
  payload.insert(payload.end(), tiff.begin(), tiff.end());
  app1.clear();
  app1.push_back(0xFF); app1.push_back(0xE1);
  uint16_t segLen = static_cast<uint16_t>(payload.size() + 2);
  app1.push_back(static_cast<uint8_t>(segLen >> 8));
  app1.push_back(static_cast<uint8_t>(segLen & 0xFF));
  app1.insert(app1.end(), payload.begin(), payload.end());
  return true;
}

bool write_metadata_file(const std::string& path, const MetaInput& meta) {
  try {
    std::string x = build_xmp(meta);
    std::ifstream in(path, std::ios::binary);
    if (!in.good()) return false;
    std::vector<uint8_t> buf((std::istreambuf_iterator<char>(in)), std::istreambuf_iterator<char>());
    std::vector<uint8_t> out;
    if (buf.size() >= 2 && buf[0]==0xFF && buf[1]==0xD8) {
      std::vector<uint8_t> exif;
      build_jpeg_exif_app1(meta, exif);
      if (!write_jpeg_xmp(buf, x, out)) return false;
      if (exif.size()) {
        size_t insertPos = 2;
        std::vector<uint8_t> withExif;
        withExif.reserve(out.size() + exif.size());
        withExif.insert(withExif.end(), out.begin(), out.begin() + insertPos);
        withExif.insert(withExif.end(), exif.begin(), exif.end());
        withExif.insert(withExif.end(), out.begin() + insertPos, out.end());
        out.swap(withExif);
      }
      std::ofstream o(path, std::ios::binary | std::ios::trunc);
      o.write(reinterpret_cast<const char*>(out.data()), static_cast<std::streamsize>(out.size()));
      return o.good();
    }
    static const uint8_t pngSig[8] = {137,80,78,71,13,10,26,10};
    if (buf.size() >= 8 && std::memcmp(buf.data(), pngSig, 8) == 0) {
      if (!write_png_xmp(buf, x, out)) return false;
      std::ofstream o(path, std::ios::binary | std::ios::trunc);
      o.write(reinterpret_cast<const char*>(out.data()), static_cast<std::streamsize>(out.size()));
      return o.good();
    }
    if (buf.size() >= 12 && buf[0]=='R' && buf[1]=='I' && buf[2]=='F' && buf[3]=='F' && buf[8]=='W' && buf[9]=='E' && buf[10]=='B' && buf[11]=='P') {
      if (!write_webp_xmp(buf, x, out)) return false;
      std::ofstream o(path, std::ios::binary | std::ios::trunc);
      o.write(reinterpret_cast<const char*>(out.data()), static_cast<std::streamsize>(out.size()));
      return o.good();
    }
    return false;
  } catch (...) { return false; }
}

bool strip_metadata_file(const std::string& path) {
  try {
    std::ifstream in(path, std::ios::binary);
    if (!in.good()) return false;
    std::vector<uint8_t> buf((std::istreambuf_iterator<char>(in)), std::istreambuf_iterator<char>());
    if (buf.size() >= 4 && buf[0]==0xFF && buf[1]==0xD8) {
      std::vector<uint8_t> out; out.push_back(0xFF); out.push_back(0xD8);
      size_t pos = 2;
      while (pos + 4 <= buf.size()) {
        if (buf[pos] != 0xFF) break;
        uint8_t marker = buf[pos+1];
        if (marker==0xDA) { out.insert(out.end(), buf.begin()+pos, buf.end()); break; }
        if (marker==0xD9) { out.insert(out.end(), buf.begin()+pos, buf.end()); break; }
        if (marker==0x00 || marker==0x01 || (marker>=0xD0 && marker<=0xD7)) { out.push_back(0xFF); out.push_back(marker); pos+=2; continue; }
        uint16_t len = (static_cast<uint16_t>(buf[pos+2])<<8)|buf[pos+3];
        size_t segEnd = pos + 2 + len;
        bool drop=false;
        if (marker==0xE1 && segEnd<=buf.size()) {
          const uint8_t* p=&buf[pos+4]; size_t rem=len-2;
          if (rem>=6 && std::memcmp(p,"Exif\0\0",6)==0) drop=true;
          const char* xid="http://ns.adobe.com/xap/1.0/\0"; size_t xl=strlen(xid);
          if (rem>=xl && std::memcmp(p,xid,xl)==0) drop=true;
        }
        if (!drop) out.insert(out.end(), buf.begin()+pos, buf.begin()+segEnd);
        pos = segEnd;
      }
      std::ofstream o(path, std::ios::binary | std::ios::trunc);
      o.write(reinterpret_cast<const char*>(out.data()), static_cast<std::streamsize>(out.size()));
      return o.good();
    }
    static const uint8_t pngSig[8]={137,80,78,71,13,10,26,10};
    if (buf.size()>=8 && std::memcmp(buf.data(), pngSig, 8)==0) {
      std::vector<uint8_t> out; out.insert(out.end(), buf.begin(), buf.begin()+8);
      size_t pos=8; while (pos+12<=buf.size()) {
        uint32_t len=(static_cast<uint32_t>(buf[pos])<<24)|(static_cast<uint32_t>(buf[pos+1])<<16)|(static_cast<uint32_t>(buf[pos+2])<<8)|buf[pos+3];
        if (pos+12+len>buf.size()) break; const uint8_t* type=&buf[pos+4];
        bool drop = (type[0]=='i'&&type[1]=='T'&&type[2]=='X'&&type[3]=='t');
        if (drop) {
          size_t kpos=pos+8; while (kpos<pos+8+len && buf[kpos]!=0) kpos++; std::string kw(buf.begin()+pos+8, buf.begin()+kpos);
          if (kw!="XML:com.adobe.xmp") drop=false; else drop=true;
        }
        if (!drop) out.insert(out.end(), buf.begin()+pos, buf.begin()+pos+12+len);
        pos+=12+len;
      }
      std::ofstream o(path, std::ios::binary | std::ios::trunc);
      o.write(reinterpret_cast<const char*>(out.data()), static_cast<std::streamsize>(out.size()));
      return o.good();
    }
    if (buf.size() >= 12 && buf[0]=='R'&&buf[1]=='I'&&buf[2]=='F'&&buf[3]=='F'&&buf[8]=='W'&&buf[9]=='E'&&buf[10]=='B'&&buf[11]=='P') {
      std::vector<uint8_t> out;
      out.insert(out.end(), {'R','I','F','F'});
      size_t pos=12; std::vector<uint8_t> chunks;
      while (pos+8<=buf.size()) {
        uint32_t sz=(static_cast<uint32_t>(buf[pos+4]))|(static_cast<uint32_t>(buf[pos+5])<<8)|(static_cast<uint32_t>(buf[pos+6])<<16)|(static_cast<uint32_t>(buf[pos+7])<<24);
        const uint8_t* id=&buf[pos];
        bool drop=(id[0]=='X'&&id[1]=='M'&&id[2]=='P'&&id[3]==' ');
        bool drop2=(id[0]=='E'&&id[1]=='X'&&id[2]=='I'&&id[3]=='F');
        size_t end=pos+8+sz+(sz&1);
        if (end>buf.size()) break;
        if (!drop && !drop2) chunks.insert(chunks.end(), buf.begin()+pos, buf.begin()+end);
        pos=end;
      }
      uint32_t riffSize=static_cast<uint32_t>(4+chunks.size());
      le32(out, riffSize);
      out.insert(out.end(), {'W','E','B','P'});
      out.insert(out.end(), chunks.begin(), chunks.end());
      std::ofstream o(path, std::ios::binary | std::ios::trunc);
      o.write(reinterpret_cast<const char*>(out.data()), static_cast<std::streamsize>(out.size()));
      return o.good();
    }
    return false;
  } catch (...) { return false; }
}

}