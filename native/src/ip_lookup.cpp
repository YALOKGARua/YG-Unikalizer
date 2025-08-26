#include "ip_lookup.h"
#include <string>
#include <sstream>
#include <winsock2.h>
#include <ws2tcpip.h>
#pragma comment(lib, "ws2_32.lib")

static bool tcp_send_all(SOCKET s, const char* buf, int len) {
  int sent = 0; while (sent < len) { int n = send(s, buf + sent, len - sent, 0); if (n <= 0) return false; sent += n; }
  return true;
}

bool ip_lookup(const std::string& ip, std::string& out_json) {
  out_json.clear();
  WSADATA wsa; if (WSAStartup(MAKEWORD(2,2), &wsa) != 0) return false;
  SOCKET s = INVALID_SOCKET;
  addrinfo hints{}; hints.ai_family = AF_UNSPEC; hints.ai_socktype = SOCK_STREAM; hints.ai_protocol = IPPROTO_TCP;
  addrinfo* res = nullptr;
  if (getaddrinfo("ip-api.com", "80", &hints, &res) != 0) { WSACleanup(); return false; }
  for (addrinfo* p = res; p; p = p->ai_next) {
    s = socket(p->ai_family, p->ai_socktype, p->ai_protocol);
    if (s == INVALID_SOCKET) continue;
    if (connect(s, p->ai_addr, (int)p->ai_addrlen) == 0) break;
    closesocket(s); s = INVALID_SOCKET;
  }
  freeaddrinfo(res);
  if (s == INVALID_SOCKET) { WSACleanup(); return false; }
  std::ostringstream req;
  req << "GET /json/" << ip << "?fields=status,country,regionName,city,org,as,isp,query,timezone,lat,lon,proxy,hosting,mobile HTTP/1.1\r\n";
  req << "Host: ip-api.com\r\n";
  req << "Connection: close\r\n\r\n";
  std::string data = req.str();
  if (!tcp_send_all(s, data.c_str(), (int)data.size())) { closesocket(s); WSACleanup(); return false; }
  std::string resp; resp.reserve(2048);
  char buf[2048];
  int n = 0;
  while ((n = recv(s, buf, sizeof(buf), 0)) > 0) resp.append(buf, buf + n);
  closesocket(s); WSACleanup();
  size_t p = resp.find("\r\n\r\n"); if (p == std::string::npos) return false;
  out_json = resp.substr(p + 4);
  if (out_json.empty()) return false;
  return true;
}