{
  "targets": [
    {
      "target_name": "photounikalizer_native",
      "sources": [
        "src/addon.cpp",
        "src/image_hash.cpp",
        "src/gpu_hash.cpp"
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
              "AdditionalOptions": [ "/std:c++17", "/EHsc" ],
              "ExceptionHandling": 1
            }
          },
          "libraries": [ "d3d11.lib", "dxgi.lib" ]
        }, {
          "cflags_cc": [ "-std=c++17", "-fexceptions" ]
        } ]
      ]
    }
  ]
}