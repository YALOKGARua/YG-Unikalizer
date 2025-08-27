const { app, BrowserWindow, ipcMain, dialog, shell, Notification, Menu, session } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const sharp = require('sharp')
const { randomUUID, createHash } = require('crypto')
const { autoUpdater } = require('electron-updater')
const { exec, spawn } = require('child_process')
const https = require('https')
try {
  const candidates = []
  candidates.push(path.join(__dirname, '..', '.env.local'))
  candidates.push(path.join(__dirname, '..', '.env'))
  if (process.resourcesPath) {
    candidates.push(path.join(process.resourcesPath, '.env.local'))
    candidates.push(path.join(process.resourcesPath, '.env'))
    try { candidates.push(path.join(path.dirname(process.resourcesPath), '.env.local')) } catch (_) {}
    try { candidates.push(path.join(path.dirname(process.resourcesPath), '.env')) } catch (_) {}
  }
  try { candidates.push(path.join(path.dirname(process.execPath || ''), '.env.local')) } catch (_) {}
  try { candidates.push(path.join(path.dirname(process.execPath || ''), '.env')) } catch (_) {}
  candidates.push(path.join(process.cwd(), '.env.local'))
  candidates.push(path.join(process.cwd(), '.env'))
  const dotenv = require('dotenv')
  const seen = new Set()
  for (const p of candidates) {
    if (!p || seen.has(p)) continue
    seen.add(p)
    try { dotenv.config({ path: p }) } catch (_) {}
  }
} catch (_) {}
try {
  if (!process.env.DEV_MENU_PASSWORD) {
    const files = [
      path.join(__dirname, '..', '.env.local'),
      path.join(__dirname, '..', '.env'),
      process.resourcesPath ? path.join(process.resourcesPath, '.env.local') : '',
      process.resourcesPath ? path.join(process.resourcesPath, '.env') : '',
      process.resourcesPath ? path.join(path.dirname(process.resourcesPath), '.env.local') : '',
      process.resourcesPath ? path.join(path.dirname(process.resourcesPath), '.env') : '',
      path.join(path.dirname(process.execPath || ''), '.env.local'),
      path.join(path.dirname(process.execPath || ''), '.env'),
      path.join(process.cwd(), '.env.local'),
      path.join(process.cwd(), '.env')
    ].filter(Boolean)
    for (const fp of files) {
      try {
        if (!fs.existsSync(fp)) continue
        const txt = fs.readFileSync(fp, 'utf-8')
        const lines = String(txt).split(/\r?\n/)
        for (const ln of lines) {
          if (!ln || /^\s*#/.test(ln)) continue
          const m = ln.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
          if (!m) continue
          const key = m[1]
          const raw = m[2]
          const val = raw.replace(/^"|"$/g, '').replace(/^'|'$/g, '')
          if (!process.env[key]) process.env[key] = val
        }
      } catch (_) {}
    }
  }
} catch (_) {}

function reloadEnvFromCandidates() {
  try {
    const candidates = []
    candidates.push(path.join(__dirname, '..', '.env.local'))
    candidates.push(path.join(__dirname, '..', '.env'))
    if (process.resourcesPath) {
      candidates.push(path.join(process.resourcesPath, '.env.local'))
      candidates.push(path.join(process.resourcesPath, '.env'))
      try { candidates.push(path.join(path.dirname(process.resourcesPath), '.env.local')) } catch (_) {}
      try { candidates.push(path.join(path.dirname(process.resourcesPath), '.env')) } catch (_) {}
    }
    try { candidates.push(path.join(path.dirname(process.execPath || ''), '.env.local')) } catch (_) {}
    try { candidates.push(path.join(path.dirname(process.execPath || ''), '.env')) } catch (_) {}
    candidates.push(path.join(process.cwd(), '.env.local'))
    candidates.push(path.join(process.cwd(), '.env'))
    for (const p of Array.from(new Set(candidates))) {
      try {
        if (!p || !fs.existsSync(p)) continue
        const txt = fs.readFileSync(p, 'utf-8')
        const lines = String(txt).split(/\r?\n/)
        for (const ln of lines) {
          if (!ln || /^\s*#/.test(ln)) continue
          const m = ln.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
          if (!m) continue
          const key = m[1]
          const raw = m[2]
          const val = raw.replace(/^"|"$/g, '').replace(/^'|'$/g, '')
          if (!process.env[key]) process.env[key] = val
        }
      } catch (_) {}
    }
  } catch (_) {}
}

let mainWindow
let didInitUpdater = false
let currentBatchId = 0
let cancelRequested = false
const PRESET_FILE = path.join(app.getPath('userData'), 'preset.json')
let lastUpdateInfo = null
let fallbackUpdateInfo = null
let downloadedInstallerPath = ''
let statsCache = null
let statsCachePath = ''
let statsCacheDirty = false
let statsSaveTimer = null
let uiStatePath = ''
let devUnlocked = false
const DEV_PASSWORD = String(process.env.DEV_MENU_PASSWORD || '')

let nativeMod = null
function loadNative() {
  if (nativeMod) return nativeMod
  try {
    const ngb = require('node-gyp-build')
    nativeMod = ngb(path.join(__dirname, '..', 'native'))
    if (nativeMod) return nativeMod
  } catch (_) {}
  try {
    const candidate = path.join(process.cwd(), 'native', 'build', 'Release', 'photounikalizer_native.node')
    if (fs.existsSync(candidate)) {
      nativeMod = require(candidate)
      return nativeMod
    }
  } catch (_) {}
  try {
    const asarUnpacked = path.join(process.resourcesPath || '', 'app.asar.unpacked', 'native', 'build', 'Release', 'photounikalizer_native.node')
    if (asarUnpacked && fs.existsSync(asarUnpacked)) {
      nativeMod = require(asarUnpacked)
      return nativeMod
    }
  } catch (_) {}
  try {
    const platArch = `${process.platform}-${process.arch}`
    const prebuildA = path.join(__dirname, '..', 'native', 'prebuilds', platArch, 'node.napi.node')
    if (fs.existsSync(prebuildA)) {
      nativeMod = require(prebuildA)
      return nativeMod
    }
    const prebuildB = path.join(__dirname, '..', 'native', 'prebuilds', platArch, 'photounikalizer-native.node')
    if (fs.existsSync(prebuildB)) {
      nativeMod = require(prebuildB)
      return nativeMod
    }
  } catch (_) {}
  try {
    const platArch = `${process.platform}-${process.arch}`
    const base = path.join(process.resourcesPath || '', 'app.asar.unpacked', 'native', 'prebuilds', platArch)
    const prebuildA = path.join(base, 'node.napi.node')
    const prebuildB = path.join(base, 'photounikalizer-native.node')
    if (fs.existsSync(prebuildA)) { nativeMod = require(prebuildA); return nativeMod }
    if (fs.existsSync(prebuildB)) { nativeMod = require(prebuildB); return nativeMod }
  } catch (_) {}
  try {
    nativeMod = require('photounikalizer_native')
  } catch (_) {
    nativeMod = null
  }
  return nativeMod
}

let appPasswordHash = null
let isAuthed = false
let rememberUntil = 0
function loadAppPasswordSecret() {
  try {
    const envHash = (process.env.PU_APP_PASSWORD_HASH || process.env.APP_PASSWORD_HASH || '').trim()
    if (envHash && /^[a-fA-F0-9]{64}$/.test(envHash)) { appPasswordHash = envHash.toLowerCase(); return }
    const envPlain = (process.env.PU_APP_PASSWORD || process.env.APP_PASSWORD || '').trim()
    if (envPlain) { appPasswordHash = createHash('sha256').update(envPlain, 'utf8').digest('hex'); return }
    const p = path.join(app.getPath('userData'), 'app.pass')
    if (fs.existsSync(p)) {
      const txt = fs.readFileSync(p, 'utf8').toString().trim()
      if (/^[a-fA-F0-9]{64}$/.test(txt)) appPasswordHash = txt.toLowerCase()
      else if (txt) appPasswordHash = createHash('sha256').update(txt, 'utf8').digest('hex')
      return
    }
    const r = path.join(process.resourcesPath || '', 'app.pass')
    if (r && fs.existsSync(r)) {
      const txt = fs.readFileSync(r, 'utf8').toString().trim()
      if (/^[a-fA-F0-9]{64}$/.test(txt)) appPasswordHash = txt.toLowerCase()
      else if (txt) appPasswordHash = createHash('sha256').update(txt, 'utf8').digest('hex')
      return
    }
  } catch (_) {}
}

function ensureDevAdminPasswords() {
  try {
    if (!process.env.DEV_MENU_PASSWORD) {
      const p = path.join(app.getPath('userData'), 'dev.pass')
      let v = ''
      try { if (fs.existsSync(p)) v = fs.readFileSync(p, 'utf-8').toString().trim() } catch (_) {}
      if (!v) {
        try {
          const seed = randomUUID() + String(Date.now())
          v = createHash('sha256').update(seed, 'utf8').digest('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 16)
        } catch (_) { v = Math.random().toString(36).slice(2, 18) }
        try { fs.writeFileSync(p, v, 'utf-8') } catch (_) {}
      }
      process.env.DEV_MENU_PASSWORD = v
    }
  } catch (_) {}
  try {
    if (!process.env.CHAT_ADMIN_PASSWORD) {
      const p2 = path.join(app.getPath('userData'), 'chat_admin.pass')
      let v2 = ''
      try { if (fs.existsSync(p2)) v2 = fs.readFileSync(p2, 'utf-8').toString().trim() } catch (_) {}
      if (!v2) {
        try {
          const seed2 = randomUUID() + String(Date.now()) + 'chat'
          v2 = createHash('sha256').update(seed2, 'utf8').digest('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 16)
        } catch (_) { v2 = Math.random().toString(36).slice(2, 18) }
        try { fs.writeFileSync(p2, v2, 'utf-8') } catch (_) {}
      }
      process.env.CHAT_ADMIN_PASSWORD = v2
    }
  } catch (_) {}
}

function base64UrlDecode(input) {
  const s = String(input || '').replace(/-/g, '+').replace(/_/g, '/')
  const pad = s.length % 4 === 2 ? '==' : s.length % 4 === 3 ? '=' : ''
  return Buffer.from(s + pad, 'base64').toString('utf-8')
}

function normalizeBearerToken(token) {
  if (!token || typeof token !== 'string') return ''
  const t = token.trim()
  if (t.toLowerCase().startsWith('bearer ')) return t.slice(7).trim()
  return t
}

function withInsecureTls(fn) {
  const prev = process.env.NODE_TLS_REJECT_UNAUTHORIZED
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  const end = () => {
    if (prev === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = prev
  }
  try {
    const p = fn()
    if (p && typeof p.finally === 'function') return p.finally(end)
    end()
    return p
  } catch (e) {
    end()
    throw e
  }
}

async function fetchWithAuth(url, token, timeoutMs = 2500) {
  const ctrl = new AbortController()
  const id = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { method: 'GET', headers: { Authorization: `Bearer ${token}` }, signal: ctrl.signal })
    let body = null
    try { body = await res.json() } catch (_) {}
    return { status: res.status, ok: res.ok, body }
  } finally {
    clearTimeout(id)
  }
}

async function fetchWithAnyAuth(url, token, timeoutMs = 2500) {
  const t = normalizeBearerToken(token)
  const headersList = [
    { Authorization: `Bearer ${t}` },
    { Authorization: t },
    { 'X-Auth-Token': t },
    { 'X-Token': t },
    { 'X-Api-Key': t },
    { 'Api-Key': t },
    { apikey: t }
  ]
  for (const h of headersList) {
    const ctrl = new AbortController()
    const id = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await fetch(url, { method: 'GET', headers: h, signal: ctrl.signal })
      let body = null
      try { body = await res.json() } catch (_) {}
      return { status: res.status, ok: res.ok, body }
    } catch (_) {
    } finally {
      clearTimeout(id)
    }
  }
  return { ok: false, status: 0 }
}

async function fetchSimple(url, timeoutMs = 1000) {
  const ctrl = new AbortController()
  const id = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { method: 'GET', signal: ctrl.signal })
    let body = null
    try { body = await res.text() } catch (_) {}
    return { status: res.status, ok: res.ok, body }
  } finally {
    clearTimeout(id)
  }
}

async function verifyTokenAccess(endpoint, token) {
  const t = normalizeBearerToken(token)
  if (!t) return { ok: false, error: 'empty-token' }
  if (endpoint && typeof endpoint === 'string' && endpoint.trim()) {
    try {
      const url = endpoint.trim()
      const r = await fetchWithAuth(url, t)
      if (r.ok) return { ok: true, status: r.status, body: r.body || null }
      return { ok: false, status: r.status, body: r.body || null }
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) }
    }
  }
  try {
    const parts = t.split('.')
    if (parts.length < 2) return { ok: false, error: 'invalid-token' }
    const payloadStr = base64UrlDecode(parts[1])
    const payload = JSON.parse(payloadStr)
    const exp = Number(payload && payload.exp ? payload.exp : 0)
    if (exp && Date.now() / 1000 > exp) return { ok: false, error: 'expired', exp }
    const sub = payload && (payload.sub || payload.user || payload.uid || '')
    return { ok: true, exp, sub }
  } catch (_) {
    return { ok: true }
  }
}

async function fetchWithPreferredAuth(url, token, timeoutMs = 2500) {
  const t = normalizeBearerToken(token)
  const headerName = (process.env.INDIGO_AUTH_HEADER || 'Authorization').trim()
  const scheme = (process.env.INDIGO_AUTH_SCHEME || 'Bearer').trim()
  const headers = {}
  if (headerName) {
    if (headerName.toLowerCase() === 'authorization' && scheme) headers[headerName] = `${scheme} ${t}`
    else headers[headerName] = t
  }
  const ctrl = new AbortController()
  const id = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { method: 'GET', headers, signal: ctrl.signal })
    let body = null
    try { body = await res.json() } catch (_) {}
    return { status: res.status, ok: res.ok, body }
  } finally {
    clearTimeout(id)
  }
}

async function getWithHeaderOrQuery(base, pathPart, token, timeoutMs = 2000) {
  const url = base + pathPart
  const queryParam = (process.env.INDIGO_QUERY_TOKEN_PARAM || '').trim()
  async function asQuery() {
    const sep = pathPart.includes('?') ? '&' : '?'
    const u = base + pathPart + sep + (queryParam || 'token') + '=' + encodeURIComponent(normalizeBearerToken(token))
    let r = await fetchSimple(u, timeoutMs).catch(() => ({ ok: false, status: 0 }))
    if (!r || r.status === 0) {
      try { r = await withInsecureTls(() => fetchSimple(u, timeoutMs).catch(() => ({ ok: false, status: 0 }))) } catch (_) {}
    }
    return r
  }
  async function asHeader() {
    let pref = await fetchWithPreferredAuth(url, token, timeoutMs).catch(() => ({ ok: false, status: 0 }))
    if (!pref || pref.status === 0) {
      try { pref = await withInsecureTls(() => fetchWithPreferredAuth(url, token, timeoutMs).catch(() => ({ ok: false, status: 0 }))) } catch (_) {}
    }
    if (pref && (pref.ok || (pref.status && pref.status !== 0 && pref.status !== 404))) return pref
    let any = await fetchWithAnyAuth(url, token, timeoutMs).catch(() => ({ ok: false, status: 0 }))
    if (!any || any.status === 0) {
      try { any = await withInsecureTls(() => fetchWithAnyAuth(url, token, timeoutMs).catch(() => ({ ok: false, status: 0 }))) } catch (_) {}
    }
    return any
  }
  if (queryParam) {
    const r = await asQuery()
    if (r && (r.ok || (r.status && r.status !== 0 && r.status !== 404))) return r
    return await asHeader()
  } else {
    const r = await asHeader()
    if (r && r.ok) return r
    if (r && (r.status === 401 || r.status === 403 || r.status === 404 || r.status === 0)) {
      const q = await asQuery()
      if (q && (q.ok || (q.status && q.status !== 0))) return q
    }
    return r
  }
}

// Indigo support removed
async function tryProbeIndigo(port) {
  const base = `http://127.0.0.1:${port}`
  const authPaths = ['/api/v1/me', '/api/v1/user', '/api/user', '/me', '/api/v1/profile', '/api/profile', '/profile', '/api/account', '/account']
  for (const p of authPaths) {
    try {
      const r = await fetchSimple(base + p, 900)
      if (r && (r.status === 401 || r.status === 403)) return { ok: true, base, path: p, status: r.status, authRequired: true }
      if (r && (r.ok || (r.status >= 200 && r.status < 500))) return { ok: true, base, path: p, status: r.status }
    } catch (_) {}
  }
  const pingPaths = ['/api/v1/ping', '/api/ping', '/ping', '/api/v1/version', '/api/version', '/version', '/status', '/health', '/api/health', '/']
  for (const p of pingPaths) {
    try {
      const r = await fetchSimple(base + p, 900)
      if (r && (r.ok || (r.status >= 200 && r.status < 500))) return { ok: true, base, path: p, status: r.status }
    } catch (_) {}
  }
  return { ok: false }
}

async function detectApiPrefix(base, token) {
  const candidates = ['/api/v2/version', '/api/v1/version']
  for (const p of candidates) {
    try {
      const r = await getWithHeaderOrQuery(base, p, token, 1500)
      if (r && (r.ok || (r.status >= 200 && r.status < 300))) return p.startsWith('/api/v2') ? '/api/v2' : '/api/v1'
    } catch (_) {}
  }
  return '/api/v2'
}

async function tryAuthEndpoints(base, prefix, token) {
  const suffixes = ['/profile', '/profiles', '/group', '/groups', '/folder', '/folders', '/team/groups', '/version']
  for (const s of suffixes) {
    const p = `${prefix}${s}`
    try {
      const r = await getWithHeaderOrQuery(base, p, token, 2000)
      if (r && r.ok) return { ok: true, path: p, status: r.status }
      if (r && (r.status === 401 || r.status === 403)) return { ok: false, path: p, status: r.status }
    } catch (_) {}
  }
  return { ok: false }
}

async function discoverIndigoPort() {
  const seen = new Set()
  const add = (n) => { const x = Number(n); if (Number.isFinite(x) && x > 0 && x < 65536 && !seen.has(x)) { seen.add(x) } }
  const envPort = Number(process.env.INDIGO_PORT || 0)
  if (envPort) add(envPort)
  add(21168)
  for (let d = -8; d <= 8; d += 1) add(21168 + d)
  for (let p = 21100; p <= 21250; p += 1) add(p)
  for (let p = 20000; p <= 24000; p += 1) add(p)
  try {
    const home = os.homedir()
    const candidates = [
      path.join(home, '.indigobrowser', 'app.properties'),
      path.join(home, '.IndigoBrowser', 'app.properties'),
      path.join(home, '.indigo', 'app.properties'),
      path.join(home, 'AppData', 'Roaming', 'IndigoBrowser', 'app.properties'),
      path.join(home, 'AppData', 'Roaming', 'Indigo', 'app.properties'),
      path.join(home, 'AppData', 'Roaming', 'IndigoBrowser', 'config.json'),
      path.join(home, 'AppData', 'Roaming', 'Indigo', 'config.json')
    ]
    for (const fp of candidates) {
      try {
        const txt = await fs.promises.readFile(fp, 'utf-8')
        const m1 = txt.match(/(^|\n)\s*multiloginapp\.port\s*[=:]\s*(\d+)/i)
        if (m1 && m1[2]) add(Number(m1[2]))
        const m2 = txt.match(/(^|\n)\s*indigo.*port\s*[=:]\s*(\d+)/i)
        if (m2 && m2[2]) add(Number(m2[2]))
        const m3 = txt.match(/(^|\n)\s*port\s*[=:]\s*(\d+)/i)
        if (m3 && m3[2]) add(Number(m3[2]))
        try { const obj = JSON.parse(txt); const pv = obj && (obj.port || obj.apiPort || obj.serverPort); if (pv) add(Number(pv)) } catch (_) {}
      } catch (_) {}
    }
    const logRoots = [
      path.join(home, 'AppData', 'Roaming'),
      path.join(home, 'AppData', 'Local')
    ]
    for (const root of logRoots) {
      try {
        const dirs = await fs.promises.readdir(root, { withFileTypes: true })
        for (const d of dirs) {
          if (!d.isDirectory()) continue
          const name = d.name.toLowerCase()
          if (!name.includes('indigo')) continue
          const dir = path.join(root, d.name)
          const sub = await fs.promises.readdir(dir, { withFileTypes: true }).catch(() => [])
          for (const s of sub) {
            if (!s.isDirectory() && !/log/i.test(s.name)) continue
            const logDir = s.isDirectory() ? path.join(dir, s.name) : dir
            const files = await fs.promises.readdir(logDir).catch(() => [])
            for (const fn of files) {
              if (!/log|txt|out|json/i.test(fn)) continue
              const p = path.join(logDir, fn)
              try {
                const stat = await fs.promises.stat(p)
                if (!stat.isFile()) continue
                if (Date.now() - stat.mtimeMs > 1000 * 60 * 60 * 24 * 7) continue
                const buf = await fs.promises.readFile(p, 'utf-8')
                const m = buf.match(/port[^\d]{0,10}(\d{3,6})/i)
                if (m && m[1]) add(Number(m[1]))
              } catch (_) {}
            }
          }
        }
      } catch (_) {}
    }
  } catch (_) {}
  let sawIndigoProcess = false
  try {
    await new Promise((resolve) => {
      exec('netstat -ano -p tcp', { windowsHide: true }, (err, stdout) => {
        const portsWithPid = []
        if (stdout) {
          const lines = String(stdout).split(/\r?\n/)
          for (const ln of lines) {
            if (!/LISTENING/i.test(ln)) continue
            const mPort = ln.match(/\s(?:0\.0\.0\.0|127\.0\.0\.1|\[::\]|\[::1\]):(\d+)/)
            const mPid = ln.match(/\s(\d+)\s*$/)
            if (mPort && mPort[1]) {
              const prt = Number(mPort[1])
              const pid = mPid ? Number(mPid[1]) : 0
              portsWithPid.push({ prt, pid })
              add(prt)
            }
          }
        }
        try {
          exec('tasklist /FO CSV /NH', { windowsHide: true }, (_e2, out2) => {
            if (out2) {
              const map = new Map()
              const rows = String(out2).split(/\r?\n/).filter(Boolean)
              for (const row of rows) {
                const parts = row.split(',').map(s => s.replace(/^"|"$/g, ''))
                const name = parts[0] || ''
                const pid = Number(parts[1] || 0)
                if (pid) map.set(pid, name)
              }
              for (const it of portsWithPid) {
                const name = (map.get(it.pid) || '').toLowerCase()
                if (name.includes('indigo')) { add(it.prt); sawIndigoProcess = true }
              }
              for (const name of map.values()) {
                const low = String(name || '').toLowerCase()
                if (low.includes('indigo')) { sawIndigoProcess = true; break }
              }
            }
            resolve()
          })
        } catch (_) { resolve() }
      })
    })
  } catch (_) {}
  const candidates = Array.from(seen)
  let found = null
  let idx = 0
  const limit = Math.min(16, Math.max(4, Math.floor(candidates.length / 8)))
  async function worker() {
    while (!found && idx < candidates.length) {
      const i = idx
      idx += 1
      const port = candidates[i]
      const r = await tryProbeIndigo(port)
      if (r && r.ok) {
        found = { ok: true, port, base: r.base, status: r.status, path: r.path, running: true }
        break
      }
    }
  }
  const workers = new Array(limit).fill(0).map(() => worker())
  await Promise.all(workers)
  return found || { ok: false, running: !!sawIndigoProcess }
}

function resolveHtmlPath() {
  const devUrl = process.env.VITE_DEV_SERVER_URL
  if (devUrl) return devUrl
  return 'file://' + path.join(__dirname, '..', 'dist', 'index.html').replace(/\\/g, '/')
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1024,
    minHeight: 700,
    title: 'PhotoUnikalizer',
    backgroundColor: '#0b1020',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false
    }
  })
  const url = resolveHtmlPath()
  if (url.startsWith('http')) mainWindow.loadURL(url)
  else mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
}

function collectOsOpenFiles() {
  const items = []
  try {
    const args = (process.argv || []).slice(1)
    for (const a of args) {
      const s = String(a || '')
      if (!s || s.startsWith('--')) continue
      try { if (fs.existsSync(s)) items.push(s) } catch (_) {}
    }
  } catch (_) {}
  return items
}

function setAppMenu() {
  const template = [
    {
      label: 'Developer',
      submenu: [
        {
          label: 'Toggle Developer Tools',
          accelerator: 'Ctrl+Shift+I',
          click: () => {
            if (!devUnlocked) { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('dev-admin-request-unlock'); return }
            const w = BrowserWindow.getFocusedWindow() || mainWindow
            if (w && !w.isDestroyed()) w.webContents.toggleDevTools()
          }
        },
        { role: 'reload' },
        { type: 'separator' },
        {
          label: 'Toggle Admin Panel',
          accelerator: 'Ctrl+Shift+D',
          click: () => {
            if (!devUnlocked) { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('dev-admin-request-unlock'); return }
            if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('dev-admin-toggle')
          }
        }
      ]
    }
  ]
  try { Menu.setApplicationMenu(Menu.buildFromTemplate(template)) } catch (_) {}
}

function initAutoUpdater() {
  if (didInitUpdater) return
  didInitUpdater = true
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', info => {
    lastUpdateInfo = info
    fallbackUpdateInfo = null
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-available', info)
  })
  autoUpdater.on('update-not-available', info => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-not-available', info)
  })
  autoUpdater.on('error', err => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-error', String(err && err.message ? err.message : err))
  })
  autoUpdater.on('download-progress', p => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-download-progress', {
      percent: p.percent,
      bytesPerSecond: p.bytesPerSecond,
      transferred: p.transferred,
      total: p.total,
      online: true
    })
  })
  autoUpdater.on('update-downloaded', info => {
    lastUpdateInfo = info || lastUpdateInfo
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-downloaded', info)
  })
}

function compareVersions(a, b) {
  try {
    const na = String(a || '').replace(/^v/i, '').split('.').map(x => parseInt(x, 10) || 0)
    const nb = String(b || '').replace(/^v/i, '').split('.').map(x => parseInt(x, 10) || 0)
    const len = Math.max(na.length, nb.length)
    for (let i = 0; i < len; i += 1) {
      const va = na[i] || 0
      const vb = nb[i] || 0
      if (va > vb) return 1
      if (va < vb) return -1
    }
    return 0
  } catch (_) { return 0 }
}

async function checkGithubForUpdate() {
  try {
    const ownerRepo = 'YALOKGARua/PhotoUnikalizer'
    const latest = await fetchJson(`https://api.github.com/repos/${ownerRepo}/releases/latest`, 8000).catch(() => null)
    if (!latest || !latest.tag_name) return null
    const current = app.getVersion()
    const tag = String(latest.tag_name).replace(/^v/i, '')
    if (compareVersions(tag, current) <= 0) return null
    const assets = Array.isArray(latest.assets) ? latest.assets : []
    let setup = assets.find(a => /Setup-\d+\.\d+\.\d+\.exe$/i.test(a.name || ''))
    if (!setup) setup = assets.find(a => /Portable-\d+\.\d+\.\d+\.exe$/i.test(a.name || ''))
    const info = {
      version: tag,
      tag: latest.tag_name,
      releaseNotes: latest.body || latest.name || '',
      url: setup ? setup.browser_download_url : ''
    }
    return info
  } catch (_) { return null }
}

function downloadFile(url, target, onProgress) {
  return new Promise((resolve, reject) => {
    try {
      const file = fs.createWriteStream(target)
      let received = 0
      let total = 0
      https.get(url, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirect = res.headers.location
          res.destroy()
          downloadFile(redirect, target, onProgress).then(resolve).catch(reject)
          return
        }
        if (res.statusCode !== 200) { file.close(); fs.unlink(target, () => {}); reject(new Error('http ' + res.statusCode)); return }
        total = Number(res.headers['content-length'] || 0)
        res.on('data', chunk => {
          received += chunk.length
          if (typeof onProgress === 'function') onProgress({ transferred: received, total, bytesPerSecond: 0, percent: total ? (received / total) * 100 : 0 })
        })
        res.pipe(file)
        file.on('finish', () => { file.close(() => resolve({ path: target, total })); })
      }).on('error', err => { try { file.close() } catch (_) {}; fs.unlink(target, () => {}); reject(err) })
    } catch (e) { reject(e) }
  })
}

function toDateString(d) {
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}:${pad(d.getMonth() + 1)}:${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function sanitizeName(name) {
  return String(name || '').replace(/[\\/:*?"<>|]/g, '_').trim()
}

function nameFromTemplate(template, info) {
  const tokens = {
    '{name}': info.baseName,
    '{index}': String(info.index + 1),
    '{ext}': info.ext,
    '{date}': info.dateStr,
    '{uuid}': info.uuid,
    '{rand}': info.rand
  }
  let out = String(template || '').trim()
  Object.entries(tokens).forEach(([k, v]) => { out = out.split(k).join(v) })
  out = sanitizeName(out)
  const hasExt = /\.[^.]+$/.test(out)
  if (!hasExt) out = out ? `${out}.${info.ext}` : ''
  if (!out) out = `${sanitizeName(info.baseName) || 'file'}_${info.index + 1}.${info.ext}`
  return out
}

async function fetchJson(url, timeoutMs = 6000) {
  const ctrl = new AbortController()
  const id = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error('http ' + res.status)
    return await res.json()
  } finally {
    clearTimeout(id)
  }
}

async function getOnlineDefaults() {
  try {
    const [deviceP, addrP, userP] = await Promise.allSettled([
      fetchJson('https://random-data-api.com/api/v2/devices'),
      fetchJson('https://random-data-api.com/api/v2/addresses'),
      fetchJson('https://randomuser.me/api/')
    ])
    const out = {}
    if (deviceP.status === 'fulfilled' && deviceP.value) {
      out.make = deviceP.value.manufacturer || deviceP.value.brand || 'Generic'
      out.model = deviceP.value.model || (deviceP.value.device || 'Model')
      out.lens = deviceP.value.device || 'Lens'
      out.software = deviceP.value.platform || 'Firmware'
    }
    if (addrP.status === 'fulfilled' && addrP.value) {
      out.lat = Number(addrP.value.latitude)
      out.lon = Number(addrP.value.longitude)
      out.city = addrP.value.city
      out.state = addrP.value.state
      out.country = addrP.value.country
    }
    if (userP.status === 'fulfilled' && userP.value && userP.value.results && userP.value.results[0]) {
      const u = userP.value.results[0]
      out.author = `${u.name.first} ${u.name.last}`
      out.contact = out.author
      out.email = u.email
      out.url = `https://${u.login.username}.example.com`
      out.owner = out.author
      out.creatorTool = 'PhotoUnikalizer'
    }
    return out
  } catch (_) {
    return null
  }
}

async function attemptWriteWithElevation(tempFile, targetFile) {
  try {
    await fs.promises.mkdir(path.dirname(targetFile), { recursive: true })
    try { await fs.promises.rename(tempFile, targetFile); return true } catch (_) {}
    try {
      const data = await fs.promises.readFile(tempFile)
      await fs.promises.writeFile(targetFile, data)
      try { await fs.promises.unlink(tempFile) } catch (_) {}
      return true
    } catch (_) {}
    const elev = path.join(process.resourcesPath || '', 'elevate.exe')
    if (fs.existsSync(elev)) {
      const cmd = `cmd /c copy /Y "${tempFile}" "${targetFile}"`
      await new Promise((resolve) => {
        try {
          const p = spawn(elev, cmd.split(' '), { windowsVerbatimArguments: true, detached: true, stdio: 'ignore' })
          p.on('exit', () => resolve())
          p.unref()
        } catch (_) { resolve() }
      })
      try { const st = await fs.promises.stat(targetFile); if (st && st.isFile() && st.size > 0) { try { await fs.promises.unlink(tempFile) } catch (_) {}; return true } } catch (_) {}
    }
  } catch (_) {}
  return false
}

async function processOne(inputPath, index, total, options, progressContext) {
  const srcBase = path.basename(inputPath)
  const baseName = srcBase.replace(/\.[^.]+$/, '')
  const ext = options.format === 'jpg' ? 'jpg' : options.format
  const dateStr = toDateString(new Date())
  const uuid = randomUUID()
  const rand = Math.random().toString(36).slice(2, 8)
  const fileName = nameFromTemplate(options.naming, { baseName, index, ext, dateStr, uuid, rand })
  let outPath = path.join(options.outputDir, fileName)
  const startedAtFile = Date.now()
  let lastStepAt = startedAtFile
  function emitStep(step, extra = {}) {
    try {
      const now = Date.now()
      const ms = now - lastStepAt
      lastStepAt = now
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('process-step', { file: srcBase, step, ms, t: now, index, total, extra })
    } catch (_) {}
  }

  const meta = await sharp(inputPath).metadata()
  emitStep('metadata_read', { width: meta.width || 0, height: meta.height || 0, hasAlpha: !!meta.hasAlpha, channels: meta.channels || 0 })
  const width = meta.width || undefined
  const scale = options.resizeDrift > 0 ? 1 + (Math.random() * 2 - 1) * (options.resizeDrift / 100) : 1
  let targetWidth = width ? Math.max(1, Math.round(width * scale)) : undefined
  if (typeof options.resizeMaxW === 'number' && options.resizeMaxW > 0 && width) {
    targetWidth = Math.min(targetWidth || width, options.resizeMaxW)
  }

  let pipeline = sharp(inputPath, { failOn: 'none' })
  pipeline = pipeline.withMetadata(false)
  try { pipeline = pipeline.toColourspace('srgb') } catch (_) {}
  if (targetWidth) pipeline = pipeline.resize({ width: targetWidth, withoutEnlargement: true, fit: 'inside' })
  emitStep('pipeline_prepared', { targetWidth: targetWidth || 0 })

  if (options.format === 'jpg' && (meta.hasAlpha || meta.channels === 4)) {
    pipeline = pipeline.flatten({ background: '#ffffff' })
  }

  if (options.colorDrift > 0) {
    const amount = options.colorDrift / 100
    const brightness = 1 + (Math.random() * 2 - 1) * amount
    const saturation = 1 + (Math.random() * 2 - 1) * amount
    const hue = Math.round((Math.random() * 2 - 1) * 10)
    pipeline = pipeline.modulate({ brightness, saturation, hue })
  }

  if (options.gray) pipeline = pipeline.grayscale()
  if (options.normalize) pipeline = pipeline.normalize()

  if (options.format === 'jpg') pipeline = pipeline.jpeg({ quality: options.quality, mozjpeg: true, progressive: true })
  else if (options.format === 'png') {
    const level = Math.max(0, Math.min(9, Math.round((100 - options.quality) / 10)))
    pipeline = pipeline.png({ compressionLevel: level, palette: true })
  } else if (options.format === 'webp') pipeline = pipeline.webp({ quality: options.quality, effort: 6 })
  else if (options.format === 'avif') pipeline = pipeline.avif({ quality: options.quality, effort: 6 })

  await fs.promises.mkdir(options.outputDir, { recursive: true })
  if (!/\.[^.]+$/.test(outPath)) outPath = outPath + '.' + ext
  const statDir = await fs.promises.stat(options.outputDir).catch(() => null)
  if (!statDir || !statDir.isDirectory()) throw new Error('Output directory is not accessible')
  try {
    await pipeline.toFile(outPath)
  } catch (e) {
    let permission = false
    const msg = String(e && e.message ? e.message : e).toLowerCase()
    if ((e && (e.code === 'EACCES' || e.code === 'EPERM')) || msg.includes('access') || msg.includes('permission') || msg.includes('open for write')) permission = true
    if (!permission) throw e
    const tmpDir = app.getPath('temp')
    const tmp = path.join(tmpDir, `pu_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`)
    const buf = await pipeline.toBuffer()
    await fs.promises.writeFile(tmp, buf)
    const ok = await attemptWriteWithElevation(tmp, outPath)
    if (!ok) throw e
  }
  emitStep('file_written', { outPath })

  const online = options.onlineDefaults || {}
  const tags = {}
  if (options.meta.author || online.author) tags.Artist = options.meta.author || online.author
  if (options.meta.description) tags.ImageDescription = options.meta.description
  if (options.meta.copyright) tags.Copyright = options.meta.copyright
  if (options.meta.keywords && Array.isArray(options.meta.keywords) && options.meta.keywords.length) tags.Keywords = options.meta.keywords
  if (options.meta.contactName || online.contact) tags.Contact = options.meta.contactName || online.contact
  if (options.meta.contactEmail || online.email) tags.Email = options.meta.contactEmail || online.email
  if (options.meta.website || online.url) tags.URL = options.meta.website || online.url
  if (options.meta.owner || online.owner) tags.OwnerName = options.meta.owner || online.owner
  if (options.meta.creatorTool || online.creatorTool) tags.CreatorTool = options.meta.creatorTool || online.creatorTool
  if (options.meta.removeGps) {
    tags.GPSLatitude = null
    tags.GPSLongitude = null
    tags.GPSAltitude = null
    tags.GPSPosition = null
    tags.GPSDateStamp = null
    tags.GPSTimeStamp = null
  }
  if (options.meta.dateStrategy === 'now') tags.AllDates = toDateString(new Date())
  if (options.meta.dateStrategy === 'offset') {
    const ms = Number(options.meta.dateOffsetMinutes || 0) * 60 * 1000
    tags.AllDates = toDateString(new Date(Date.now() + ms))
  }
  if (options.meta.uniqueId) tags.ImageUniqueID = randomUUID()
  if (options.meta.softwareTag !== false) tags.Software = 'PhotoUnikalizer'

  if (options.meta && options.meta.fake === true) {
    const seed = options.meta.fakePerFile ? randomUUID() : 'static'
    const strHash = s => {
      let h = 0
      for (let i = 0; i < s.length; i += 1) h = Math.imul(31, h) + s.charCodeAt(i) | 0
      return Math.abs(h)
    }
    const suffix = strHash(seed + baseName + index).toString(36)
    const profiles = {
      camera: { make: 'Canon', model: 'EOS 5D Mark IV', lens: 'EF 24-70mm f/2.8L II USM' },
      phone: { make: 'Xiaomi', model: 'Mi 11', lens: 'Wide 26mm f/1.9' },
      action: { make: 'GoPro', model: 'HERO 11', lens: 'UltraWide' },
      drone: { make: 'DJI', model: 'Mavic 3', lens: '24mm f/2.8' },
      scanner: { make: 'Epson', model: 'Perfection V600', lens: 'CCD' }
    }
    const prof = profiles[options.meta.fakeProfile] || profiles.camera
    if (options.meta.fakeAuto) {
      const baseMake = online.make || prof.make
      const baseModel = online.model || prof.model
      const baseLens = online.lens || prof.lens
      tags.Make = `${baseMake}-${suffix}`
      tags.Model = `${baseModel}-${suffix}`
      tags.LensModel = `${baseLens}-${suffix}`
      tags.BodySerialNumber = `SN-${suffix}`
      tags.ExposureTime = '1/200'
      tags.FNumber = 2.8
      tags.ISO = 200
      tags.FocalLength = 35
      tags.ExposureProgram = 3
      tags.MeteringMode = 5
      tags.Flash = 16
      tags.WhiteBalance = 0
      tags.ColorSpace = 'sRGB'
      tags.Rating = 5
      tags.Label = 'verified'
      tags.ObjectName = 'Title ' + suffix
      tags.City = online.city || 'City'
      tags.State = online.state || 'Region'
      tags.Country = online.country || 'Country'
    }
    if (options.meta.fakeMake || options.meta.fakeModel) {
      if (options.meta.fakeMake) tags.Make = `${options.meta.fakeMake}-${suffix}`
      if (options.meta.fakeModel) tags.Model = `${options.meta.fakeModel}-${suffix}`
    }
    if (options.meta.fakeLens) tags.LensModel = `${options.meta.fakeLens}-${suffix}`
    if (options.meta.fakeSoftware) tags.Software = `${options.meta.fakeSoftware}-${suffix}`
    if (options.meta.fakeSerial) tags.BodySerialNumber = `${options.meta.fakeSerial}-${suffix}`
    if (options.meta.fakeGps) {
      const lat = typeof options.meta.fakeLat === 'number' ? options.meta.fakeLat : (Number.isFinite(online.lat) ? online.lat : (Math.random() * 180 - 90))
      const lon = typeof options.meta.fakeLon === 'number' ? options.meta.fakeLon : (Number.isFinite(online.lon) ? online.lon : (Math.random() * 360 - 180))
      const alt = typeof options.meta.fakeAltitude === 'number' ? options.meta.fakeAltitude : Math.round(Math.random() * 3000)
      tags.GPSLatitude = lat
      tags.GPSLongitude = lon
      tags.GPSAltitude = alt
    }
    if (typeof options.meta.fakeIso === 'number') tags.ISO = options.meta.fakeIso
    if (options.meta.fakeExposureTime) tags.ExposureTime = options.meta.fakeExposureTime
    if (typeof options.meta.fakeFNumber === 'number') tags.FNumber = options.meta.fakeFNumber
    if (typeof options.meta.fakeFocalLength === 'number') tags.FocalLength = options.meta.fakeFocalLength
    if (typeof options.meta.fakeExposureProgram === 'number') tags.ExposureProgram = options.meta.fakeExposureProgram
    if (typeof options.meta.fakeMeteringMode === 'number') tags.MeteringMode = options.meta.fakeMeteringMode
    if (typeof options.meta.fakeFlash === 'number') tags.Flash = options.meta.fakeFlash
    if (typeof options.meta.fakeWhiteBalance === 'number') tags.WhiteBalance = options.meta.fakeWhiteBalance
    if (options.meta.fakeColorSpace) tags.ColorSpace = options.meta.fakeColorSpace
    if (typeof options.meta.fakeRating === 'number') tags.Rating = options.meta.fakeRating
    if (options.meta.fakeLabel) tags.Label = options.meta.fakeLabel
    if (options.meta.fakeTitle) tags.ObjectName = options.meta.fakeTitle
    if (options.meta.fakeCity) tags.City = options.meta.fakeCity
    if (options.meta.fakeState) tags.State = options.meta.fakeState
    if (options.meta.fakeCountry) tags.Country = options.meta.fakeCountry
  }

  if (options.meta && options.meta.removeAll) {
    try { const nat = loadNative(); if (nat && typeof nat.stripMetadata==='function') nat.stripMetadata(outPath) } catch (_) {}
  }
  if (!options.meta || options.meta.removeAll !== true) {
    try {
      const meta = {
        artist: tags.Artist || '',
        description: tags.ImageDescription || '',
        copyright: tags.Copyright || '',
        keywords: tags.Keywords || [],
        contact: tags.Contact || '',
        email: tags.Email || '',
        url: tags.URL || '',
        owner: tags.OwnerName || '',
        creatorTool: tags.CreatorTool || '',
        title: tags.ObjectName || '',
        label: tags.Label || '',
        rating: typeof tags.Rating === 'number' ? tags.Rating : -1,
        make: tags.Make || '',
        model: tags.Model || '',
        lensModel: tags.LensModel || '',
        bodySerial: tags.BodySerialNumber || '',
        exposureTime: tags.ExposureTime || '',
        fNumber: typeof tags.FNumber === 'number' ? tags.FNumber : -1,
        iso: typeof tags.ISO === 'number' ? tags.ISO : -1,
        focalLength: typeof tags.FocalLength === 'number' ? tags.FocalLength : -1,
        exposureProgram: typeof tags.ExposureProgram === 'number' ? tags.ExposureProgram : -1,
        meteringMode: typeof tags.MeteringMode === 'number' ? tags.MeteringMode : -1,
        flash: typeof tags.Flash === 'number' ? tags.Flash : -1,
        whiteBalance: typeof tags.WhiteBalance === 'number' ? tags.WhiteBalance : -1,
        colorSpace: tags.ColorSpace || '',
        gps: (typeof tags.GPSLatitude === 'number' && typeof tags.GPSLongitude === 'number') ? { lat: tags.GPSLatitude, lon: tags.GPSLongitude, alt: typeof tags.GPSAltitude==='number'?tags.GPSAltitude:0 } : undefined,
        city: tags.City || '',
        state: tags.State || '',
        country: tags.Country || '',
        dateCreated: tags.AllDates || ''
      }
      const nat = loadNative(); if (nat && typeof nat.writeMetadata==='function') nat.writeMetadata(outPath, meta)
      emitStep('metadata_written')
    } catch (_) {}
  }

  try {
    const inBytes = options && options.sizesByPath ? Number(options.sizesByPath[inputPath]) || 0 : 0
    let outBytes = 0
    try { const st = await fs.promises.stat(outPath); outBytes = Number(st.size) || 0 } catch (_) {}
    emitStep('sizes', { inBytes, outBytes })
  } catch (_) {}

  if (progressContext && typeof progressContext.onFileDone === 'function') {
    try { progressContext.onFileDone(inputPath) } catch (_) {}
  }
  if (progressContext && typeof progressContext.emitProgress === 'function') {
    try { progressContext.emitProgress(index + 1, total, srcBase, outPath) } catch (_) {}
  } else if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('process-progress', { index, total, file: srcBase, status: 'ok', outPath })
  }
  emitStep('file_done', { totalMs: Date.now() - startedAtFile })
}

async function processBatch(inputFiles, options) {
  cancelRequested = false
  const thisBatchId = ++currentBatchId
  const total = inputFiles.length
  const cpuBased = Math.max(1, Math.min(4, (os.cpus() || []).length - 1 || 1))
  const concurrency = Math.max(1, Math.min(Number(options.maxConcurrency || cpuBased), 8))
  const sizesByPath = (options && options.sizesByPath) || {}
  const totalBytes = Number(options && options.totalBytes) || inputFiles.reduce((acc, p) => acc + (Number(sizesByPath[p]) || 0), 0)
  const startedAt = Date.now()
  let processedBytes = 0
  let completed = 0
  function calcProgress() {
    const elapsedMs = Math.max(1, Date.now() - startedAt)
    const speedBps = processedBytes * 1000 / elapsedMs
    const remainBytes = Math.max(0, totalBytes - processedBytes)
    const etaMs = speedBps > 0 ? Math.round(remainBytes / speedBps * 1000) : 0
    const percent = totalBytes > 0 ? (processedBytes / totalBytes) * 100 : (completed / Math.max(1, total)) * 100
    return { speedBps, etaMs, percent }
  }
  const progressContext = {
    onFileDone: (p) => { processedBytes += Number(sizesByPath[p]) || 0; completed += 1 },
    emitProgress: (idx, tot, fileName, outPath) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        const prog = calcProgress()
        mainWindow.webContents.send('process-progress', { index: idx - 1, total: tot, file: fileName, status: 'ok', speedBps: prog.speedBps, etaMs: prog.etaMs, percent: prog.percent, outPath })
      }
    }
  }
  let nextIndex = 0
  async function worker() {
    while (true) {
      if (cancelRequested || thisBatchId !== currentBatchId) return
      const i = nextIndex
      if (i >= total) return
      nextIndex += 1
      const p = inputFiles[i]
      try {
        await processOne(p, i, total, options, progressContext)
      } catch (e) {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('process-progress', { index: i, total, file: path.basename(p), status: 'error', message: String(e && e.message ? e.message : e) })
        }
      }
    }
  }
  const workers = new Array(concurrency).fill(0).map(() => worker())
  await Promise.all(workers)
  if (thisBatchId === currentBatchId) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('process-complete', { canceled: cancelRequested })
      try {
        new Notification({ title: 'PhotoUnikalizer', body: cancelRequested ? 'Обработка отменена' : 'Обработка завершена' }).show()
      } catch (_) {}
    }
  }
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.yalokgar.photounikalizer')
  if (!app.requestSingleInstanceLock()) {
    app.quit()
    return
  } else {
    app.on('second-instance', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.focus()
      }
    })
  }
  createWindow()
  setAppMenu()
  loadAppPasswordSecret()
  initAutoUpdater()
  try {
    const ses = session.defaultSession
    if (ses && ses.webRequest) {
      ses.webRequest.onHeadersReceived((details, callback) => {
        const responseHeaders = Object.assign({}, details.responseHeaders)
        responseHeaders['Cross-Origin-Opener-Policy'] = ['same-origin']
        responseHeaders['Cross-Origin-Embedder-Policy'] = ['require-corp']
        responseHeaders['Cross-Origin-Resource-Policy'] = ['cross-origin']
        callback({ responseHeaders })
      })
    }
  } catch (_) {}
  try {
    const hw = Math.max(1, (os.cpus() || []).length - 1)
    try { sharp.concurrency(Math.min(6, Math.max(1, hw))) } catch (_) {}
    try { sharp.cache({ memory: 256, files: 100, items: 512 }) } catch (_) {}
  } catch (_) {}

  try {
    statsCachePath = path.join(app.getPath('userData'), 'file_stats_cache.json')
    try {
      const txt = fs.readFileSync(statsCachePath, 'utf-8')
      statsCache = JSON.parse(txt)
    } catch (_) { statsCache = {} }
  } catch (_) { statsCache = {} }
  try {
    uiStatePath = path.join(app.getPath('userData'), 'ui_state.json')
  } catch (_) { uiStatePath = '' }
  try {
    const initial = collectOsOpenFiles()
    if (initial.length && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.once('did-finish-load', () => {
        try { mainWindow.webContents.send('os-open-files', initial) } catch (_) {}
      })
    }
  } catch (_) {}

  const devUrl = process.env.VITE_DEV_SERVER_URL
  if (!devUrl) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => {})
    }, 1500)
    setInterval(() => {
      try { initAutoUpdater(); autoUpdater.checkForUpdates().catch(()=>{}) } catch (_) {}
    }, 10 * 60 * 1000)
  }

  app.on('second-instance', (_e, argv) => {
    try {
      const extra = []
      for (const a of (argv || []).slice(1)) {
        const ext = path.extname(String(a)).toLowerCase()
        if (['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff'].includes(ext)) extra.push(a)
      }
      if (extra.length && mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.focus()
        mainWindow.webContents.send('os-open-files', extra)
      }
    } catch (_) {}
  })

  ipcMain.handle('select-images', async () => {
    const res = await dialog.showOpenDialog(mainWindow, { properties: ['openFile', 'multiSelections'], filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'tif', 'tiff'] }] })
    if (res.canceled) return []
    return res.filePaths
  })

  async function collectAllowedFromDir(dir) {
    const allowed = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff'])
    async function walk(d) {
      const out = []
      const items = await fs.promises.readdir(d, { withFileTypes: true })
      for (const it of items) {
        const p = path.join(d, it.name)
        if (it.isDirectory()) {
          const nested = await walk(p)
          out.push(...nested)
        } else {
          const ext = path.extname(it.name).toLowerCase()
          if (allowed.has(ext)) out.push(p)
        }
      }
      return out
    }
    return walk(dir)
  }

  async function collectAllowedFromPaths(paths) {
    const out = []
    const stats = await Promise.all(paths.map(p => fs.promises.stat(p).then(s => ({ p, s })).catch(() => null)))
    for (const it of stats) {
      if (!it) continue
      if (it.s.isDirectory()) {
        const nested = await collectAllowedFromDir(it.p)
        out.push(...nested)
      } else {
        const ext = path.extname(it.p).toLowerCase()
        if (['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff'].includes(ext)) out.push(it.p)
      }
    }
    return out
  }

  ipcMain.handle('select-image-dir', async () => {
    const res = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory', 'createDirectory'] })
    if (res.canceled) return []
    const dir = res.filePaths[0]
    try {
      return await collectAllowedFromDir(dir)
    } catch (_) {
      return []
    }
  })

  ipcMain.handle('expand-paths', async (_e, inputs) => {
    try {
      if (!Array.isArray(inputs) || !inputs.length) return []
      return await collectAllowedFromPaths(inputs)
    } catch (_) {
      return []
    }
  })

  ipcMain.handle('select-text-file', async () => {
    try {
      const res = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
          { name: 'Text', extensions: ['txt', 'log'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })
      if (res.canceled || !res.filePaths || !res.filePaths[0]) return { ok: false }
      const filePath = res.filePaths[0]
      const content = await fs.promises.readFile(filePath, 'utf-8')
      return { ok: true, path: filePath, content }
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) }
    }
  })

  ipcMain.handle('read-text-file-by-path', async (_e, filePath) => {
    try {
      if (!filePath || typeof filePath !== 'string') return { ok: false }
      const content = await fs.promises.readFile(filePath, 'utf-8')
      return { ok: true, path: filePath, content }
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) }
    }
  })

  ipcMain.handle('select-output-dir', async () => {
    const res = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory', 'createDirectory'] })
    if (res.canceled) return ''
    return res.filePaths[0]
  })

  ipcMain.handle('process-images', async (e, payload) => {
    const required = payload && Array.isArray(payload.inputFiles) && payload.inputFiles.length > 0 && payload.outputDir
    if (!required) return { ok: false }
    let onlineDefaults = null
    if (payload.meta && payload.meta.fake && payload.meta.onlineAuto) {
      onlineDefaults = await getOnlineDefaults()
    }
    payload.onlineDefaults = onlineDefaults || {}
    try {
      const stats = await Promise.all(payload.inputFiles.map(p => fs.promises.stat(p).then(s => ({ p, s })).catch(() => null)))
      const sizesByPath = {}
      let totalBytes = 0
      for (const it of stats) {
        if (!it || !it.s || !it.s.isFile()) continue
        sizesByPath[it.p] = Number(it.s.size) || 0
        totalBytes += Number(it.s.size) || 0
      }
      payload.sizesByPath = sizesByPath
      payload.totalBytes = totalBytes
    } catch (_) {}
    processBatch(payload.inputFiles, payload)
    return { ok: true }
  })

  ipcMain.handle('ui-state-save', async (_e, payload) => {
    try {
      if (!uiStatePath) return { ok: false }
      const data = JSON.stringify(payload || {}, null, 2)
      await fs.promises.mkdir(path.dirname(uiStatePath), { recursive: true })
      await fs.promises.writeFile(uiStatePath, data, 'utf-8')
      return { ok: true }
    } catch (e) { return { ok: false, error: String(e && e.message ? e.message : e) } }
  })
  ipcMain.handle('ui-state-load', async () => {
    try {
      if (!uiStatePath || !fs.existsSync(uiStatePath)) return { ok: true, data: {} }
      const txt = await fs.promises.readFile(uiStatePath, 'utf-8')
      const data = JSON.parse(txt)
      return { ok: true, data }
    } catch (e) { return { ok: false, data: {} } }
  })

  ipcMain.handle('save-preset', async (_e, payload) => {
    try {
      await fs.promises.mkdir(path.dirname(PRESET_FILE), { recursive: true })
      await fs.promises.writeFile(PRESET_FILE, JSON.stringify(payload || {}, null, 2), 'utf-8')
      return { ok: true }
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) }
    }
  })

  ipcMain.handle('load-preset', async () => {
    try {
      const buf = await fs.promises.readFile(PRESET_FILE, 'utf-8')
      return { ok: true, data: JSON.parse(buf) }
    } catch (e) {
      return { ok: false }
    }
  })

  ipcMain.handle('cancel-process', async () => {
    cancelRequested = true
    return { ok: true }
  })

  ipcMain.handle('open-path', async (_e, p) => {
    if (!p) return { ok: false }
    try {
      await shell.openPath(p)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) }
    }
  })

  ipcMain.handle('show-item-in-folder', async (_e, p) => {
    try {
      shell.showItemInFolder(p)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) }
    }
  })

  ipcMain.handle('check-for-updates', async () => {
    try {
      initAutoUpdater()
      let info = null
      try {
        const res = await autoUpdater.checkForUpdates()
        info = res && res.updateInfo ? res.updateInfo : null
      } catch (e) {
        info = null
      }
      if (!info) {
        const gh = await checkGithubForUpdate().catch(() => null)
        if (gh && gh.version) {
          fallbackUpdateInfo = gh
          if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-available', gh)
          return { ok: true, info: gh }
        }
      }
      return { ok: true, info }
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) }
    }
  })

  ipcMain.handle('download-update', async () => {
    try {
      initAutoUpdater()
      if (fallbackUpdateInfo && fallbackUpdateInfo.url) {
        const dir = app.getPath('temp')
        const name = `PhotoUnikalizer-Setup-${fallbackUpdateInfo.version}.exe`
        const target = path.join(dir, name)
        await downloadFile(fallbackUpdateInfo.url, target, p => {
          if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-download-progress', { percent: p.percent, transferred: p.transferred, total: p.total, bytesPerSecond: p.bytesPerSecond })
        })
        downloadedInstallerPath = target
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-downloaded', { version: fallbackUpdateInfo.version, path: target })
        return { ok: true, path: target }
      }
      await autoUpdater.downloadUpdate()
      return { ok: true }
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) }
    }
  })

  ipcMain.handle('hash-file-incremental', async (_e, payload) => {
    try {
      const filePath = typeof payload === 'string' ? payload : (payload && payload.path)
      if (!filePath) return { ok: false }
      const hash = createHash('sha256')
      await new Promise((resolve, reject) => {
        const s = fs.createReadStream(filePath)
        s.on('data', chunk => hash.update(chunk))
        s.on('error', reject)
        s.on('end', resolve)
      })
      return { ok: true, algo: 'sha256', hash: hash.digest('hex') }
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) }
    }
  })

  ipcMain.handle('quit-and-install', async () => {
    try {
      initAutoUpdater()
      if (downloadedInstallerPath && fs.existsSync(downloadedInstallerPath)) {
        const child = spawn(downloadedInstallerPath, [], { detached: true, stdio: 'ignore' })
        child.unref()
        setTimeout(() => { try { app.quit() } catch (_) {} }, 500)
        return { ok: true }
      }
      setImmediate(() => autoUpdater.quitAndInstall())
      return { ok: true }
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) }
    }
  })

  ipcMain.handle('auth-required', async () => {
    return { ok: true, required: false, authed: true }
  })

  ipcMain.handle('auth-login', async (_e, payload) => {
    try {
      const password = payload && payload.password
      const remember = payload && !!payload.remember
      if (!appPasswordHash) return { ok: true, authed: true }
      const incoming = String(password || '')
      const incomingHash = createHash('sha256').update(incoming, 'utf8').digest('hex')
      if (incomingHash === appPasswordHash) {
        isAuthed = true
        rememberUntil = remember ? Date.now() + 7 * 24 * 60 * 60 * 1000 : 0
        return { ok: true, authed: true }
      }
      return { ok: false, authed: false }
    } catch (e) {
      return { ok: false, authed: false }
    }
  })

  ipcMain.handle('auth-logout', async () => {
    isAuthed = false
    return { ok: true }
  })

  ipcMain.handle('dev-toggle-admin', async () => {
    try {
      if (!devUnlocked) { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('dev-admin-request-unlock'); return { ok: false, error: 'locked' } }
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('dev-admin-toggle')
      return { ok: true }
    } catch (_) { return { ok: false } }
  })
  ipcMain.handle('dev-show-admin', async () => {
    try {
      if (!devUnlocked) { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('dev-admin-request-unlock'); return { ok: false, error: 'locked' } }
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('dev-admin-show')
      return { ok: true }
    } catch (_) { return { ok: false } }
  })
  ipcMain.handle('dev-hide-admin', async () => {
    try {
      if (!devUnlocked) { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('dev-admin-request-unlock'); return { ok: false, error: 'locked' } }
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('dev-admin-hide')
      return { ok: true }
    } catch (_) { return { ok: false } }
  })
  ipcMain.handle('dev-unlock', async (_e, payload) => {
    try {
      const password = typeof payload === 'string' ? payload : (payload && payload.password)
      if (!process.env.DEV_MENU_PASSWORD && !process.env.CHAT_ADMIN_PASSWORD) reloadEnvFromCandidates()
      const expected = String(process.env.DEV_MENU_PASSWORD || process.env.CHAT_ADMIN_PASSWORD || '').trim()
      const ok = !!expected && String(password || '').trim() === expected
      if (ok) {
        devUnlocked = true
        try { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('dev-admin-unlocked') } catch (_) {}
        return { ok: true }
      }
      return { ok: false }
    } catch (_) { return { ok: false } }
  })
  ipcMain.handle('dev-is-unlocked', async () => {
    return { ok: true, unlocked: !!devUnlocked }
  })
  ipcMain.handle('dev-lock', async () => {
    devUnlocked = false
    return { ok: true }
  })

  ipcMain.handle('get-admin-password', async () => {
    try { return { ok: true, password: '' } } catch (e) { return { ok: false, password: '' } }
  })

  ipcMain.handle('save-json', async (_e, payload) => {
    try {
      const defPath = (payload && payload.defaultPath) || path.join(app.getPath('documents'), 'data.json')
      const res = await dialog.showSaveDialog(mainWindow, {
        defaultPath: defPath,
        filters: [{ name: 'JSON', extensions: ['json'] }]
      })
      if (res.canceled || !res.filePath) return { ok: false }
      await fs.promises.writeFile(res.filePath, (payload && payload.data) || '', 'utf-8')
      return { ok: true, path: res.filePath }
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) }
    }
  })

  ipcMain.handle('get-update-changelog', async () => {
    try {
      const extract = (info) => {
        if (!info) return ''
        const rn = info.releaseNotes
        if (!rn) return ''
        if (typeof rn === 'string') return rn
        if (Array.isArray(rn)) return rn.map(x => (x && (x.note || x.notes || ''))).filter(Boolean).join('\n\n')
        if (typeof rn === 'object' && (rn.note || rn.notes)) return rn.note || rn.notes
        return ''
      }
      const srcInfo = lastUpdateInfo || fallbackUpdateInfo
      let notesGithub = extract(srcInfo)
      const version = (srcInfo && (srcInfo.version || srcInfo.tag)) || app.getVersion()
      const ownerRepo = 'YALOKGARua/PhotoUnikalizer'
      if (!notesGithub) {
        let data = null
        try {
          data = await fetchJson(`https://api.github.com/repos/${ownerRepo}/releases/tags/v${version}`, 8000)
        } catch (_) {}
        if (!data) {
          try {
            data = await fetchJson(`https://api.github.com/repos/${ownerRepo}/releases/latest`, 8000)
          } catch (_) {}
        }
        notesGithub = (data && (data.body || data.name || '')) || ''
      }
      let notesChangelog = ''
      try {
        const root = path.join(__dirname, '..')
        const changelogPath = path.join(root, 'CHANGELOG.md')
        const md = await fs.promises.readFile(changelogPath, 'utf-8')
        const ver = `v${version}`.toLowerCase()
        const lines = md.split(/\r?\n/)
        let start = -1
        let end = lines.length
        for (let i = 0; i < lines.length; i += 1) {
          const line = lines[i].trim().toLowerCase()
          if (line.startsWith('##') && line.includes(ver)) {
            start = i + 1
            for (let j = start; j < lines.length; j += 1) {
              if (lines[j].trim().toLowerCase().startsWith('##')) { end = j; break }
            }
            break
          }
        }
        if (start !== -1) notesChangelog = lines.slice(start, end).join('\n').trim()
        if (!notesChangelog && srcInfo && (srcInfo.version || srcInfo.tag)) {
          const ver2 = `v${srcInfo.version || srcInfo.tag}`.toLowerCase()
          const i2 = lines.findIndex(l => l.trim().toLowerCase().startsWith('##') && l.toLowerCase().includes(ver2))
          if (i2 !== -1) {
            let j2 = lines.length
            for (let j = i2 + 1; j < lines.length; j += 1) { if (lines[j].trim().toLowerCase().startsWith('##')) { j2 = j; break } }
            notesChangelog = lines.slice(i2 + 1, j2).join('\n').trim()
          }
        }
        if (!notesChangelog) {
          const firstIdx = lines.findIndex(l => l.trim().toLowerCase().startsWith('##'))
          if (firstIdx !== -1) {
            let j = firstIdx + 1
            for (; j < lines.length; j += 1) { if (lines[j].trim().toLowerCase().startsWith('##')) break }
            notesChangelog = lines.slice(firstIdx + 1, j).join('\n').trim()
          }
          if (!notesChangelog) notesChangelog = md.trim()
        }
      } catch (_) {}
      const combined = [notesGithub, notesChangelog].filter(Boolean).join('\n\n')
      return { ok: true, notes: combined, github: notesGithub || '', changelog: notesChangelog || '' }
    } catch (e) {
      return { ok: false, notes: '' }
    }
  })

  ipcMain.handle('get-readme', async () => {
    try {
      const root = path.join(__dirname, '..')
      const p = path.join(root, 'README.md')
      const data = await fs.promises.readFile(p, 'utf-8')
      return { ok: true, data }
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) }
    }
  })

  ipcMain.handle('save-json-batch', async (_e, payload) => {
    try {
      const items = (payload && Array.isArray(payload.items)) ? payload.items : []
      if (!items.length) return { ok: false }
      const res = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory', 'createDirectory'] })
      if (res.canceled || !res.filePaths || !res.filePaths[0]) return { ok: false }
      const dir = res.filePaths[0]
      await fs.promises.mkdir(dir, { recursive: true })
      const writes = items.map(async it => {
        const base = sanitizeName((it && it.name) || 'profile.json')
        const target = path.join(dir, base.endsWith('.json') ? base : base + '.json')
        await fs.promises.writeFile(target, (it && it.data) || '', 'utf-8')
        return target
      })
      const paths = await Promise.all(writes)
      return { ok: true, paths }
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) }
    }
  })

  ipcMain.handle('relaunch-admin', async () => {
    try {
      const exe = process.execPath
      const elev = path.join(process.resourcesPath || '', 'elevate.exe')
      let started = false
      try {
        if (fs.existsSync(elev)) {
          const p = spawn(elev, [exe], { detached: true, stdio: 'ignore' })
          p.unref(); started = true
        }
      } catch (_) {}
      if (!started) {
        try {
          const cmd = `Start-Process -FilePath '${exe.replace(/'/g, "''")}' -Verb RunAs`
          const p = spawn('powershell', ['-NoProfile', '-Command', cmd], { detached: true, stdio: 'ignore' })
          p.unref(); started = true
        } catch (_) {}
      }
      try { setTimeout(() => { try { app.quit() } catch (_) {} }, 300) } catch (_) {}
      return { ok: true }
    } catch (e) { return { ok: false, error: String(e && e.message ? e.message : e) } }
  })

  ipcMain.handle('is-admin', async () => {
    try {
      let admin = false
      try {
        const out = spawn('powershell', ['-NoProfile', '-Command', '(New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)'], { windowsHide: true })
        let data = ''
        out.stdout && out.stdout.on('data', c => { data += c.toString() })
        await new Promise(resolve => { out.on('exit', () => resolve()) })
        admin = /True/i.test(data)
      } catch (_) {}
      return { ok: true, admin }
    } catch (e) { return { ok: false, admin: false } }
  })

  ipcMain.handle('file-rename', async (_e, payload) => {
    try {
      const oldPath = payload && payload.path ? String(payload.path) : ''
      let newName = payload && payload.newName ? String(payload.newName) : ''
      if (!oldPath || !newName) return { ok: false, error: 'bad-args' }
      const dir = path.dirname(oldPath)
      const origExt = path.extname(oldPath)
      if (!path.extname(newName)) newName = newName + origExt
      newName = sanitizeName(newName)
      let target = path.join(dir, newName)
      if (target === oldPath) return { ok: true, path: oldPath }
      const base = newName.replace(/\.[^.]+$/, '')
      const ext = path.extname(newName)
      let counter = 1
      while (true) {
        try { await fs.promises.access(target); } catch (_) { break }
        target = path.join(dir, `${base}_${counter}${ext}`)
        counter += 1
      }
      await fs.promises.rename(oldPath, target)
      return { ok: true, path: target }
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) }
    }
  })

  ipcMain.handle('file-delete', async (_e, filePath) => {
    try {
      const p = String(filePath || '')
      if (!p) return { ok: false, error: 'bad-args' }
      if (shell.trashItem) {
        await shell.trashItem(p)
        return { ok: true }
      }
      await fs.promises.unlink(p)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) }
    }
  })

  ipcMain.handle('file-stats', async (_e, filePath) => {
    try {
      const p = String(filePath || '')
      if (!p) return { ok: false, error: 'bad-args' }
      const st = await fs.promises.stat(p)
      const key = `${p}|${st.mtimeMs}|${st.size}`
      if (statsCache && statsCache[key]) return { ok: true, stats: { ...statsCache[key], path: p } }
      let meta = {}
      try { meta = await sharp(p).metadata() } catch (_) {}
      const stats = {
        path: p,
        sizeBytes: Number(st.size) || 0,
        mtimeMs: Number(st.mtimeMs) || 0,
        ctimeMs: Number(st.ctimeMs) || 0,
        width: Number(meta.width) || 0,
        height: Number(meta.height) || 0,
        format: meta.format || '',
        space: meta.space || '',
        hasAlpha: !!meta.hasAlpha,
        channels: Number(meta.channels) || 0
      }
      try {
        if (statsCache) {
          statsCache[key] = stats
          statsCacheDirty = true
          clearTimeout(statsSaveTimer)
          statsSaveTimer = setTimeout(() => {
            try {
              if (statsCacheDirty) {
                fs.writeFileSync(statsCachePath, JSON.stringify(statsCache), 'utf-8')
                statsCacheDirty = false
              }
            } catch (_) {}
          }, 1000)
        }
      } catch (_) {}
      return { ok: true, stats }
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) }
    }
  })

  ipcMain.handle('stats-cache-clear', async () => {
    try {
      statsCache = {}
      try { fs.writeFileSync(statsCachePath, JSON.stringify(statsCache), 'utf-8') } catch (_) {}
      return { ok: true }
    } catch (e) { return { ok: false } }
  })



  ipcMain.handle('check-token-vision', async (_e, payload) => {
    try {
      const endpoint = payload && payload.endpoint ? String(payload.endpoint) : ''
      const token = payload && payload.token ? String(payload.token) : ''
      const res = await verifyTokenAccess(endpoint, token)
      return res && typeof res.ok === 'boolean' ? res : { ok: false }
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) }
    }
  })









  ipcMain.handle('export-indigo-by-token', async (_e, payload) => {
    try {
      const token = String(payload && payload.token)
      const targetDir = String(payload && payload.targetDir)
      const baseOverride = (payload && payload.base ? String(payload.base) : '').trim()
      if (!token || !targetDir) return { ok: false, error: 'bad-args' }
      await fs.promises.mkdir(targetDir, { recursive: true })
      function log(info) { try { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('indigo-export-progress', { log: String(info||'') }) } catch (_) {} }
      async function detectPort() {
        try {
          const p = path.join(os.homedir(), '.indigobrowser', 'app.properties')
          const txt = await fs.promises.readFile(p, 'utf-8')
          const m = txt.match(/multiloginapp\.port\s*=\s*(\d{4,5})/)
          if (m) return Number(m[1])
        } catch (_) {}
        try {
          const logsDir = path.join(os.homedir(), '.indigobrowser')
          const items = await fs.promises.readdir(logsDir).catch(()=>[])
          for (const f of items.slice(0, 50)) {
            const fp = path.join(logsDir, f)
            try {
              const st = await fs.promises.stat(fp)
              if (!st.isFile()) continue
              const txt = await fs.promises.readFile(fp, 'utf-8')
              let m = txt.match(/Server Running: https?:\/\/[^:]+:(\d{4,5})/)
              if (m) return Number(m[1])
              m = txt.match(/listening\s+(\d{4,5})\s+port/i)
              if (m) return Number(m[1])
            } catch (_) {}
          }
        } catch (_) {}
        try {
          const ports = []
          await new Promise(resolve => {
            exec('netstat -ano -p tcp', { windowsHide: true }, (err, stdout) => {
              if (stdout) {
                const lines = String(stdout).split(/\r?\n/)
                for (const ln of lines) {
                  if (!/LISTENING/i.test(ln)) continue
                  const m = ln.match(/\s(?:127\.0\.0\.1|0\.0\.0\.0|\[::1\]|\[::\]):(\d{4,5})/)
                  const pidm = ln.match(/\s(\d+)\s*$/)
                  if (m && pidm) ports.push({ port: Number(m[1]), pid: Number(pidm[1]) })
                }
              }
              resolve()
            })
          })
          const names = new Map()
          await new Promise(resolve => {
            exec('tasklist /FO CSV /NH', { windowsHide: true }, (_e2, out2) => {
              if (out2) {
                const rows = String(out2).split(/\r?\n/).filter(Boolean)
                for (const row of rows) {
                  const parts = row.split(',').map(s => s.replace(/^"|"$/g, ''))
                  const name = parts[0] || ''
                  const pid = Number(parts[1] || 0)
                  if (pid) names.set(pid, name.toLowerCase())
                }
              }
              resolve()
            })
          })
          for (const it of ports) {
            const nm = names.get(it.pid) || ''
            if (nm.includes('indigo') || nm.includes('multilogin')) return it.port
          }
        } catch (_) {}
        const guesses = [12301, 10628, 35000, 21168]
        const ranges = [[12000,13050],[21000,21300]]
        async function portOk(p) {
          const base = `http://127.0.0.1:${p}`
          const pref = await detectApiPrefix(base, token)
          const ctrl = new AbortController(); const id = setTimeout(() => ctrl.abort(), 1500)
          try { const res = await fetch(`${base}${pref}/version`, { signal: ctrl.signal }); clearTimeout(id); return res && res.ok } catch (_) { clearTimeout(id); return false }
        }
        for (const g of guesses) { if (await portOk(g)) return g }
        for (const [a,b] of ranges) { for (let p=a;p<=b;p+=1) { if (await portOk(p)) return p } }
        return 0
      }
      let base = ''
      if (baseOverride) {
        base = baseOverride.replace(/\/$/, '')
        log(`base-override=${base}`)
      } else {
        const port = await detectPort(); log(`port=${port||'unknown'}`)
        base = port ? `http://127.0.0.1:${port}` : 'http://127.0.0.1'; log(`base=${base}`)
      }
      const prefix = await detectApiPrefix(base, token); log(`prefix=${prefix}`)
      async function getJsonAuthForBase(baseArg, pathPart) {
        try {
          const r = await getWithHeaderOrQuery(baseArg, pathPart, token, 6000)
          if (!r || (!r.ok && (!r.status || r.status === 0 || r.status === 404))) return { ok: false, status: r ? r.status : 0 }
          let data = r.body
          if (typeof data === 'string') {
            try { data = JSON.parse(data) } catch (_) { data = null }
          }
          return { ok: !!r.ok, status: r.status, data }
        } catch (e) { return { ok: false, error: String(e && e.message ? e.message : e) } }
      }
      const listUrls = [`${prefix}/profiles`, `${prefix}/profile`, `${prefix}/groups`, `${prefix}/team/groups`, `${prefix}/group`]
      let listRes = { ok: false }
      let chosenListPath = ''
      const baseCandidates = [base, base.replace(/^http:\/\//i, 'https://')]
      for (const pth of listUrls) {
        let found = false
        for (const b of Array.from(new Set(baseCandidates))) {
          const r = await getJsonAuthForBase(b, pth)
          log(`probe ${b}${pth} -> ${r && (r.status||r.ok) ? (r.ok?('ok '+(r.status||200)) : ('err '+(r.status||0))) : 'fail'}`)
          if (r && r.ok) { listRes = r; chosenListPath = pth; base = b; found = true; break }
          if (r && r.status && r.status !== 404) { listRes = r; chosenListPath = pth; base = b; found = true; break }
        }
        if (found) break
      }
      if (!listRes.ok) {
        log('fallback-offline')
        const src = path.join(os.homedir(), '.indigobrowser')
        async function findProfilesRoot(base) {
          const c1 = path.join(base, 'data', 'profiles')
          const c2 = path.join(base, 'profiles')
          try { if ((await fs.promises.stat(c1)).isDirectory()) return c1 } catch (_) {}
          try { if ((await fs.promises.stat(c2)).isDirectory()) return c2 } catch (_) {}
          return ''
        }
        const root = await findProfilesRoot(src)
        if (!root) return { ok: false, error: 'fetch-failed' }
        const items = await fs.promises.readdir(root, { withFileTypes: true })
        let cnt = 0
        for (const it of items) {
          if (!it.isDirectory()) continue
          const s = path.join(root, it.name)
          const d = path.join(targetDir, it.name)
          await fs.promises.mkdir(d, { recursive: true })
          const files = await fs.promises.readdir(s, { withFileTypes: true })
          for (const f of files) {
            const sp = path.join(s, f.name)
            const dp = path.join(d, f.name)
            if (f.isDirectory()) continue
            try { await fs.promises.copyFile(sp, dp) } catch (_) {}
          }
          cnt += 1
          emit(cnt, { id: it.name })
        }
        emit(cnt, { done: true })
        return { ok: true, count: cnt, base, prefix, listPath: 'offline' }
      }
      let profiles = []
      if (Array.isArray(listRes.data)) profiles = listRes.data
      else if (listRes.data && typeof listRes.data === 'object') {
        const d = listRes.data
        profiles = d.items || d.profiles || d.data || d.result || d.results || []
        if (!Array.isArray(profiles)) profiles = []
      }
      let count = 0
      const total = profiles.length || 0
      function emit(idx, info) {
        try { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('indigo-export-progress', { idx, total, info }) } catch (_) {}
      }
      emit(0, { base, prefix, listPath: chosenListPath })
      for (const p of profiles) {
        const id = p && (p.id || p.uuid || p.profileId)
        if (!id) continue
        const details = await getJsonAuth(`${prefix}/profile/${id}`)
        if (!details.ok) continue
        const outPath = path.join(targetDir, `${sanitizeName(String(id))}.json`)
        await fs.promises.writeFile(outPath, JSON.stringify(details.data, null, 2), 'utf-8')
        count += 1
        emit(count, { id })
      }
      emit(total, { done: true })
      return { ok: true, count, base, prefix, listPath: chosenListPath }
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) }
    }
  })


})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {})