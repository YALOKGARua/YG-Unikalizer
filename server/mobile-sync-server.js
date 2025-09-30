"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server/mobile-sync-server.ts
var mobile_sync_server_exports = {};
__export(mobile_sync_server_exports, {
  startMobileSyncServer: () => startMobileSyncServer
});
module.exports = __toCommonJS(mobile_sync_server_exports);
var import_express = __toESM(require("express"));
var import_socket = require("socket.io");
var import_http = require("http");
var import_multer = __toESM(require("multer"));
var import_path = __toESM(require("path"));
var import_uuid = require("uuid");
var import_os = __toESM(require("os"));
var import_fs = __toESM(require("fs"));
var app = (0, import_express.default)();
var httpServer = (0, import_http.createServer)(app);
var io = new import_socket.Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
var PORT = 3030;
var sessions = /* @__PURE__ */ new Map();
var storage = import_multer.default.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = import_path.default.join(import_os.default.tmpdir(), "yg-unikalizer-uploads");
    if (!import_fs.default.existsSync(uploadDir)) {
      import_fs.default.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});
var upload = (0, import_multer.default)({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});
app.use(import_express.default.json());
app.use(import_express.default.static(import_path.default.join(__dirname, "../public")));
app.get("/api/session/create", (req, res) => {
  const token = (0, import_uuid.v4)().slice(0, 8);
  const sessionId = (0, import_uuid.v4)();
  sessions.set(sessionId, { token, desktopSocket: null, mobileSocket: null });
  const localIP = getLocalIP();
  const url = `http://${localIP}:${PORT}/mobile?session=${sessionId}&token=${token}`;
  res.json({ sessionId, token, url, ip: localIP, port: PORT });
});
app.get("/api/session/:sessionId/validate", (req, res) => {
  const { sessionId } = req.params;
  const { token } = req.query;
  const session = sessions.get(sessionId);
  if (!session || session.token !== token) {
    return res.status(401).json({ error: "Invalid session or token" });
  }
  res.json({ valid: true });
});
app.post("/api/upload", upload.array("files", 10), (req, res) => {
  const { sessionId } = req.body;
  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(401).json({ error: "Invalid session" });
  }
  const files = req.files.map((f) => ({
    path: f.path,
    name: f.originalname,
    size: f.size
  }));
  if (session.desktopSocket) {
    session.desktopSocket.emit("files-uploaded", { files });
  }
  res.json({ success: true, files });
});
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  socket.on("desktop-connect", ({ sessionId }) => {
    const session = sessions.get(sessionId);
    if (session) {
      session.desktopSocket = socket;
      socket.join(`session-${sessionId}`);
      console.log("Desktop connected to session:", sessionId);
    }
  });
  socket.on("mobile-connect", ({ sessionId, token }) => {
    const session = sessions.get(sessionId);
    if (session && session.token === token) {
      session.mobileSocket = socket;
      socket.join(`session-${sessionId}`);
      if (session.desktopSocket) {
        session.desktopSocket.emit("mobile-connected");
      }
      socket.emit("connected", { success: true });
      console.log("Mobile connected to session:", sessionId);
    } else {
      socket.emit("error", { message: "Invalid session or token" });
    }
  });
  socket.on("processing-started", ({ sessionId, total }) => {
    const session = sessions.get(sessionId);
    if (session?.mobileSocket) {
      session.mobileSocket.emit("processing-started", { total });
    }
  });
  socket.on("processing-progress", ({ sessionId, current, total, fileName }) => {
    const session = sessions.get(sessionId);
    if (session?.mobileSocket) {
      session.mobileSocket.emit("processing-progress", { current, total, fileName });
    }
  });
  socket.on("processing-complete", ({ sessionId, results }) => {
    const session = sessions.get(sessionId);
    if (session?.mobileSocket) {
      session.mobileSocket.emit("processing-complete", { results });
    }
  });
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    sessions.forEach((session, sessionId) => {
      if (session.desktopSocket?.id === socket.id) {
        session.desktopSocket = null;
      }
      if (session.mobileSocket?.id === socket.id) {
        session.mobileSocket = null;
        if (session.desktopSocket) {
          session.desktopSocket.emit("mobile-disconnected");
        }
      }
    });
  });
});
function getLocalIP() {
  const interfaces = import_os.default.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}
function startMobileSyncServer() {
  httpServer.listen(PORT, () => {
    console.log(`\u{1F680} Mobile Sync Server running on port ${PORT}`);
    console.log(`\u{1F4F1} Local IP: ${getLocalIP()}`);
  });
  return {
    port: PORT,
    ip: getLocalIP(),
    stop: () => httpServer.close()
  };
}
if (require.main === module) {
  startMobileSyncServer();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  startMobileSyncServer
});
