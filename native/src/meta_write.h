#pragma once
#include <string>
#include <vector>

namespace photounikalizer_native {

struct MetaInput {
  std::string artist;
  std::string description;
  std::string copyright;
  std::vector<std::string> keywords;
  std::string contact;
  std::string email;
  std::string url;
  std::string owner;
  std::string creatorTool;
  std::string title;
  std::string label;
  int rating = -1;
  std::string make;
  std::string model;
  std::string lensModel;
  std::string bodySerial;
  std::string exposureTime;
  double fNumber = -1.0;
  int iso = -1;
  double focalLength = -1.0;
  int exposureProgram = -1;
  int meteringMode = -1;
  int flash = -1;
  int whiteBalance = -1;
  std::string colorSpace;
  bool hasGps = false;
  double gpsLat = 0.0;
  double gpsLon = 0.0;
  double gpsAlt = 0.0;
  std::string city;
  std::string state;
  std::string country;
  std::string dateCreated;
};

bool write_metadata_file(const std::string& path, const MetaInput& meta);
bool strip_metadata_file(const std::string& path);

}