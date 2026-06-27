export {}

declare global {
  interface LauncherUser {
    id: number
    username: string
    email?: string
    skin_url?: string | null
    skin_face_url?: string | null
    cape_url?: string | null
    is_whitelisted?: boolean
    is_operator?: boolean
    rank?: string
    cc_balance?: number
  }

  interface LauncherServer {
    id: string
    uuid?: string | null
    name: string
    slug?: string
    ip_address: string
    port: number
    status: string
    current_players: number
    max_players: number
    description?: string
    icon_url?: string | null
    background_image_url?: string | null
    minecraft_version: string
    modpack_name?: string | null
    modpack_version?: string | null
    whitelist_enabled?: boolean
    min_ram?: number
    max_ram?: number
    server_type: string
    is_managed?: boolean
    loader?: string
    loader_version?: string | null
    ping?: number
  }

  interface LauncherManifest {
    id: string
    name: string
    address: string
    minecraft: string
    loader: string
    loaderVersion?: string | null
    version: string
    files: {
      mods: Array<{ name: string; hash: string; size: number; required: boolean; url?: string | null }>
      resourcepacks: Array<{ name: string; hash: string; size: number; required: boolean; url?: string | null }>
      shaders: Array<{ name: string; hash: string; size: number; required: boolean; url?: string | null }>
    }
    forbidden: string[]
  }

  interface JavaInfo {
    path: string
    version: number
    vendor: string
    isValid: boolean
  }

  interface WsStatusMessage {
    type: string
    servers: Array<{
      id: string
      name: string
      status: string
      current_players: number
      max_players: number
      is_managed: boolean
    }>
    timestamp: string
  }

  interface WsConsoleMessage {
    type: string
    line: string
    timestamp: string
  }

  interface DownloadProgress {
    current?: number
    total?: number
    file?: string
    state: 'downloading' | 'completed' | 'error'
    percent?: number
    message?: string
    transferredBytes?: number
    totalBytes?: number
    speedBps?: number
  }

  interface UpdateProgress {
    percent: number
    transferred: number
    total: number
    bytesPerSecond: number
  }

  interface ElectronAPI {
    minimize: () => void
    close: () => void
    openExternal: (url: string) => void

    loadSettings: () => Promise<{
      ram: number
      args: string
      optimize: boolean
      fullscreen: boolean
      apiBaseUrl: string
    }>
    saveSettings: (settings: {
      ram: number
      args: string
      optimize: boolean
      fullscreen: boolean
      apiBaseUrl?: string
    }) => Promise<boolean>

    getSession: () => Promise<{ authenticated: boolean; user: LauncherUser | null; error?: string }>
    login: (credentials: { username: string; password: string }) => Promise<{ authenticated: boolean; user: LauncherUser }>
    startOauth: (provider: 'google' | 'telegram') => Promise<{ authenticated: boolean; user: LauncherUser }>
    logout: () => Promise<boolean>
    listServers: () => Promise<LauncherServer[]>
    getManifest: (serverId: string) => Promise<LauncherManifest>
    createMinecraftSession: () => Promise<{ success: boolean; username: string; uuid: string; expires_in: number }>
    checkLauncherUpdate: () => Promise<any>
    getWsToken: () => Promise<{ token: string; expires_at: string; ws_endpoints: Record<string, string> }>

    downloadServerFiles: (serverId: string) => Promise<{ success: boolean; files: Array<{ name: string; type: string; path: string; size: number }>; baseDir: string }>
    launchGame: (server: LauncherServer | null, modsDir?: string) => Promise<{ success: boolean; pid: number }>
    stopGame: () => Promise<boolean>

    detectJava: () => Promise<{ all: JavaInfo[]; best: JavaInfo | null }>
    validateJava: (javaPath: string) => Promise<JavaInfo | null>
    getSystemMemory: () => Promise<number>

    checkUpdate: () => Promise<any>
    downloadUpdate: () => Promise<void>
    installUpdate: () => Promise<void>

    hasValidCache: () => Promise<boolean>
    getCachedServers: () => Promise<LauncherServer[]>

    onLaunchStatus: (callback: (status: {
      state: 'idle' | 'checking' | 'syncing' | 'loading' | 'running' | 'error'
      progress: number
      message: string
    }) => void) => () => void

    onGameLog: (callback: (line: string) => void) => () => void

    onDownloadProgress: (callback: (progress: DownloadProgress) => void) => () => void

    onWsConnected: (callback: (data: { endpoint: string }) => void) => () => void
    onWsDisconnected: (callback: (data: { endpoint: string; code: number }) => void) => () => void
    onWsStatus: (callback: (data: WsStatusMessage) => void) => () => void
    onWsConsole: (callback: (data: WsConsoleMessage) => void) => () => void
    onWsLaunchProgress: (callback: (data: any) => void) => () => void
    onWsUpdate: (callback: (data: any) => void) => () => void

    onUpdateAvailable: (callback: (info: { version: string; releaseNotes?: string; releaseDate?: string; fileSize: number }) => void) => () => void
    onUpdateProgress: (callback: (progress: UpdateProgress) => void) => () => void
    onUpdateDownloaded: (callback: (info: { version: string; releaseNotes?: string }) => void) => () => void
  }

  interface Window {
    electronAPI?: ElectronAPI
  }
}
