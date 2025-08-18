{
  "targets": [
    {
      "target_name": "photounikalizer_native",
      "sources": [
        "src/addon.cpp",
        "src/image_hash.cpp",
        "src/gpu_hash.cpp",
        "src/meta_write.cpp",
        "src/xxhash.cpp",
        "src/hamming_index.cpp",
        "src/wic_decode.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "third_party"
      ],
      "defines": [
        "NAPI_VERSION=8",
        "NAPI_CPP_EXCEPTIONS"
      ],
      "conditions": [
        [ "OS=='win'", {
          "msvs_settings": {
            "VCCLCompilerTool": {
              "AdditionalOptions": [ "/std:c++20", "/EHsc" ],
              "ExceptionHandling": 1
            }
          },
          "libraries": [ "d3d11.lib", "dxgi.lib" ]
        }, {
          "cflags_cc": [ "-std=c++20", "-fexceptions" ]
        } ]
      ]
    }
  ]
}