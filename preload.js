const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  minimize: () => ipcRenderer.send("minimize-window"),
  maximize: () => ipcRenderer.send("maximize-window"),
  close: () => ipcRenderer.send("close-window"),

  saveToken: (token) => ipcRenderer.invoke("save-token", token),
  getToken: () => ipcRenderer.invoke("get-token"),
  saveUser: (user) => ipcRenderer.invoke("save-user", user),
  getUser: () => ipcRenderer.invoke("get-user"),
  clearToken: () => ipcRenderer.invoke("clear-token"),

  getSettings: () => ipcRenderer.invoke("get-settings"),
  saveSettings: (settings) => ipcRenderer.invoke("save-settings", settings),
  getSystemRam: () => ipcRenderer.invoke("get-system-ram"),

  scanGameFolder: () => ipcRenderer.invoke("scan-game-folder"),
  deleteFile: (category, filename) =>
    ipcRenderer.invoke("delete-file", category, filename),
  downloadFile: (category, filename, url, expectedHash) =>
    ipcRenderer.invoke("download-file", category, filename, url, expectedHash),
  checkFileHash: (category, filename) =>
    ipcRenderer.invoke("check-file-hash", category, filename),

  openFileDialog: () => ipcRenderer.invoke("open-file-dialog"),
  openFolderDialog: () => ipcRenderer.invoke("open-folder-dialog"),

  checkJavaVersion: (javaPath) =>
    ipcRenderer.invoke("check-java-version", javaPath),
  findJava21: () => ipcRenderer.invoke("find-java-21"),

  launchGame: (options) => ipcRenderer.invoke("launch-game", options),

  // Yo'q bo'lgan API'lar
  clearCache: () => ipcRenderer.invoke("clear-cache"),
  getCacheSize: () => ipcRenderer.invoke("get-cache-size"),
  openLogsFolder: () => ipcRenderer.invoke("open-logs-folder"),
  openGameFolder: () => ipcRenderer.invoke("open-game-folder"),
  setAutoLaunch: (enabled) => ipcRenderer.invoke("set-auto-launch", enabled),
  setDiscordRPC: (enabled) => ipcRenderer.invoke("set-discord-rpc", enabled),

  // IPC listener'lar (cleanup bilan)
  onLaunchProgress: (callback) => {
    ipcRenderer.removeAllListeners("launch-progress");
    ipcRenderer.on("launch-progress", (event, data) => callback(data));
  },
  onDownloadStatus: (callback) => {
    ipcRenderer.removeAllListeners("download-status");
    ipcRenderer.on("download-status", (event, data) => callback(data));
  },
  onDownloadProgress: (callback) => {
    ipcRenderer.removeAllListeners("download-progress");
    ipcRenderer.on("download-progress", (event, data) => callback(data));
  },
  onGameClose: (callback) => {
    ipcRenderer.removeAllListeners("game-closed");
    ipcRenderer.on("game-closed", (event, code) => callback(code));
  },
  onGameError: (callback) => {
    ipcRenderer.removeAllListeners("game-error");
    ipcRenderer.on("game-error", (event, error) => callback(error));
  },

  // Crash log va Playtime
  readCrashLog: () => ipcRenderer.invoke("read-crash-log"),
  getPlaytime: (serverId) => ipcRenderer.invoke("get-playtime", serverId),
  savePlaytime: (serverId, seconds) =>
    ipcRenderer.invoke("save-playtime", serverId, seconds),

  // Auto-Update
  checkForUpdate: () => ipcRenderer.invoke("check-for-update"),
  downloadUpdate: (downloadUrl) =>
    ipcRenderer.invoke("download-update", downloadUrl),
  installUpdate: (filePath) => ipcRenderer.invoke("install-update", filePath),
  getLauncherVersion: () => ipcRenderer.invoke("get-launcher-version"),
  onUpdateProgress: (callback) => {
    ipcRenderer.removeAllListeners("update-progress");
    ipcRenderer.on("update-progress", (event, data) => callback(data));
  },
});
