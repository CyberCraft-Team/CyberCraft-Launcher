const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  close: () => ipcRenderer.send('window-close'),

  loadSettings: () => ipcRenderer.invoke('load-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),

  getSession: () => ipcRenderer.invoke('api:get-session'),
  login: (credentials) => ipcRenderer.invoke('api:login', credentials),
  logout: () => ipcRenderer.invoke('api:logout'),
  listServers: () => ipcRenderer.invoke('api:list-servers'),
  getManifest: (serverId) => ipcRenderer.invoke('api:get-manifest', serverId),
  createMinecraftSession: () => ipcRenderer.invoke('api:create-minecraft-session'),
  checkLauncherUpdate: () => ipcRenderer.invoke('api:check-launcher-update'),
  getWsToken: () => ipcRenderer.invoke('api:ws-token'),

  downloadServerFiles: (serverId) => ipcRenderer.invoke('download-server-files', serverId),
  launchGame: (server, modsDir) => ipcRenderer.invoke('launch-game', { server, modsDir }),
  stopGame: () => ipcRenderer.invoke('stop-game'),

  detectJava: () => ipcRenderer.invoke('api:detect-java'),
  validateJava: (javaPath) => ipcRenderer.invoke('api:validate-java', javaPath),
  getSystemMemory: () => ipcRenderer.invoke('api:get-system-memory'),

  checkUpdate: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),

  hasValidCache: () => ipcRenderer.invoke('cache:has-valid'),
  getCachedServers: () => ipcRenderer.invoke('cache:get-servers'),

  onLaunchStatus: (callback) => {
    const subscription = (event, status) => callback(status)
    ipcRenderer.on('launch-status', subscription)
    return () => ipcRenderer.removeListener('launch-status', subscription)
  },

  onGameLog: (callback) => {
    const subscription = (event, line) => callback(line)
    ipcRenderer.on('game-log', subscription)
    return () => ipcRenderer.removeListener('game-log', subscription)
  },

  onWsConnected: (callback) => {
    const subscription = (event, data) => callback(data)
    ipcRenderer.on('ws:connected', subscription)
    return () => ipcRenderer.removeListener('ws:connected', subscription)
  },

  onWsDisconnected: (callback) => {
    const subscription = (event, data) => callback(data)
    ipcRenderer.on('ws:disconnected', subscription)
    return () => ipcRenderer.removeListener('ws:disconnected', subscription)
  },

  onWsStatus: (callback) => {
    const subscription = (event, data) => callback(data)
    ipcRenderer.on('ws:status', subscription)
    return () => ipcRenderer.removeListener('ws:status', subscription)
  },

  onWsConsole: (callback) => {
    const subscription = (event, data) => callback(data)
    ipcRenderer.on('ws:console', subscription)
    return () => ipcRenderer.removeListener('ws:console', subscription)
  },

  onWsLaunchProgress: (callback) => {
    const subscription = (event, data) => callback(data)
    ipcRenderer.on('ws:launch-progress', subscription)
    return () => ipcRenderer.removeListener('ws:launch-progress', subscription)
  },

  onWsUpdate: (callback) => {
    const subscription = (event, data) => callback(data)
    ipcRenderer.on('ws:update', subscription)
    return () => ipcRenderer.removeListener('ws:update', subscription)
  },

  onDownloadProgress: (callback) => {
    const subscription = (event, progress) => callback(progress)
    ipcRenderer.on('download-progress', subscription)
    return () => ipcRenderer.removeListener('download-progress', subscription)
  },

  onUpdateAvailable: (callback) => {
    const subscription = (event, info) => callback(info)
    ipcRenderer.on('updater:update-available', subscription)
    return () => ipcRenderer.removeListener('updater:update-available', subscription)
  },

  onUpdateProgress: (callback) => {
    const subscription = (event, progress) => callback(progress)
    ipcRenderer.on('updater:download-progress', subscription)
    return () => ipcRenderer.removeListener('updater:download-progress', subscription)
  },

  onUpdateDownloaded: (callback) => {
    const subscription = (event, info) => callback(info)
    ipcRenderer.on('updater:update-downloaded', subscription)
    return () => ipcRenderer.removeListener('updater:update-downloaded', subscription)
  },
})
