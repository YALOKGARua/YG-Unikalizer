"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// electron/preload.ts
var import_electron = require("electron");
var import_path = __toESM(require("path"));
var import_fs = __toESM(require("fs"));
var sharp = null;
var nativeMod = null;
function loadNative() {
  if (nativeMod) return nativeMod;
  try {
    try {
      const ngb = require("node-gyp-build");
      nativeMod = ngb(import_path.default.join(__dirname, "..", "native"));
      if (nativeMod) return nativeMod;
    } catch {
    }
    const candidate = import_path.default.join(process.cwd(), "native", "build", "Release", "photounikalizer_native.node");
    if (import_fs.default.existsSync(candidate)) {
      nativeMod = require(candidate);
      return nativeMod;
    }
  } catch {
  }
  try {
    const asarUnpacked = import_path.default.join(process.resourcesPath || "", "app.asar.unpacked", "native", "build", "Release", "photounikalizer_native.node");
    if (asarUnpacked && import_fs.default.existsSync(asarUnpacked)) {
      nativeMod = require(asarUnpacked);
      return nativeMod;
    }
  } catch {
  }
  try {
    const platArch = `${process.platform}-${process.arch}`;
    const prebuildA = import_path.default.join(__dirname, "..", "native", "prebuilds", platArch, "node.napi.node");
    if (import_fs.default.existsSync(prebuildA)) {
      nativeMod = require(prebuildA);
      return nativeMod;
    }
    const prebuildB = import_path.default.join(__dirname, "..", "native", "prebuilds", platArch, "photounikalizer-native.node");
    if (import_fs.default.existsSync(prebuildB)) {
      nativeMod = require(prebuildB);
      return nativeMod;
    }
  } catch {
  }
  try {
    nativeMod = require("photounikalizer_native");
  } catch {
    nativeMod = null;
  }
  return nativeMod;
}
async function decodeGray8(filePath) {
  if (!sharp) {
    try {
      sharp = require("sharp");
    } catch {
      sharp = null;
    }
  }
  if (!sharp) return null;
  const res = await sharp(filePath).grayscale().raw().toBuffer({ resolveWithObject: true });
  const buf = new Uint8Array(res.data.buffer, res.data.byteOffset, res.data.byteLength);
  const width = res.info.width;
  const height = res.info.height;
  const stride = res.info.width * res.info.channels;
  return { buf, width, height, stride };
}
async function decodeRgba(filePath) {
  if (!sharp) {
    try {
      sharp = require("sharp");
    } catch {
      sharp = null;
    }
  }
  if (!sharp) return null;
  const res = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const buf = new Uint8Array(res.data.buffer, res.data.byteOffset, res.data.byteLength);
  const width = res.info.width;
  const height = res.info.height;
  const stride = res.info.width * res.info.channels;
  return { buf, width, height, stride };
}
import_electron.contextBridge.exposeInMainWorld("api", {
  selectImages: () => import_electron.ipcRenderer.invoke("select-images"),
  selectImageDir: () => import_electron.ipcRenderer.invoke("select-image-dir"),
  selectOutputDir: () => import_electron.ipcRenderer.invoke("select-output-dir"),
  processImages: (payload) => import_electron.ipcRenderer.invoke("process-images", payload),
  selectTextFile: () => import_electron.ipcRenderer.invoke("select-text-file"),
  readTextFileByPath: (p) => import_electron.ipcRenderer.invoke("read-text-file-by-path", p),
  saveJson: (payload) => import_electron.ipcRenderer.invoke("save-json", payload),
  saveJsonBatch: (payload) => import_electron.ipcRenderer.invoke("save-json-batch", payload),
  savePreset: (payload) => import_electron.ipcRenderer.invoke("save-preset", payload),
  loadPreset: () => import_electron.ipcRenderer.invoke("load-preset"),
  cancel: () => import_electron.ipcRenderer.invoke("cancel-process"),
  expandPaths: (paths) => import_electron.ipcRenderer.invoke("expand-paths", paths),
  openPath: (p) => import_electron.ipcRenderer.invoke("open-path", p),
  showInFolder: (p) => import_electron.ipcRenderer.invoke("show-item-in-folder", p),
  renameFile: (path2, newName) => import_electron.ipcRenderer.invoke("file-rename", { path: path2, newName }),
  deleteFile: (path2) => import_electron.ipcRenderer.invoke("file-delete", path2),
  fileStats: (path2) => import_electron.ipcRenderer.invoke("file-stats", path2),
  metaBeforeAfter: (src, out) => import_electron.ipcRenderer.invoke("meta-before-after", { src, out }),
  onProgress: (cb) => {
    const listener = (_, data) => cb(data);
    import_electron.ipcRenderer.on("process-progress", listener);
    return () => import_electron.ipcRenderer.removeListener("process-progress", listener);
  },
  onComplete: (cb) => {
    const listener = () => cb();
    import_electron.ipcRenderer.on("process-complete", listener);
    return () => import_electron.ipcRenderer.removeListener("process-complete", listener);
  },
  onOsOpenFiles: (cb) => {
    const listener = (_, files) => cb(files);
    import_electron.ipcRenderer.on("os-open-files", listener);
    return () => import_electron.ipcRenderer.removeListener("os-open-files", listener);
  },
  checkForUpdates: () => import_electron.ipcRenderer.invoke("check-for-updates"),
  downloadUpdate: () => import_electron.ipcRenderer.invoke("download-update"),
  quitAndInstall: () => import_electron.ipcRenderer.invoke("quit-and-install"),
  onUpdateAvailable: (cb) => {
    const listener = (_, info) => cb(info);
    import_electron.ipcRenderer.on("update-available", listener);
    return () => import_electron.ipcRenderer.removeListener("update-available", listener);
  },
  onUpdateNotAvailable: (cb) => {
    const listener = (_, info) => cb(info);
    import_electron.ipcRenderer.on("update-not-available", listener);
    return () => import_electron.ipcRenderer.removeListener("update-not-available", listener);
  },
  onUpdateError: (cb) => {
    const listener = (_, err) => cb(err);
    import_electron.ipcRenderer.on("update-error", listener);
    return () => import_electron.ipcRenderer.removeListener("update-error", listener);
  },
  onUpdateProgress: (cb) => {
    const listener = (_, p) => cb(p);
    import_electron.ipcRenderer.on("update-download-progress", listener);
    return () => import_electron.ipcRenderer.removeListener("update-download-progress", listener);
  },
  onUpdateDownloaded: (cb) => {
    const listener = (_, info) => cb(info);
    import_electron.ipcRenderer.on("update-downloaded", listener);
    return () => import_electron.ipcRenderer.removeListener("update-downloaded", listener);
  },
  onWhatsNew: (cb) => {
    const listener = (_, payload) => cb(payload);
    import_electron.ipcRenderer.on("show-whats-new", listener);
    return () => import_electron.ipcRenderer.removeListener("show-whats-new", listener);
  },
  win: {
    minimize: () => import_electron.ipcRenderer.invoke("win-minimize"),
    maximize: () => import_electron.ipcRenderer.invoke("win-maximize"),
    toggleMaximize: () => import_electron.ipcRenderer.invoke("win-toggle-maximize"),
    close: () => import_electron.ipcRenderer.invoke("win-close"),
    isMaximized: () => import_electron.ipcRenderer.invoke("win-is-maximized"),
    onMaximizeState: (cb) => {
      const listener = (_, v) => cb(v);
      import_electron.ipcRenderer.on("win-maximize-state", listener);
      return () => import_electron.ipcRenderer.removeListener("win-maximize-state", listener);
    }
  },
  onStep: (cb) => {
    const listener = (_, s) => cb(s);
    import_electron.ipcRenderer.on("process-step", listener);
    return () => import_electron.ipcRenderer.removeListener("process-step", listener);
  },
  getUpdateChangelog: () => import_electron.ipcRenderer.invoke("get-update-changelog"),
  getFullChangelog: () => import_electron.ipcRenderer.invoke("get-full-changelog"),
  getReadme: () => import_electron.ipcRenderer.invoke("get-readme"),
  clearStatsCache: () => import_electron.ipcRenderer.invoke("stats-cache-clear"),
  relaunchAsAdmin: () => import_electron.ipcRenderer.invoke("relaunch-admin"),
  isAdmin: () => import_electron.ipcRenderer.invoke("is-admin"),
  decodeGray8File: (p) => decodeGray8(p).then((dec) => dec ? { width: dec.width, height: dec.height, stride: dec.stride, data: Array.from(dec.buf) } : null),
  decodeRgbaFile: (p) => decodeRgba(p).then((dec) => dec ? { width: dec.width, height: dec.height, stride: dec.stride, data: Array.from(dec.buf) } : null),
  wasmCodecs: {
    ensure: (items) => import_electron.ipcRenderer.invoke("ensure-wasm-codecs", { items }),
    load: (name) => import_electron.ipcRenderer.invoke("load-wasm-file", name)
  },
  saveBytes: (payload) => import_electron.ipcRenderer.invoke("save-bytes", payload),
  ui: {
    saveState: (data) => import_electron.ipcRenderer.invoke("ui-state-save", data),
    loadState: () => import_electron.ipcRenderer.invoke("ui-state-load")
  },
  auth: {
    isRequired: () => import_electron.ipcRenderer.invoke("auth-required"),
    login: (password, remember) => import_electron.ipcRenderer.invoke("auth-login", { password, remember }),
    logout: () => import_electron.ipcRenderer.invoke("auth-logout")
  },
  dev: {
    onToggleAdminPanel: (cb) => {
      const listener = () => cb();
      import_electron.ipcRenderer.on("dev-admin-toggle", listener);
      return () => import_electron.ipcRenderer.removeListener("dev-admin-toggle", listener);
    },
    onShowAdminPanel: (cb) => {
      const listener = () => cb();
      import_electron.ipcRenderer.on("dev-admin-show", listener);
      return () => import_electron.ipcRenderer.removeListener("dev-admin-show", listener);
    },
    onHideAdminPanel: (cb) => {
      const listener = () => cb();
      import_electron.ipcRenderer.on("dev-admin-hide", listener);
      return () => import_electron.ipcRenderer.removeListener("dev-admin-hide", listener);
    },
    onRequestUnlock: (cb) => {
      const listener = () => cb();
      import_electron.ipcRenderer.on("dev-admin-request-unlock", listener);
      return () => import_electron.ipcRenderer.removeListener("dev-admin-request-unlock", listener);
    },
    onUnlocked: (cb) => {
      const listener = () => cb();
      import_electron.ipcRenderer.on("dev-admin-unlocked", listener);
      return () => import_electron.ipcRenderer.removeListener("dev-admin-unlocked", listener);
    },
    toggleAdminPanel: () => import_electron.ipcRenderer.invoke("dev-toggle-admin"),
    showAdminPanel: () => import_electron.ipcRenderer.invoke("dev-show-admin"),
    hideAdminPanel: () => import_electron.ipcRenderer.invoke("dev-hide-admin"),
    unlock: (password) => import_electron.ipcRenderer.invoke("dev-unlock", password),
    isUnlocked: () => import_electron.ipcRenderer.invoke("dev-is-unlocked"),
    lock: () => import_electron.ipcRenderer.invoke("dev-lock")
  },
  admin: {
    getPassword: () => import_electron.ipcRenderer.invoke("get-admin-password")
  },
  checkTokenVision: (payload) => import_electron.ipcRenderer.invoke("check-token-vision", payload),
  native: {
    parseTxtProfiles: (text) => {
      const mod = loadNative();
      return mod ? mod.parseTxtProfiles(String(text || "")) : null;
    },
    computeFileHash: async (p) => {
      const mod = loadNative();
      if (!mod) return null;
      const res = mod.computeFileHash(p);
      return typeof res === "bigint" ? res.toString() : res;
    },
    hammingDistance: (a, b) => {
      const mod = loadNative();
      if (!mod) return null;
      return mod.hammingDistance(a, b);
    },
    scanDirectory: (dir, recursive = true) => {
      const mod = loadNative();
      if (!mod) return [];
      return mod.scanDirectory(dir, !!recursive);
    },
    scanDirectoryFiltered: (dir, recursive = true, excludes = []) => {
      const mod = loadNative();
      if (!mod) return [];
      return mod.scanDirectoryFiltered(dir, !!recursive, Array.isArray(excludes) ? excludes : []);
    },
    aHashFromGray8: (buf, w, h, stride) => {
      const mod = loadNative();
      if (!mod) return null;
      const res = mod.aHashFromGray8(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength), w, h, stride);
      return typeof res === "bigint" ? res.toString() : res;
    },
    dHashFromGray8: (buf, w, h, stride) => {
      const mod = loadNative();
      if (!mod) return null;
      const res = mod.dHashFromGray8(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength), w, h, stride);
      return typeof res === "bigint" ? res.toString() : res;
    },
    pHashFromGray8: (buf, w, h, stride) => {
      const mod = loadNative();
      if (!mod) return null;
      const res = mod.pHashFromGray8(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength), w, h, stride);
      return typeof res === "bigint" ? res.toString() : res;
    },
    topKHamming: (hashes, query, k) => {
      const mod = loadNative();
      if (!mod) return [];
      return mod.topKHamming(hashes, query, k);
    },
    fileAHash: async (filePath) => {
      const mod = loadNative();
      if (!mod) return null;
      try {
        const dec2 = mod.wicDecodeGray8 ? mod.wicDecodeGray8(filePath) : null;
        if (dec2 && dec2.buffer && typeof dec2.width === "number" && typeof dec2.height === "number" && typeof dec2.stride === "number") {
          const u8 = new Uint8Array(dec2.buffer.buffer, dec2.buffer.byteOffset, dec2.buffer.byteLength);
          const res2 = mod.aHashFromGray8(u8, dec2.width, dec2.height, dec2.stride);
          return typeof res2 === "bigint" ? res2.toString() : res2;
        }
      } catch {
      }
      const dec = await decodeGray8(filePath);
      if (!dec) return null;
      const res = mod.aHashFromGray8(dec.buf, dec.width, dec.height, dec.stride);
      return typeof res === "bigint" ? res.toString() : res;
    },
    fileDHash: async (filePath) => {
      const mod = loadNative();
      if (!mod) return null;
      try {
        const dec2 = mod.wicDecodeGray8 ? mod.wicDecodeGray8(filePath) : null;
        if (dec2 && dec2.buffer && typeof dec2.width === "number" && typeof dec2.height === "number" && typeof dec2.stride === "number") {
          const u8 = new Uint8Array(dec2.buffer.buffer, dec2.buffer.byteOffset, dec2.buffer.byteLength);
          const res2 = mod.dHashFromGray8(u8, dec2.width, dec2.height, dec2.stride);
          return typeof res2 === "bigint" ? res2.toString() : res2;
        }
      } catch {
      }
      const dec = await decodeGray8(filePath);
      if (!dec) return null;
      const res = mod.dHashFromGray8(dec.buf, dec.width, dec.height, dec.stride);
      return typeof res === "bigint" ? res.toString() : res;
    },
    filePHash: async (filePath) => {
      const mod = loadNative();
      if (!mod) return null;
      try {
        const dec2 = mod.wicDecodeGray8 ? mod.wicDecodeGray8(filePath) : null;
        if (dec2 && dec2.buffer && typeof dec2.width === "number" && typeof dec2.height === "number" && typeof dec2.stride === "number") {
          const u8 = new Uint8Array(dec2.buffer.buffer, dec2.buffer.byteOffset, dec2.buffer.byteLength);
          const res2 = mod.pHashFromGray8(u8, dec2.width, dec2.height, dec2.stride);
          return typeof res2 === "bigint" ? res2.toString() : res2;
        }
      } catch {
      }
      const dec = await decodeGray8(filePath);
      if (!dec) return null;
      const res = mod.pHashFromGray8(dec.buf, dec.width, dec.height, dec.stride);
      return typeof res === "bigint" ? res.toString() : res;
    },
    gpu: {
      init: () => {
        const mod = loadNative();
        if (mod) mod.gpuInit();
      },
      shutdown: () => {
        const mod = loadNative();
        if (mod) mod.gpuShutdown();
      },
      setEnabled: (v) => {
        const mod = loadNative();
        if (mod) mod.gpuSetEnabled(!!v);
      },
      isEnabled: () => {
        const mod = loadNative();
        return mod ? !!mod.gpuIsEnabled() : false;
      },
      isSupported: () => {
        const mod = loadNative();
        return mod ? !!mod.gpuSupported() : false;
      },
      adapterName: () => {
        const mod = loadNative();
        return mod && mod.gpuAdapterName ? String(mod.gpuAdapterName()) : "";
      }
    },
    writeMetadata: (p, meta) => {
      const mod = loadNative();
      return mod ? !!mod.writeMetadata(p, meta) : false;
    },
    stripMetadata: (p) => {
      const mod = loadNative();
      return mod ? !!mod.stripMetadata(p) : false;
    },
    createHammingIndex: (hashes) => {
      const mod = loadNative();
      return mod ? mod.createHammingIndex(hashes) : -1;
    },
    queryHammingIndex: (id, query, k, maxDistance) => {
      const mod = loadNative();
      return mod ? mod.queryHammingIndex(id, query, k, maxDistance) : [];
    },
    freeHammingIndex: (id) => {
      const mod = loadNative();
      if (mod) mod.freeHammingIndex(id);
    },
    clusterByHamming: (hashes, threshold) => {
      const mod = loadNative();
      return mod ? mod.clusterByHamming(hashes, threshold) : [];
    },
    wicDecodeGray8: (filePath) => {
      const mod = loadNative();
      return mod ? mod.wicDecodeGray8(filePath) : null;
    },
    parseTxtProfilesFromFile: (filePath) => {
      const mod = loadNative();
      return mod ? mod.parseTxtProfilesFromFile(filePath) : null;
    }
  },
  hashAHashBatch: (paths) => import_electron.ipcRenderer.invoke("native-ahash-batch", { paths }),
  hashFileIncremental: (p) => import_electron.ipcRenderer.invoke("hash-file-incremental", { path: p })
});
//# sourceMappingURL=preload.js.map
