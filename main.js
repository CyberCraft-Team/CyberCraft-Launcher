const { app, BrowserWindow, ipcMain } = require('electron')
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

const totalMemGB = Math.floor(os.totalmem() / (1024 * 1024 * 1024))
const defaultRam = Math.max(2, Math.min(4, Math.floor(totalMemGB / 3))) // Yana ham kamroq RAM beramiz

const DEFAULT_SETTINGS = {
  ram: defaultRam,
  args: '-XX:+UseZGC -XX:MaxGCPauseMillis=10 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch',
  optimize: true,
  fullscreen: false,
  apiBaseUrl: 'http://127.0.0.1:8000/api/v1',
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
  try {
    const filePath = getSettingsPath()
    if (fs.existsSync(filePath)) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(filePath, 'utf-8')) }
    }
  } catch (error) {
    console.error('Failed to load settings:', error)
  }
  return DEFAULT_SETTINGS
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
    throw new Error(message || `Request failed with ${response.status}`)
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
    clearSession()
    return { authenticated: false, user: null, error: error.message }
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
    cacheServers(servers)
    return servers
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

ipcMain.handle('api:create-minecraft-session', async () => {
  return apiRequest('/minecraft/session/create/', { method: 'POST' })
})

ipcMain.handle('download-server-files', async (event, serverId) => {
  const webContents = event.sender
  try {
    const manifest = await apiRequest(`/launcher/servers/${encodeURIComponent(serverId)}/manifest/`)
    const baseDir = path.join(app.getPath('userData'), 'CyberCraft', 'servers', serverId)
    const allFiles = [
      ...manifest.files.mods.map(f => ({ ...f, type: 'mod', subDir: 'mods' })),
      ...manifest.files.resourcepacks.map(f => ({ ...f, type: 'resourcepack', subDir: 'resourcepacks' })),
      ...manifest.files.shaders.map(f => ({ ...f, type: 'shader', subDir: 'shaders' })),
    ]
    const downloaded = []
    for (let i = 0; i < allFiles.length; i++) {
      const file = allFiles[i]
      const fileDir = path.join(baseDir, file.subDir)
      fs.mkdirSync(fileDir, { recursive: true })
      const filePath = path.join(fileDir, file.name)
      webContents.send('download-progress', {
        current: i + 1,
        total: allFiles.length,
        file: file.name,
        state: 'downloading',
        percent: Math.round(((i) / allFiles.length) * 100),
      })
      const response = await fetch(file.url)
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
      webContents.send('download-progress', {
        current: i + 1,
        total: allFiles.length,
        file: file.name,
        state: 'completed',
        percent: Math.round(((i + 1) / allFiles.length) * 100),
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
  const javas = detectJava()
  const best = getBestJava(21)
  return { all: javas, best }
})

ipcMain.handle('api:validate-java', async (event, javaPath) => {
  return validateJavaPath(javaPath)
})

ipcMain.handle('api:get-system-memory', async () => {
  return Math.floor(os.totalmem() / (1024 * 1024 * 1024))
})

async function copyModsAndResources(modsDir, gameDir) {
  const fs = require('fs')
  const path = require('path')
  const subDirs = ['mods', 'resourcepacks', 'shaders']
  
  for (const subDir of subDirs) {
    const srcDir = path.join(modsDir, subDir)
    const destDir = path.join(gameDir, subDir)
    
    if (fs.existsSync(srcDir)) {
      fs.mkdirSync(destDir, { recursive: true })
      const files = fs.readdirSync(srcDir)
      for (const file of files) {
        const srcFile = path.join(srcDir, file)
        const destFile = path.join(destDir, file)
        if (!fs.existsSync(destFile)) {
          fs.copyFileSync(srcFile, destFile)
        }
      }
    }
  }
}

async function downloadAuthlibInjector(destPath) {
  if (fs.existsSync(destPath)) {
    return destPath
  }
  
  fs.mkdirSync(path.dirname(destPath), { recursive: true })
  
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
        fs.unlink(destPath, () => {})
        reject(err)
      })
    }
    
    request(url)
  })
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
    const javaInfo = getBestJava(21)
    if (!javaInfo) {
      throw new Error('Java runtime not found. Please install Java 21 or later.')
    }

    const settings = loadSettingsSync()
    const ram = settings.ram || DEFAULT_SETTINGS.ram
    const jvmArgs = settings.args || DEFAULT_SETTINGS.args

    webContents.send('launch-status', { state: 'syncing', progress: 40, message: `Preparing Minecraft ${manifest?.minecraft || 'latest'} profile...` })

    const { createGameDirectory } = require('./utils/game-launcher')
    
    const gameDir = await createGameDirectory(manifest || { minecraft: 'latest', id: server?.id || 'default' })
    
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
      javaPath: (function() {
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

    // Handle Forge/Fabric if specified in manifest
    if (manifest?.loader === 'forge') {
      const customName = `forge-${versionNum}`
      if (fs.existsSync(path.join(gameDir, 'versions', customName, `${customName}.json`))) {
        opts.version.custom = customName
      } else {
        console.log(`[LAUNCHER] Custom version ${customName} not found, falling back to vanilla ${versionNum}.`)
      }
    } else if (manifest?.loader === 'fabric') {
      const customName = `fabric-${versionNum}`
      if (fs.existsSync(path.join(gameDir, 'versions', customName, `${customName}.json`))) {
        opts.version.custom = customName
      } else {
        console.log(`[LAUNCHER] Custom version ${customName} not found, falling back to vanilla ${versionNum}.`)
      }
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

    webContents.send('launch-status', { state: 'running', progress: 100, message: 'CyberCraft is now running!' })

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
    if (wsManager) wsManager.disconnect()
    if (activeGameProcess) { activeGameProcess.kill(); activeGameProcess = null }
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
  if (activeGameProcess) { activeGameProcess.kill(); activeGameProcess = null }
  closeCache()
})

module.exports = { getApiBaseUrl, apiRequest }
