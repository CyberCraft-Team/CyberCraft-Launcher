const CONFIG = {
  API_BASE_URL:
    (typeof window !== "undefined" && window.CYBERCRAFT_API_URL) ||
    "http://127.0.0.1:8000",
  // API versiya prefiksi — barcha endpointlar shu ostida
  API_PREFIX: "/api/v1",
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
  serverPingInterval: null,
  settings: {
    ram: 4,
    javaPath: "",
    gameDir: "",
    hideOnLaunch: true,
    optimizeJava: true,
    fullscreen: false,
    debug: false,
    redownload: false,
  },
};

const isElectron = typeof window !== "undefined" && window.electronAPI;

const getEl = (id) => document.getElementById(id);

const elements = {
  // Login
  loginPage: getEl("loginPage"),
  loginForm: getEl("loginForm"),
  loginBtn: getEl("loginBtn"),
  loginError: getEl("loginError"),
  usernameInput: getEl("username"),
  passwordInput: getEl("password"),
  rememberMe: getEl("rememberMe"),

  // Main
  mainContainer: getEl("mainContainer"),
  titleBarActions: getEl("titleBarActions"),
  titleUsername: getEl("titleUsername"),
  userRankBadge: getEl("userRankBadge"),
  userBalance: getEl("userBalance"),
  logoutBtn: getEl("logoutBtn"),
  totalOnlineCount: getEl("totalOnlineCount"),

  // Server Detail (Primary)
  serverDetailPage: getEl("serverDetailPage"),
  detailBackground: getEl("detailBackground"),
  detailServerName: getEl("detailServerName"),
  detailDescription: getEl("detailDescription"),
  detailCategory: getEl("detailCategory"),
  detailFavStar: getEl("detailFavStar"),
  detailOnlineCount: getEl("detailOnlineCount"),
  detailLastWipe: getEl("detailLastWipe"),
  detailGallery: getEl("detailGallery"),
  detailFeaturesTitle: getEl("detailFeaturesTitle"),
  detailFeaturesGrid: getEl("detailFeaturesGrid"),
  optionalModsLink: getEl("optionalModsLink"),
  playBtn: getEl("playBtn"),

  // Bottom Server List
  serverBottomBar: getEl("serverBottomBar"),
  serverIconList: getEl("serverIconList"),

  // Manifest / Status
  manifestBadge: getEl("manifestBadge"),
  modsCount: getEl("modsCount"),
  totalSize: getEl("totalSize"),
  syncStatus: getEl("syncStatus"),

  // Settings Modal
  settingsBtn: getEl("settingsBtn"),
  settingsOverlay: getEl("settingsOverlay"),
  settingsCloseBtn: getEl("settingsCloseBtn"),
  gameDir: getEl("gameDir"),
  settingsRamSlider: getEl("settingsRamSlider"),
  settingsRamValueMB: getEl("settingsRamValueMB"),
  browseGameDir: getEl("browseGameDir"),
  openGameDir: getEl("openGameDir"),
  resetGameDir: getEl("resetGameDir"),
  optimizeJava: getEl("optimizeJava"),
  fullscreenMode: getEl("fullscreenMode"),
  debugMode: getEl("debugMode"),
  redownloadFiles: getEl("redownloadFiles"),
  settingsResetBtn: getEl("settingsResetBtn"),
  settingsCancelBtn: getEl("settingsCancelBtn"),
  settingsSaveBtn: getEl("settingsSaveBtn"),

  // Loading
  loadingOverlay: getEl("loadingOverlay"),
  loadingText: getEl("loadingText"),
  progressFill: getEl("progressFill"),
  progressText: getEl("progressText"),
  syncDetails: getEl("syncDetails"),

  // Crash Modal
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
