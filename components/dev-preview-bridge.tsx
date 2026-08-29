'use client'

/**
 * Dev-only stand-in for the Electron preload bridge.
 *
 * The launcher UI is driven entirely by `window.electronAPI`, which only
 * exists inside Electron. Opened in a plain browser the session never
 * resolves, so the login screen is the only reachable state and the rest
 * of the UI cannot be reviewed without booting Electron and a backend.
 *
 * This installs a mock bridge so every screen is browsable at
 * `next dev`. Two guards keep it out of everything else:
 *
 *   1. `process.env.NODE_ENV === 'development'` - the static export used
 *      by the packaged app is built in production mode, so this whole
 *      module is dead code there.
 *   2. `!window.electronAPI` - when Electron runs the dev server the real
 *      preload bridge is already present, and it is never overwritten.
 *
 * The install happens during render rather than in an effect because the
 * consumer reads `window.electronAPI` in its own mount effect, and child
 * effects run before a parent's. Rendering is the only hook that is
 * guaranteed to run first. The guard makes it idempotent under
 * StrictMode's double render.
 */

const MOCK_SERVERS: LauncherServer[] = [
  {
    id: 'obsidian-valley',
    name: 'Obsidian Valley',
    ip_address: '10.0.0.11',
    port: 25565,
    status: 'online',
    current_players: 847,
    max_players: 1200,
    description:
      "Uzun muddatli survival dunyosi. Yer uchastkalari himoyalangan, iqtisodiyot o'yinchilar qo'lida.",
    minecraft_version: '1.21.4',
    modpack_version: '2.4.1',
    whitelist_enabled: true,
    server_type: 'Survival',
    is_managed: true,
    loader: 'fabric',
    ping: 23,
  },
  {
    id: 'neon-drift',
    name: 'Neon Drift',
    ip_address: '10.0.0.12',
    port: 25566,
    status: 'online',
    current_players: 312,
    max_players: 500,
    description: "Tezkor janglar, har 8 daqiqada yangi raund. Reyting bo'yicha juftlashtirish.",
    minecraft_version: '1.21.1',
    modpack_version: '1.9.0',
    whitelist_enabled: false,
    server_type: 'PvP Arena',
    is_managed: true,
    loader: 'neoforge',
    ping: 41,
  },
  {
    id: 'skyforge',
    name: 'Skyforge',
    ip_address: '10.0.0.13',
    port: 25567,
    status: 'starting',
    current_players: 0,
    max_players: 300,
    description: 'Bitta blokdan butun orol quring. Har bosqichda yangi resurslar ochiladi.',
    minecraft_version: '1.20.4',
    modpack_version: '0.8.2',
    whitelist_enabled: false,
    server_type: 'OneBlock',
    is_managed: false,
    loader: 'quilt',
    ping: 68,
  },
  {
    id: 'deepcore',
    name: 'Deepcore',
    ip_address: '10.0.0.14',
    port: 25568,
    status: 'offline',
    current_players: 0,
    max_players: 250,
    description: "218 ta mod bilan sanoat modpaki. Texnik o'yin uchun.",
    minecraft_version: '1.20.1',
    modpack_version: '3.1.7',
    whitelist_enabled: true,
    server_type: 'Modded',
    is_managed: true,
    loader: 'forge',
    ping: -1,
  },
]

const MOCK_USER: LauncherUser = {
  id: 1,
  username: 'lxz_404',
  email: 'preview@cybercraft.uz',
  is_whitelisted: true,
  is_operator: true,
  rank: 'Operator',
  cc_balance: 4820,
}

function manifestFor(serverId: string): LauncherManifest {
  const server = MOCK_SERVERS.find((s) => s.id === serverId) ?? MOCK_SERVERS[0]
  const file = (name: string) => ({ name, hash: '', size: 0, required: true, url: null })
  return {
    id: server.id,
    name: server.name,
    address: `${server.ip_address}:${server.port}`,
    minecraft: server.minecraft_version,
    loader: server.loader ?? 'fabric',
    loaderVersion: '0.16.9',
    version: server.modpack_version ?? '1.0.0',
    files: {
      mods: Array.from({ length: 218 }, (_, i) => file(`mod-${i + 1}.jar`)),
      resourcepacks: Array.from({ length: 6 }, (_, i) => file(`pack-${i + 1}.zip`)),
      shaders: Array.from({ length: 3 }, (_, i) => file(`shader-${i + 1}.zip`)),
    },
    forbidden: [],
  }
}

/** Most event subscriptions are inert here: nothing in the mock emits. */
const noSubscription = () => () => {}

/**
 * The connection badge stays in its "disconnected" state until a socket
 * event arrives, so an inert subscription would show every preview in an
 * error state it would rarely be in for real. This fires once on the next
 * tick to land the UI in its normal connected state.
 */
function immediateSubscription<T>(payload: T) {
  return (callback: (data: T) => void) => {
    const id = setTimeout(() => callback(payload), 0)
    return () => clearTimeout(id)
  }
}

function buildMockBridge(): ElectronAPI {
  let settings = {
    ram: 8,
    args: '-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200',
    optimize: true,
    fullscreen: false,
    autoClose: true,
    apiBaseUrl: 'http://127.0.0.1:8000/api/v1',
    gamePath: 'C:\\Users\\preview\\AppData\\Roaming\\CyberCraft\\game',
    modsPath: 'C:\\Users\\preview\\AppData\\Roaming\\CyberCraft\\servers',
  }

  return {
    minimize: () => {},
    close: () => {},
    openExternal: (url: string) => window.open(url, '_blank', 'noopener,noreferrer'),

    loadSettings: async () => settings,
    saveSettings: async (next) => {
      settings = { ...settings, ...next, autoClose: next.autoClose ?? settings.autoClose }
      return true
    },
    selectDirectory: async () => null,

    getSession: async () => ({ authenticated: true, user: MOCK_USER }),
    login: async () => ({ authenticated: true, user: MOCK_USER }),
    startOauth: async () => ({ authenticated: true, user: MOCK_USER }),
    logout: async () => true,
    listServers: async () => MOCK_SERVERS,
    getManifest: async (serverId: string) => manifestFor(serverId),
    checkLauncherUpdate: async () => ({ updateAvailable: false }),
    getWsToken: async () => ({ token: '', expires_at: '', ws_endpoints: {} }),

    downloadServerFiles: async (serverId: string) => ({
      success: true,
      files: [],
      baseDir: `${settings.modsPath}\\${serverId}`,
    }),
    launchGame: async () => ({ success: true, pid: 0 }),
    stopGame: async () => true,

    detectJava: async () => {
      const best: JavaInfo = {
        path: 'C:\\Program Files\\Eclipse Adoptium\\jdk-21\\bin\\java.exe',
        version: 21,
        vendor: 'Eclipse Adoptium',
        isValid: true,
      }
      return { all: [best], best }
    },
    validateJava: async () => null,
    getSystemMemory: async () => 32,

    checkUpdate: async () => ({ updateAvailable: false }),
    downloadUpdate: async () => {},
    installUpdate: async () => {},

    hasValidCache: async () => true,
    getCachedServers: async () => MOCK_SERVERS,

    onLaunchStatus: noSubscription,
    onGameLog: noSubscription,
    onDownloadProgress: noSubscription,
    onWsConnected: immediateSubscription({ endpoint: 'status' }),
    onWsDisconnected: noSubscription,
    onWsStatus: noSubscription,
    onWsConsole: noSubscription,
    onWsLaunchProgress: noSubscription,
    onWsUpdate: noSubscription,
    onUpdateAvailable: noSubscription,
    onUpdateProgress: noSubscription,
    onUpdateDownloaded: noSubscription,
  }
}

export function DevPreviewBridge({ children }: { children: React.ReactNode }) {
  if (
    process.env.NODE_ENV === 'development' &&
    typeof window !== 'undefined' &&
    !window.electronAPI
  ) {
    window.electronAPI = buildMockBridge()
  }
  return <>{children}</>
}
