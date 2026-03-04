const CONFIG = {
  API_BASE_URL:
    (typeof window !== "undefined" && window.CYBERCRAFT_API_URL) ||
    "http://127.0.0.1:8000",
  DEMO_MODE: false,
};

function escapeHTML(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

const AppState = {
  isAuthenticated: false,
  user: null,
  token: null,
  servers: [],
  selectedServer: null,
  manifest: null,
  news: [],
  newsFilter: "all",
  selectedNews: null,
  gameStartTime: null,
  serverPingInterval: null,
  settings: {
    ram: 4,
    javaPath: "",
    gameDir: "",
    hideOnLaunch: true,
    startWithWindows: false,
    autoCheckUpdates: true,
    discordRPC: true,
    fullscreen: false,
    gameResolution: "1280x720",
    jvmArgs: "",
    saveLogs: true,
  },
};

const isElectron = typeof window !== "undefined" && window.electronAPI;

// Helper to get element by ID with console warning if missing
const getEl = (id) => {
  const el = document.getElementById(id);
  // if (!el) console.warn(`Element with ID "${id}" not found in DOM.`);
  return el;
};

const elements = {
  loginPage: getEl("loginPage"),
  loginForm: getEl("loginForm"),
  loginBtn: getEl("loginBtn"),
  loginError: getEl("loginError"),
  usernameInput: getEl("username"),
  passwordInput: getEl("password"),
  rememberMe: getEl("rememberMe"),

  mainContainer: getEl("mainContainer"),
  displayUsername: getEl("displayUsername"),
  logoutBtn: getEl("logoutBtn"),
  connectionStatus: getEl("connectionStatus"),
  launcherStatus: getEl("launcherStatus"),

  serverSelect: getEl("serverSelect"),
  // ramSlider: getEl("ramSlider"), // Removed as it's not in index.html
  // ramValue: getEl("ramValue"),   // Removed as it's not in index.html
  playBtn: getEl("playBtn"),
  playtimeDisplay: getEl("playtimeDisplay"),

  manifestBadge: getEl("manifestBadge"),
  modsCount: getEl("modsCount"),
  resourcepacksCount: getEl("resourcepacksCount"),
  shadersCount: getEl("shadersCount"),
  totalSize: getEl("totalSize"),

  serversList: getEl("serversList"),
  newsGrid: getEl("newsGrid"),
  newsListFull: getEl("newsListFull"),

  newsModal: getEl("newsModal"),
  newsModalHeader: getEl("newsModalHeader"),
  newsModalClose: getEl("newsModalClose"),
  newsModalMeta: getEl("newsModalMeta"),
  newsModalTitle: getEl("newsModalTitle"),
  newsModalText: getEl("newsModalText"),

  javaPath: getEl("javaPath"),
  gameDir: getEl("gameDir"),
  hideOnLaunch: getEl("hideOnLaunch"),
  browseJava: getEl("browseJava"),

  loadingOverlay: getEl("loadingOverlay"),
  loadingText: getEl("loadingText"),
  progressFill: getEl("progressFill"),
  progressText: getEl("progressText"),
  syncDetails: getEl("syncDetails"),

  settingsRamSlider: getEl("settingsRamSlider"),
  settingsRamValue: getEl("settingsRamValue"),
  jvmArgs: getEl("jvmArgs"),
  startWithWindows: getEl("startWithWindows"),
  autoCheckUpdates: getEl("autoCheckUpdates"),
  discordRPC: getEl("discordRPC"),
  fullscreen: getEl("fullscreen"),
  gameResolution: getEl("gameResolution"),
  saveLogs: getEl("saveLogs"),
  clearCache: getEl("clearCache"),
  openLogs: getEl("openLogs"),
  openGameDir: getEl("openGameDir"),
  logoutSettings: getEl("logoutSettings"),

  crashModal: getEl("crashModal"),
  crashLogContent: getEl("crashLogContent"),
  crashModalClose: getEl("crashModalClose"),
  openLogsBtn: getEl("openLogsBtn"),

  // Update Modal
  updateOverlay: getEl("updateOverlay"),
  updateCurrentVersion: getEl("updateCurrentVersion"),
  updateNewVersion: getEl("updateNewVersion"),
  updateNotes: getEl("updateNotes"),
  updateProgressSection: getEl("updateProgressSection"),
  updateProgressFill: getEl("updateProgressFill"),
  updateProgressPercent: getEl("updateProgressPercent"),
  updateProgressSize: getEl("updateProgressSize"),
  updateStatus: getEl("updateStatus"),
  updateButtons: getEl("updateButtons"),
  updateDownloadBtn: getEl("updateDownloadBtn"),
};
