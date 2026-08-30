const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const http = require('http')
const https = require('https')
const { WebSocketManager } = require('./utils/websocket-manager')
const { detectJava, getBestJava, validateJavaPath } = require('./utils/java-detector')
const { cacheServers, getCachedServers, hasValidCache, cacheManifest, getCachedManifest, clearOldCache, closeCache } = require('./utils/cache-manager')
const { checkForUpdates, initAutoUpdater } = require('./utils/auto-updater')
const { ChildProcess } = require('child_process')

const os = require('os')

let mainWindow = null
let localServer = null
let localPort = 0
let launcherSession = null
let wsManager = null
let activeGameProcess = null
let quitWithoutKillingGame = false
let oauthServer = null

const totalMemGB = Math.floor(os.totalmem() / (1024 * 1024 * 1024))
const defaultRam = Math.max(2, Math.min(4, Math.floor(totalMemGB / 3))) // Yana ham kamroq RAM beramiz

const DEFAULT_SETTINGS = {
  ram: defaultRam,
  args: '-XX:+UseZGC -XX:MaxGCPauseMillis=10 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch',
  optimize: true,
  fullscreen: false,
  autoClose: true,
  apiBaseUrl: 'http://127.0.0.1:8000/api/v1',
  // Which visual direction the shell renders. Both are fully wired; this
  // only picks which one draws.
  uiVersion: 'v2',
}

function getDefaultPaths() {
  return {
    gamePath: path.join(app.getPath('userData'), 'CyberCraft', 'game'),
    modsPath: path.join(app.getPath('userData'), 'CyberCraft', 'servers'),
  }
}

function getSettingsPath() {
  const dir = path.join(app.getPath('userData'), 'CyberCraft')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, 'launcher-settings.json')
}

ipcMain.handle('load-settings', () => {
  return loadSettingsSync()
})

function loadSettingsSync() {
  const defaults = { ...DEFAULT_SETTINGS, ...getDefaultPaths() }
  try {
    const filePath = getSettingsPath()
    if (fs.existsSync(filePath)) {
      return { ...defaults, ...JSON.parse(fs.readFileSync(filePath, 'utf-8')) }
    }
  } catch (error) {
    console.error('Failed to load settings:', error)
  }
  return defaults
}

ipcMain.handle('save-settings', async (event, settings) => {
  try {
    const nextSettings = { ...DEFAULT_SETTINGS, ...settings }
    fs.writeFileSync(getSettingsPath(), JSON.stringify(nextSettings, null, 2), 'utf-8')
    if (loadSession()?.token) {
      const manager = ensureWebSocketManager()
      if (manager) {
        manager.disconnect()
        await manager.connect(apiRequest)
      }
    } else if (wsManager) {
      wsManager.setApiBaseUrl(normalizeBaseUrl(nextSettings.apiBaseUrl))
    }
    return true
  } catch (error) {
    console.error('Failed to save settings:', error)
    return false
  }
})

function normalizeBaseUrl(url) {
  return String(url || DEFAULT_SETTINGS.apiBaseUrl).replace(/\/+$/, '')
}

function getSessionPath() {
  const dir = path.join(app.getPath('userData'), 'CyberCraft')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, 'launcher-session.json')
}

function loadSession() {
  if (launcherSession) return launcherSession
  try {
    const filePath = getSessionPath()
    if (fs.existsSync(filePath)) {
      launcherSession = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      return launcherSession
    }
  } catch (error) {
    console.error('Failed to load session:', error)
  }
  return null
}

function saveSession(session) {
  launcherSession = session
  fs.writeFileSync(getSessionPath(), JSON.stringify(session, null, 2), 'utf-8')
}

function clearSession() {
  launcherSession = null
  try {
    const filePath = getSessionPath()
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  } catch (error) {
    console.error('Failed to clear session:', error)
  }
}

async function getApiBaseUrl() {
  return normalizeBaseUrl(loadSettingsSync().apiBaseUrl)
}

async function apiRequest(pathname, options = {}) {
  const baseUrl = await getApiBaseUrl()
  const session = loadSession()
  const headers = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(session?.token ? { Authorization: `Launcher ${session.token}` } : {}),
    ...(options.headers || {}),
  }
  const response = await fetch(`${baseUrl}${pathname}`, { ...options, headers })
  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json') ? await response.json() : await response.text()
  if (!response.ok) {
    const message = typeof payload === 'object' ? payload.error || payload.detail || JSON.stringify(payload) : payload
    const err = new Error(message || `Request failed with ${response.status}`)
    err.status = response.status
    throw err
  }
  return payload
}

function ensureWebSocketManager() {
  if (!mainWindow || mainWindow.isDestroyed()) return null
  if (!wsManager) {
    wsManager = new WebSocketManager()
    wsManager.setMainWindow(mainWindow)
  }
  wsManager.setApiBaseUrl(normalizeBaseUrl(loadSettingsSync().apiBaseUrl))
  return wsManager
}

ipcMain.handle('api:get-session', async () => {
  const session = loadSession()
  if (!session?.token) return { authenticated: false, user: null }
  try {
    const me = await apiRequest('/auth/launcher/me/')
    saveSession({ ...session, user: me.user })
    return { authenticated: true, user: me.user }
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      clearSession()
      return { authenticated: false, user: null, error: error.message }
    }
    // Network failure, backend unreachable, timeout, or a non-auth server
    // error - the saved token may still be valid, so keep the session on
    // disk and let the caller know we couldn't verify it right now.
    return { authenticated: true, user: session.user, offline: true, error: error.message }
  }
})

ipcMain.handle('api:login', async (event, credentials) => {
  try {
    const payload = await apiRequest('/auth/launcher/login/', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
    saveSession({ token: payload.token, user: payload.user })
    const manager = ensureWebSocketManager()
    if (manager) manager.connect(apiRequest)
    return { authenticated: true, user: payload.user }
  } catch (error) {
    console.error('Login failed:', error.message)
    throw error
  }
})

ipcMain.handle('api:start-oauth', async (event, provider) => {
  return new Promise((resolve, reject) => {
    if (oauthServer) {
      try {
        oauthServer.close()
      } catch (e) {}
      oauthServer = null
    }

    // Single-use nonce tying this flow to its callback. Without it the
    // loopback server accepts a token from any local process or any page the
    // user happens to have open, and whoever wins the race owns the session.
    const state = crypto.randomBytes(32).toString('hex')
    let settled = false

    const finish = (fn, arg) => {
      if (settled) return
      settled = true
      clearTimeout(timeoutHandle)
      setTimeout(() => {
        if (oauthServer) {
          oauthServer.close()
          oauthServer = null
        }
      }, 1000)
      fn(arg)
    }

    // The flow used to have no time limit: abandoning the browser left the
    // port listening until the window closed.
    const timeoutHandle = setTimeout(() => {
      finish(reject, new Error('Tizimga kirish vaqti tugadi. Qaytadan urinib ko\'ring.'))
    }, 5 * 60 * 1000)

    oauthServer = http.createServer(async (req, res) => {
      const urlObj = new URL(req.url, `http://${req.headers.host}`)
      if (urlObj.pathname === '/callback') {
        const token = urlObj.searchParams.get('token')
        const username = urlObj.searchParams.get('username')
        const returnedState = urlObj.searchParams.get('state')

        const stateOk =
          typeof returnedState === 'string' &&
          returnedState.length === state.length &&
          crypto.timingSafeEqual(Buffer.from(returnedState), Buffer.from(state))

        if (!stateOk) {
          console.warn('OAuth callback rejected: state mismatch')
          res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' })
          res.end('Invalid state')
          return
        }

        if (token) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(`
            <html>
              <head>
                <title>CyberCraft Auth</title>
                <meta charset="utf-8" />
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Chakra+Petch:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
                <style>
                  :root {
                    --void: #06080c;
                    --surface: #121a24;
                    --line: #26333f;
                    --text: #e8f0f7;
                    --dim: #8296ab;
                    --faint: #56687d;
                    --acid: #8cff2e;
                    --acid-deep: #5fc400;
                    --acid-dark: #2f6b00;
                  }
                  * { box-sizing: border-box; }
                  body {
                    background-color: var(--void);
                    background-image:
                      linear-gradient(to right, rgb(140 255 46 / 0.05) 1px, transparent 1px),
                      linear-gradient(to bottom, rgb(140 255 46 / 0.05) 1px, transparent 1px);
                    background-size: 16px 16px;
                    color: var(--text);
                    font-family: "Chakra Petch", system-ui, sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    margin: 0;
                  }
                  .cube {
                    width: 28px;
                    height: 28px;
                    margin: 0 auto 28px;
                    position: relative;
                    transform-style: preserve-3d;
                    transform: rotateX(-24deg) rotateZ(45deg);
                  }
                  .cube i { position: absolute; inset: 0; display: block; }
                  .cube .top { background: var(--acid); transform: translateZ(14px); }
                  .cube .side-a { background: var(--acid-deep); transform-origin: left; transform: rotateY(90deg) translateX(14px) translateZ(-14px); }
                  .cube .side-b { background: var(--acid-dark); transform-origin: top; transform: rotateX(-90deg) translateY(-14px) translateZ(-14px); }
                  .container {
                    position: relative;
                    text-align: center;
                    padding: 48px 44px;
                    background-color: var(--surface);
                    border-top: 1px solid rgb(255 255 255 / 0.07);
                    border-left: 1px solid rgb(255 255 255 / 0.04);
                    border-right: 1px solid rgb(0 0 0 / 0.4);
                    border-bottom: 1px solid rgb(0 0 0 / 0.5);
                    box-shadow: 0 24px 60px rgb(0 0 0 / 0.45);
                    max-width: 380px;
                  }
                  .container::before, .container::after {
                    content: '';
                    position: absolute;
                    width: 8px;
                    height: 8px;
                    border-color: var(--acid);
                    pointer-events: none;
                  }
                  .container::before { top: -1px; left: -1px; border-top: 2px solid; border-left: 2px solid; }
                  .container::after { bottom: -1px; right: -1px; border-bottom: 2px solid; border-right: 2px solid; }
                  .status {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 20px;
                    font-family: "JetBrains Mono", ui-monospace, monospace;
                    font-size: 11px;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                    color: var(--acid);
                  }
                  .dot {
                    width: 6px;
                    height: 6px;
                    background: var(--acid);
                    animation: blip 2.4s steps(2, end) infinite;
                  }
                  @keyframes blip { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
                  h1 {
                    font-family: "Press Start 2P", monospace;
                    font-size: 18px;
                    line-height: 1.6;
                    color: var(--text);
                    margin: 0 0 18px;
                  }
                  p {
                    color: var(--dim);
                    font-size: 14px;
                    line-height: 1.6;
                    margin: 0 0 8px;
                  }
                  p:last-of-type { margin-bottom: 0; color: var(--faint); font-size: 13px; }
                  @media (prefers-reduced-motion: reduce) {
                    .dot { animation: none; }
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="cube"><i class="top"></i><i class="side-a"></i><i class="side-b"></i></div>
                  <div class="status"><span class="dot"></span>Ulanish muvaffaqiyatli</div>
                  <h1>MUVAFFAQIYATLI!</h1>
                  <p>Launcherda muvaffaqiyatli tizimga kirdingiz.</p>
                  <p>Ushbu oynani yopishingiz va launcherga qaytishingiz mumkin.</p>
                </div>
                <script>
                  setTimeout(() => window.close(), 3000);
                </script>
              </body>
            </html>
          `)

          try {
            launcherSession = { token }
            const me = await apiRequest('/auth/launcher/me/')
            const fullSession = { token, user: me.user }
            saveSession(fullSession)

            const manager = ensureWebSocketManager()
            if (manager) manager.connect(apiRequest)

            finish(resolve, { authenticated: true, user: me.user })
          } catch (authError) {
            console.error('Failed to finalize OAuth login:', authError)
            launcherSession = null
            finish(reject, new Error('Tizimga kirish tafsilotlarini yuklashda xato: ' + authError.message))
          }
        } else {
          res.writeHead(400)
          res.end('Token missing')
          finish(reject, new Error('Auth token missing from callback'))
        }
      } else {
        res.writeHead(404)
        res.end('Not Found')
      }
    })

    oauthServer.listen(0, '127.0.0.1', async () => {
      const port = oauthServer.address().port
      const callbackUrl = `http://localhost:${port}/callback`
      
      const apiBase = loadSettingsSync().apiBaseUrl || DEFAULT_SETTINGS.apiBaseUrl
      let websiteUrl = 'https://cybercraft.uz'
      
      if (apiBase.includes('localhost:8000') || apiBase.includes('127.0.0.1:8000')) {
        websiteUrl = 'http://localhost:3000'
      } else {
        try {
          const url = new URL(apiBase)
          if (url.hostname.startsWith('api.')) {
            websiteUrl = `${url.protocol}//${url.hostname.substring(4)}`
          } else {
            websiteUrl = `${url.protocol}//${url.hostname}`
          }
        } catch (e) {
          console.error('Failed to parse apiBaseUrl:', e)
        }
      }

      const authUrl = `${websiteUrl}/login?callback=${encodeURIComponent(callbackUrl)}&provider=${provider}&state=${state}`
      shell.openExternal(authUrl)
    })

    oauthServer.on('error', (err) => {
      console.error('OAuth callback server error:', err)
      finish(reject, err)
    })
  })
})

ipcMain.handle('api:logout', async () => {
  try {
    await apiRequest('/auth/launcher/logout/', { method: 'POST' })
  } catch (error) {
    console.error('Logout request failed:', error)
  }
  clearSession()
  if (wsManager) wsManager.disconnect()
  return true
})

ipcMain.handle('api:list-servers', async () => {
  try {
    const servers = await apiRequest('/launcher/servers/')
    const net = require('net')
    
    const pingServer = (host, port, timeout = 2000) => {
      return new Promise((resolve) => {
        const start = Date.now()
        const socket = new net.Socket()
        socket.setTimeout(timeout)
        socket.connect(port, host, () => {
          const ping = Date.now() - start
          socket.destroy()
          resolve(ping)
        })
        socket.on('error', () => {
          socket.destroy()
          resolve(-1)
        })
        socket.on('timeout', () => {
          socket.destroy()
          resolve(-1)
        })
      })
    }

    const pingedServers = await Promise.all(
      servers.map(async (server) => {
        try {
          const ping = await pingServer(server.ip_address, server.port || 25565, 2000)
          return { ...server, ping }
        } catch (e) {
          return { ...server, ping: -1 }
        }
      })
    )

    cacheServers(pingedServers)
    return pingedServers
  } catch (error) {
    const cached = getCachedServers()
    if (cached.length > 0) return cached
    throw error
  }
})

ipcMain.handle('api:get-manifest', async (event, serverId) => {
  try {
    const manifest = await apiRequest(`/launcher/servers/${encodeURIComponent(serverId)}/manifest/`)
    cacheManifest(serverId, manifest)
    return manifest
  } catch (error) {
    const cached = getCachedManifest(serverId)
    if (cached) return cached
    throw error
  }
})

ipcMain.handle('download-server-files', async (event, serverId) => {
  const webContents = event.sender
  try {
    const manifest = await apiRequest(`/launcher/servers/${encodeURIComponent(serverId)}/manifest/`)
    const settings = loadSettingsSync()
    const baseDir = path.join(settings.modsPath || path.join(app.getPath('userData'), 'CyberCraft', 'servers'), serverId)
    const allFiles = [
      ...manifest.files.mods.map(f => ({ ...f, type: 'mod', subDir: 'mods' })),
      ...manifest.files.resourcepacks.map(f => ({ ...f, type: 'resourcepack', subDir: 'resourcepacks' })),
      ...manifest.files.shaders.map(f => ({ ...f, type: 'shader', subDir: 'shaders' })),
    ]
    const downloaded = []
    const session = loadSession()
    const authHeaders = session?.token ? { Authorization: `Launcher ${session.token}` } : {}

    const totalBytes = allFiles.reduce((acc, f) => acc + (f.size || 0), 0)
    let transferredBytes = 0
    const startTime = Date.now()

    for (let i = 0; i < allFiles.length; i++) {
      const file = allFiles[i]
      if (!file.url) {
        console.warn(`Skipping ${file.name}: no download URL`)
        continue
      }
      const fileDir = path.join(baseDir, file.subDir)
      fs.mkdirSync(fileDir, { recursive: true })
      const filePath = path.join(fileDir, file.name)
      
      const percent = totalBytes > 0 ? Math.round((transferredBytes / totalBytes) * 100) : Math.round((i / allFiles.length) * 100)
      const elapsedSec = (Date.now() - startTime) / 1000
      const speedBps = elapsedSec > 0 ? transferredBytes / elapsedSec : 0

      webContents.send('download-progress', {
        current: i + 1,
        total: allFiles.length,
        file: file.name,
        state: 'downloading',
        percent: percent,
        transferredBytes,
        totalBytes,
        speedBps,
      })
      const response = await fetch(file.url, { headers: authHeaders })
      if (!response.ok) throw new Error(`Failed to download ${file.name}: ${response.statusText}`)
      const buffer = Buffer.from(await response.arrayBuffer())
      if (file.hash) {
        const hash = crypto.createHash('sha256').update(buffer).digest('hex')
        if (hash !== file.hash) {
          console.warn(`Hash mismatch for ${file.name}: expected ${file.hash}, got ${hash}`)
        }
      }
      fs.writeFileSync(filePath, buffer)
      downloaded.push({ name: file.name, type: file.type, path: filePath, size: file.size })
      
      transferredBytes += file.size || buffer.length
      const nextPercent = totalBytes > 0 ? Math.round((transferredBytes / totalBytes) * 100) : Math.round(((i + 1) / allFiles.length) * 100)
      const nextElapsedSec = (Date.now() - startTime) / 1000
      const nextSpeedBps = nextElapsedSec > 0 ? transferredBytes / nextElapsedSec : 0

      webContents.send('download-progress', {
        current: i + 1,
        total: allFiles.length,
        file: file.name,
        state: 'completed',
        percent: nextPercent,
        transferredBytes,
        totalBytes,
        speedBps: nextSpeedBps,
      })
    }
    return { success: true, files: downloaded, baseDir }
  } catch (error) {
    webContents.send('download-progress', { state: 'error', message: error.message })
    throw error
  }
})


ipcMain.handle('api:check-launcher-update', async () => {
  const platform = process.platform
  const version = app.getVersion()
  return apiRequest(`/launcher/update/?version=${encodeURIComponent(version)}&platform=${encodeURIComponent(platform)}`)
})

ipcMain.handle('api:ws-token', async () => {
  return apiRequest('/launcher/ws-token/')
})

ipcMain.handle('api:detect-java', async () => {
  const javas = await detectJava()
  const best = await getBestJava(21)
  return { all: javas, best }
})

ipcMain.handle('api:validate-java', async (event, javaPath) => {
  return await validateJavaPath(javaPath)
})

ipcMain.handle('api:get-system-memory', async () => {
  return Math.floor(os.totalmem() / (1024 * 1024 * 1024))
})

ipcMain.handle('select-directory', async (event, defaultPath) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: defaultPath || app.getPath('desktop'),
  })
  if (result.canceled) return null
  return result.filePaths[0]
})

async function copyModsAndResources(modsDir, gameDir) {
  const fs = require('fs').promises
  const { existsSync } = require('fs')
  const path = require('path')
  const crypto = require('crypto')
  const subDirs = ['mods', 'resourcepacks', 'shaders']

  const exists = async (p) => {
    try {
      await fs.access(p)
      return true
    } catch {
      return false
    }
  }

  for (const subDir of subDirs) {
    const srcDir = path.join(modsDir, subDir)
    const destDir = path.join(gameDir, subDir)

    if (await exists(srcDir)) {
      await fs.mkdir(destDir, { recursive: true })
      
      const srcFiles = await fs.readdir(srcDir)
      const destFiles = await exists(destDir) ? await fs.readdir(destDir) : []

      // 1. Delete client files that are no longer present in server synced files
      for (const destFile of destFiles) {
        const destFilePath = path.join(destDir, destFile)
        try {
          const stat = await fs.stat(destFilePath)
          if (stat.isFile() && !srcFiles.includes(destFile)) {
            console.log(`Deleting removed file: ${destFilePath}`)
            await fs.unlink(destFilePath)
          }
        } catch (e) {
          console.error(`Error deleting file ${destFilePath}:`, e)
        }
      }

      // 2. Copy/overwrite files
      for (const file of srcFiles) {
        const srcFile = path.join(srcDir, file)
        const destFile = path.join(destDir, file)
        
        try {
          const srcStat = await fs.stat(srcFile)
          if (!srcStat.isFile()) continue

          let shouldCopy = false
          if (!await exists(destFile)) {
            shouldCopy = true
          } else {
            const destStat = await fs.stat(destFile)
            if (srcStat.size !== destStat.size) {
              shouldCopy = true
            } else {
              const srcBuffer = await fs.readFile(srcFile)
              const destBuffer = await fs.readFile(destFile)
              const srcHash = crypto.createHash('md5').update(srcBuffer).digest('hex')
              const destHash = crypto.createHash('md5').update(destBuffer).digest('hex')
              if (srcHash !== destHash) {
                shouldCopy = true
              }
            }
          }

          if (shouldCopy) {
            console.log(`Syncing file: ${destFile}`)
            await fs.copyFile(srcFile, destFile)
          }
        } catch (e) {
          console.error(`Error syncing file ${srcFile}:`, e)
        }
      }
    } else {
      if (await exists(destDir)) {
        try {
          const destFiles = await fs.readdir(destDir)
          for (const destFile of destFiles) {
            const destFilePath = path.join(destDir, destFile)
            const stat = await fs.stat(destFilePath)
            if (stat.isFile()) {
              console.log(`Deleting removed file from empty server dir: ${destFilePath}`)
              await fs.unlink(destFilePath)
            }
          }
        } catch (e) {
          console.error(`Error cleaning up destDir ${destDir}:`, e)
        }
      }
    }
  }
}

async function downloadAuthlibInjector(destPath) {
  const fs = require('fs')
  const fsPromises = fs.promises
  
  if (fs.existsSync(destPath)) {
    return destPath
  }

  await fsPromises.mkdir(path.dirname(destPath), { recursive: true })

  const url = 'https://github.com/yushijinhun/authlib-injector/releases/download/v1.2.7/authlib-injector-1.2.7.jar'

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath)

    const request = (downloadUrl) => {
      https.get(downloadUrl, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          request(response.headers.location)
          return
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download authlib-injector: HTTP ${response.statusCode}`))
          return
        }

        response.pipe(file)

        file.on('finish', () => {
          file.close()
          resolve(destPath)
        })
      }).on('error', (err) => {
        fs.unlink(destPath, () => { })
        reject(err)
      })
    }

    request(url)
  })
}

async function downloadFile(url, destPath) {
  const fs = require('fs').promises
  const { existsSync } = require('fs')
  
  if (existsSync(destPath)) {
    return destPath
  }
  await fs.mkdir(path.dirname(destPath), { recursive: true })
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.statusText} (${response.status})`)
  }
  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  await fs.writeFile(destPath, buffer)
  return destPath
}

ipcMain.handle('launch-game', async (event, options) => {
  const webContents = event.sender
  const { server, modsDir } = options

  try {
    if (activeGameProcess) {
      throw new Error('Game is already running')
    }

    webContents.send('launch-status', { state: 'checking', progress: 5, message: 'Downloading authlib-injector...' })
    const authlibPath = path.join(app.getPath('userData'), 'CyberCraft', 'authlib-injector.jar')
    try {
      await downloadAuthlibInjector(authlibPath)
    } catch (err) {
      console.error('Failed to download authlib-injector:', err)
      throw new Error(`Failed to download authlib-injector agent: ${err.message}`)
    }

    webContents.send('launch-status', { state: 'checking', progress: 10, message: 'Creating verified Yggdrasil session...' })
    const session = await apiRequest('/yggdrasil/authserver/launcher-authenticate', { method: 'POST' })

    webContents.send('launch-status', { state: 'syncing', progress: 15, message: 'Fetching server manifest...' })
    let manifest = null
    if (server?.id) {
      manifest = await apiRequest(`/launcher/servers/${encodeURIComponent(server.id)}/manifest/`)
    }

    webContents.send('launch-status', { state: 'checking', progress: 25, message: 'Detecting Java runtime...' })
    const javaInfo = await getBestJava(21)
    if (!javaInfo) {
      throw new Error('Java runtime not found. Please install Java 21 or later.')
    }

    const settings = loadSettingsSync()
    const ram = settings.ram || DEFAULT_SETTINGS.ram
    const jvmArgs = settings.args || DEFAULT_SETTINGS.args

    webContents.send('launch-status', { state: 'syncing', progress: 40, message: `Preparing Minecraft ${manifest?.minecraft || 'latest'} profile...` })

    const { createGameDirectory } = require('./utils/game-launcher')

    const gameDir = await createGameDirectory(manifest || { minecraft: 'latest', id: server?.id || 'default' }, settings.gamePath)

    if (modsDir) {
      webContents.send('launch-status', { state: 'syncing', progress: 50, message: 'Installing mods and resources...' })
      await copyModsAndResources(modsDir, gameDir)
    }

    webContents.send('launch-status', { state: 'loading', progress: 60, message: 'Starting Minecraft client...' })

    const { Client } = require('minecraft-launcher-core')
    const launcher = new Client()

    launcher.on('debug', (e) => {
      console.log(`[LAUNCHER DEBUG] ${e}`)
      if (!webContents.isDestroyed()) {
        webContents.send('game-log', `[DEBUG] ${e}`)
      }
    })

    launcher.on('data', (e) => {
      console.log(`[LAUNCHER DATA] ${e}`)
      if (!webContents.isDestroyed()) {
        webContents.send('game-log', e)
      }
    })

    launcher.on('download-status', (e) => {
      if (!webContents.isDestroyed()) {
        const percent = e.total > 0 ? Math.round((e.current / e.total) * 100) : 0
        webContents.send('launch-status', { state: 'syncing', progress: 60, message: `Downloading ${e.type} (${percent}%)...` })
      }
    })

    const versionNum = manifest?.minecraft || '1.21.4'

    const yggdrasilUrl = `${await getApiBaseUrl()}/yggdrasil`
    const jvmArgsArray = jvmArgs.split(' ').filter(a => a.trim() && a !== '-XX:+ZGenerational')
    jvmArgsArray.push(`-javaagent:${authlibPath}=${yggdrasilUrl}`)

    const opts = {
      clientPackage: null,
      authorization: {
        access_token: session.accessToken,
        client_token: session.clientToken,
        uuid: session.selectedProfile.id,
        name: session.selectedProfile.name,
        user_properties: '{}'
      },
      root: gameDir,
      version: {
        number: versionNum,
        type: "release"
      },
      memory: {
        max: `${ram}G`,
        min: `${ram}G`
      },
      windowSize: settings.fullscreen ? { fullscreen: true } : undefined,
      fullscreen: settings.fullscreen ? true : false,
      customLaunchArgs: settings.fullscreen ? ['--fullscreen'] : [],
      javaPath: (function () {
        let p = javaInfo.path;
        if (process.platform === 'win32') {
          if (p === 'java') {
            return 'javaw';
          } else if (p === 'java.exe') {
            return 'javaw.exe';
          } else {
            return p.replace(/java\.exe$/, 'javaw.exe').replace(/java$/, 'javaw');
          }
        }
        return p;
      })(),
      customArgs: jvmArgsArray,
      overrides: {
        url: {
          meta: 'https://launchermeta.fastmcmirror.org',
          resource: 'https://resources.fastmcmirror.org',
          defaultRepoForge: 'https://libraries.fastmcmirror.org/'
        }
      }
    }

    // Handle Forge/Fabric/NeoForge if specified in manifest
    if (manifest?.loader === 'forge' && manifest?.loaderVersion) {
      const forgeFilename = `forge-${manifest.minecraft}-${manifest.loaderVersion}-installer.jar`
      const forgeInstallerPath = path.join(app.getPath('userData'), 'CyberCraft', 'installers', forgeFilename)
      const forgeUrl = `https://maven.minecraftforge.net/net/minecraftforge/forge/${manifest.minecraft}-${manifest.loaderVersion}/${forgeFilename}`

      webContents.send('launch-status', {
        state: 'syncing',
        progress: 45,
        message: `Downloading Forge ${manifest.loaderVersion} installer...`
      })

      try {
        await downloadFile(forgeUrl, forgeInstallerPath)
        opts.forge = forgeInstallerPath
        console.log(`[LAUNCHER] Using Forge installer: ${forgeInstallerPath}`)
      } catch (err) {
        console.error('Failed to download/install Forge:', err)
        throw new Error(`Failed to download Forge loader: ${err.message}`)
      }
    } else if (manifest?.loader === 'fabric' && manifest?.loaderVersion) {
      const customName = `fabric-${manifest.minecraft}-${manifest.loaderVersion}`
      const fabricJsonDir = path.join(gameDir, 'versions', customName)
      const fabricJsonPath = path.join(fabricJsonDir, `${customName}.json`)
      const fabricMetaUrl = `https://meta.fabricmc.net/v2/versions/loader/${manifest.minecraft}/${manifest.loaderVersion}/profile/json`

      if (!fs.existsSync(fabricJsonPath)) {
        webContents.send('launch-status', {
          state: 'syncing',
          progress: 45,
          message: `Downloading Fabric ${manifest.loaderVersion} profile...`
        })

        try {
          await downloadFile(fabricMetaUrl, fabricJsonPath)
          console.log(`[LAUNCHER] Downloaded Fabric profile to ${fabricJsonPath}`)
        } catch (err) {
          console.error('Failed to download Fabric metadata:', err)
          throw new Error(`Failed to download Fabric profile: ${err.message}`)
        }
      }

      opts.version.custom = customName
      console.log(`[LAUNCHER] Launching Fabric version: ${customName}`)
    }

    if (server?.ip_address) {
      opts.server = {
        host: server.ip_address,
        port: server.port || 25565
      }
    }

    activeGameProcess = await launcher.launch(opts)

    if (!activeGameProcess) {
      throw new Error('Minecraft failed to start. Check logs for details.')
    }

    if (activeGameProcess.unref) {
      activeGameProcess.unref()
    }

    webContents.send('launch-status', { state: 'running', progress: 100, message: 'CyberCraft is now running!' })

    quitWithoutKillingGame = true

    // Close the launcher window after a brief delay, unless the user has
    // disabled auto-close in settings.
    if (settings.autoClose !== false) {
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.close()
        }
      }, 1500)
    }

    activeGameProcess.on('exit', (code) => {
      activeGameProcess = null
      if (!webContents.isDestroyed()) {
        webContents.send('launch-status', { state: 'idle', progress: 0, message: `Game exited with code ${code}` })
      }
    })

    activeGameProcess.on('error', (err) => {
      activeGameProcess = null
      if (!webContents.isDestroyed()) {
        webContents.send('launch-status', { state: 'error', progress: 0, message: err.message })
      }
    })

    return { success: true, pid: activeGameProcess.pid }
  } catch (error) {
    activeGameProcess = null
    webContents.send('launch-status', { state: 'error', progress: 0, message: error.message })
    throw error
  }
})

ipcMain.handle('stop-game', async () => {
  if (activeGameProcess) {
    activeGameProcess.kill()
    activeGameProcess = null
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('launch-status', { state: 'idle', progress: 0, message: 'Game stopped' })
    }
    return true
  }
  return false
})

ipcMain.handle('updater:check', async () => {
  return checkForUpdates()
})

ipcMain.handle('updater:download', async () => {
  const { downloadUpdate } = require('./utils/auto-updater')
  await downloadUpdate()
})

ipcMain.handle('updater:install', async () => {
  const { installUpdate } = require('./utils/auto-updater')
  installUpdate()
})

ipcMain.handle('cache:has-valid', async () => {
  return hasValidCache()
})

ipcMain.handle('cache:get-servers', async () => {
  return getCachedServers()
})

ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize()
})

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close()
})

ipcMain.on('open-external', (event, url) => {
  try {
    const parsedUrl = new URL(url)
    if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
      shell.openExternal(url)
    } else {
      console.warn(`Blocked open-external request for unsafe protocol: ${url}`)
    }
  } catch (e) {
    console.error(`Invalid URL in open-external: ${url}`, e)
  }
})

function startLocalServer() {
  return new Promise((resolve, reject) => {
    const outDir = path.join(__dirname, 'out')
    const fallbackFile = path.join(outDir, 'index.html')

    if (!fs.existsSync(fallbackFile)) {
      reject(new Error(`Static launcher build not found at ${fallbackFile}. Run "npm run build" first.`))
      return
    }

    localServer = http.createServer((req, res) => {
      let safeUrl = '/'
      try {
        safeUrl = decodeURIComponent((req.url || '/').split('?')[0])
      } catch (error) {
        res.writeHead(400)
        res.end('Bad Request')
        return
      }

      if (safeUrl === '/') safeUrl = '/index.html'
      let filePath = path.normalize(path.join(outDir, safeUrl))
      const relativePath = path.relative(outDir, filePath)
      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        res.writeHead(403)
        res.end('Forbidden')
        return
      }
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = fallbackFile
      }
      const ext = path.extname(filePath).toLowerCase()
      const mimeTypes = {
        '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
        '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif',
        '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
        '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
      }
      const contentType = mimeTypes[ext] || 'application/octet-stream'
      fs.readFile(filePath, (err, content) => {
        if (err) {
          console.error(`Static file read failed for ${filePath}:`, err)
          res.writeHead(500)
          res.end(`Server Error: ${err.code}`)
        }
        else { res.writeHead(200, { 'Content-Type': contentType }); res.end(content, 'utf-8') }
      })
    })
    localServer.listen(0, '127.0.0.1', () => {
      localPort = localServer.address().port
      console.log(`Local server running on http://127.0.0.1:${localPort}`)
      resolve(localPort)
    })
    localServer.on('error', (err) => reject(err))
  })
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960, height: 600, frame: false,
    resizable: false, maximizable: false, fullscreenable: false,
    show: false, backgroundColor: '#0b1622',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, contextIsolation: true, sandbox: false,
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    if (loadSession()?.token) {
      const manager = ensureWebSocketManager()
      if (manager) manager.connect(apiRequest)
    }
    initAutoUpdater(mainWindow)
    clearOldCache()
  })

  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production'
  if (isDev) {
    mainWindow.loadURL(`http://localhost:${process.env.PORT || '3001'}`)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    try {
      const port = await startLocalServer()
      mainWindow.loadURL(`http://127.0.0.1:${port}`)
    } catch (e) {
      console.error('Failed to start local server', e)
      mainWindow.loadFile(path.join(__dirname, 'out', 'index.html'))
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null
    if (localServer) localServer.close()
    if (oauthServer) {
      try { oauthServer.close() } catch (e) {}
      oauthServer = null
    }
    if (wsManager) wsManager.disconnect()
    if (activeGameProcess && !quitWithoutKillingGame) { activeGameProcess.kill(); activeGameProcess = null }
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})

app.on('before-quit', () => {
  if (wsManager) wsManager.disconnect()
  if (oauthServer) {
    try { oauthServer.close() } catch (e) {}
    oauthServer = null
  }
  if (activeGameProcess && !quitWithoutKillingGame) { activeGameProcess.kill(); activeGameProcess = null }
  closeCache()
})

module.exports = { getApiBaseUrl, apiRequest }
