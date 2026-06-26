'use client'

import { motion } from 'framer-motion'
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Gamepad2,
  Gauge,
  Loader2,
  Lock,
  Play,
  RadioTower,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  Users,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

type PlayState = 'idle' | 'checking' | 'syncing' | 'launching' | 'running' | 'error'
type ConnectionStatus = 'connected' | 'offline' | 'disconnected'
type DownloadState = 'idle' | 'downloading' | 'completed' | 'error'

const DEMO_SERVERS: LauncherServer[] = [
  {
    id: 'demo-survival',
    name: 'Survival',
    ip_address: 'play.cybercraft.uz',
    port: 25565,
    status: 'online',
    current_players: 142,
    max_players: 500,
    description: 'Modded survival, economy, clan hududlari va CyberCraft resurslari bilan asosiy dunyo.',
    minecraft_version: '1.21.1',
    modpack_name: 'CyberCore',
    modpack_version: 'v2.4',
    server_type: 'Survival',
    loader: 'NeoForge',
  },
  {
    id: 'demo-oneblock',
    name: 'OneBlock',
    ip_address: 'oneblock.cybercraft.uz',
    port: 25566,
    status: 'online',
    current_players: 86,
    max_players: 200,
    description: 'Bitta blokdan boshlanadigan osmon challenge serveri.',
    minecraft_version: '1.21.1',
    modpack_name: 'SkyCore',
    modpack_version: 'v1.9',
    server_type: 'OneBlock',
    loader: 'NeoForge',
  },
  {
    id: 'demo-boxpvp',
    name: 'BoxPvP',
    ip_address: 'boxpvp.cybercraft.uz',
    port: 25567,
    status: 'online',
    current_players: 37,
    max_players: 150,
    description: 'Tezkor PvP, kitlar va reytingli arenalar.',
    minecraft_version: '1.20.1',
    modpack_name: 'Arena Pack',
    modpack_version: 'v1.2',
    server_type: 'BoxPvP',
    loader: 'Forge',
  },
  {
    id: 'demo-minigames',
    name: 'MiniGames',
    ip_address: 'mini.cybercraft.uz',
    port: 25568,
    status: 'online',
    current_players: 211,
    max_players: 300,
    description: 'Qisqa raundlar, party rejimlari va casual o‘yinlar.',
    minecraft_version: '1.21.4',
    modpack_name: 'Mini Pack',
    modpack_version: 'v3.0',
    server_type: 'MiniGames',
    loader: 'Fabric',
  },
]



function isOnline(server: LauncherServer) {
  return ['online', 'running', 'starting'].includes(server.status)
}

function statusLabel(server: LauncherServer) {
  if (['online', 'running'].includes(server.status)) return 'Onlayn'
  if (server.status === 'starting') return 'Yuklanmoqda'
  return 'Oflayn'
}

function metricNumber(value: number | undefined) {
  return typeof value === 'number' ? value.toLocaleString() : '0'
}

function LoginPanel({
  onLogin,
  onOAuthLogin,
  error,
}: {
  onLogin: (username: string, password: string) => Promise<void>
  onOAuthLogin: (provider: 'google' | 'telegram') => Promise<void>
  error: string
}) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState('')

  const displayError = localError || error

  async function submit() {
    if (!username.trim() || !password) {
      setLocalError('Foydalanuvchi nomi va parol kiritilishi shart.')
      return
    }

    setBusy(true)
    setLocalError('')
    try {
      await onLogin(username.trim(), password)
    } catch (loginError) {
      setLocalError(loginError instanceof Error ? loginError.message : 'Kirish muvaffaqiyatsiz bo‘ldi')
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative w-full max-w-[420px] rounded-3xl border border-cyan-300/20 bg-[#101822]/95 p-8 shadow-[0_24px_80px_rgba(0,240,255,0.09)]"
    >
      <div className="mb-8">
        <h2 className="mt-3 text-3xl font-black text-white">Launcherga kirish</h2>
        <p className="mt-2 text-sm text-[#8ba0b8]">CyberCraft akkauntingiz orqali davom eting.</p>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold text-[#8ba0b8]">Username</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="h-12 w-full rounded-xl border border-[#263246] bg-[#0d1219] px-4 text-sm text-white outline-none transition focus:border-cyan-300 focus:shadow-[0_0_0_2px_rgba(0,240,255,0.14)]"
            placeholder="Username"
            autoComplete="username"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold text-[#8ba0b8]">Parol</span>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit()
            }}
            className="h-12 w-full rounded-xl border border-[#263246] bg-[#0d1219] px-4 text-sm text-white outline-none transition focus:border-cyan-300 focus:shadow-[0_0_0_2px_rgba(0,240,255,0.14)]"
            placeholder="••••••••••"
            type="password"
            autoComplete="current-password"
          />
        </label>

        {displayError && (
          <div className="flex gap-2 rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-xs text-red-200">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{displayError}</span>
          </div>
        )}

        <button
          onClick={submit}
          disabled={busy}
          className="cyber-btn flex h-[52px] w-full items-center justify-center gap-2 rounded-xl text-sm font-black tracking-wide disabled:opacity-70"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
          {busy ? 'Kirilmoqda...' : 'Kirish'}
        </button>

        <div className="flex items-center gap-3 py-1">
          <span className="h-px flex-1 bg-[#263246]" />
          <span className="text-xs text-[#8ba0b8]">Yoki tezkor kirish</span>
          <span className="h-px flex-1 bg-[#263246]" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={async () => {
              setBusy(true)
              setLocalError('')
              try {
                await onOAuthLogin('google')
              } catch (err) {
                setLocalError(err instanceof Error ? err.message : 'Google orqali kirish muvaffaqiyatsiz tugadi')
              } finally {
                setBusy(false)
              }
            }}
            disabled={busy}
            className="flex h-11 items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/[0.08] cursor-pointer disabled:opacity-50"
          >
            <svg className="size-4.5" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.54 14.98 1 12 1 7.35 1 3.37 3.67 1.39 7.56l3.89 3.02C6.21 7.42 8.87 5.04 12 5.04z"
              />
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.28 1.48-1.12 2.74-2.38 3.58l3.7 2.87c2.16-1.99 3.41-4.91 3.41-8.6z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.78a6.99 6.99 0 0 1 0-4.13L1.39 7.63a11.962 11.962 0 0 0 0 8.73l3.89-3.02.002.44z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.7-2.87c-1.03.69-2.34 1.1-3.96 1.1-3.13 0-5.79-2.38-6.73-5.54l-3.89 3.02C3.37 20.33 7.35 23 12 23z"
              />
            </svg>
            Google
          </button>
          <button
            onClick={async () => {
              setBusy(true)
              setLocalError('')
              try {
                await onOAuthLogin('telegram')
              } catch (err) {
                setLocalError(err instanceof Error ? err.message : 'Telegram orqali kirish muvaffaqiyatsiz tugadi')
              } finally {
                setBusy(false)
              }
            }}
            disabled={busy}
            className="flex h-11 items-center justify-center gap-2.5 rounded-xl border border-sky-500/20 bg-sky-500/5 text-sm font-semibold text-white transition hover:border-sky-500/35 hover:bg-sky-500/10 cursor-pointer disabled:opacity-50"
          >
            <svg className="size-4.5 fill-current text-[#229ED9]" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-1.19.8-3.07 2.07-3.07 2.07-.47.32-.9.49-1.29.48-.43-.01-1.25-.24-1.86-.44-.75-.24-1.35-.37-1.3-.79.03-.22.33-.44.9-.66 3.52-1.53 5.87-2.54 7.05-3.03 3.35-1.39 4.05-1.63 4.5-1.64.1 0 .33.02.47.14.12.1.15.24.17.34.02.09.03.26.01.4z" />
            </svg>
            Telegram
          </button>
        </div>
      </div>
    </motion.div>
  )
}

function ServerCard({
  server,
  selected,
  onSelect,
}: {
  server: LauncherServer
  selected: boolean
  onSelect: () => void
}) {
  const online = isOnline(server)
  return (
    <button
      onClick={onSelect}
      className={`group relative flex h-[92px] w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
        selected
          ? 'border-cyan-300/90 bg-[#102032] shadow-[0_0_24px_rgba(0,240,255,0.18)]'
          : online
            ? 'border-[#2a3548] bg-[#10161f]/95 hover:border-cyan-300/35'
            : 'border-red-300/25 bg-[#16141b]/90 hover:border-red-300/45'
      }`}
    >
      <span
        className={`flex size-12 shrink-0 items-center justify-center rounded-xl border ${
          online ? 'border-cyan-200/20 bg-gradient-to-br from-[#224d65] to-[#22ff91]/70' : 'border-red-200/20 bg-[#252a35]'
        }`}
      >
        <Server className={online ? 'size-5 text-[#071017]' : 'size-5 text-red-200'} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-black text-white">{server.name}</span>
        <span className="mt-1 block truncate text-xs text-[#8ba0b8]">{server.server_type || server.loader || 'CyberCraft'}</span>
        <span className={`mt-1 block text-xs font-semibold ${online ? 'text-emerald-300' : 'text-red-200'}`}>
          {metricNumber(server.current_players)} / {metricNumber(server.max_players)}
        </span>
      </span>
      <span
        className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${
          online ? 'border-emerald-300/35 bg-emerald-300/10 text-emerald-300' : 'border-red-300/35 bg-red-400/10 text-red-200'
        }`}
      >
        {statusLabel(server)}
      </span>
    </button>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Users
  label: string
  value: string
  accent: string
}) {
  return (
    <div className="rounded-2xl border border-[#263246] bg-[#101822]/95 p-3">
      <div className="flex items-center gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border" style={{ borderColor: `${accent}45`, background: `${accent}20` }}>
          <Icon className="size-4" style={{ color: accent }} />
        </span>
        <div className="min-w-0">
          <div className="truncate text-base font-black text-white">{value}</div>
          <div className="text-[11px] font-medium text-[#8ba0b8]">{label}</div>
        </div>
      </div>
    </div>
  )
}

function ServerDetail({
  server,
  canPlay,
  state,
  onPlay,
  onStop,
}: {
  server: LauncherServer | null
  canPlay: boolean
  state: PlayState
  onPlay: () => void
  onStop: () => void
}) {
  if (!server) {
    return (
      <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-[#263246] bg-[#101822]/50 text-[#8ba0b8]">
        Serverlar backenddan yuklanmoqda.
      </div>
    )
  }

  const online = isOnline(server)
  const playerValue = `${metricNumber(server.current_players)}/${metricNumber(server.max_players)}`
  const busy = ['checking', 'syncing', 'launching'].includes(state)

  return (
    <section className="flex flex-1 min-h-0 flex-col rounded-3xl border border-cyan-300/20 bg-[#101822]/90 p-4 shadow-[0_24px_80px_rgba(0,240,255,0.08)]">
      <div className="relative h-[120px] overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-br from-[#102a3a] to-[#174b42] p-4 shrink-0">
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(90deg,#ffffff_1px,transparent_1px),linear-gradient(#ffffff_1px,transparent_1px)] [background-size:40px_40px]" />
        <div className="relative z-10 h-full flex flex-col justify-center">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black text-white leading-none">{server.name}</h2>
                <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black leading-none ${online ? 'border-emerald-300/35 bg-emerald-300/10 text-emerald-300' : 'border-red-300/35 bg-red-400/10 text-red-200'}`}>
                  {statusLabel(server)}
                </span>
              </div>
              <p className="mt-2.5 max-w-[500px] text-xs leading-5 text-[#c7d4e6] truncate">
                {server.description || 'CyberCraft serveri uchun tayyorlangan modded o‘yin muhiti.'}
              </p>
            </div>
            <button
              onClick={state === 'running' ? onStop : onPlay}
              disabled={!canPlay && state !== 'running'}
              className={`flex h-9 px-5 items-center justify-center gap-1.5 rounded-xl text-xs font-black tracking-wide transition disabled:cursor-not-allowed disabled:opacity-55 ${
                state === 'running'
                  ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                  : online
                    ? 'bg-gradient-to-br from-cyan-300 to-emerald-300 text-[#071017] shadow-[0_0_15px_rgba(0,240,255,0.3)] hover:scale-[1.02] cursor-pointer'
                    : 'bg-[#263246] text-[#8ba0b8]'
              }`}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-3.5 fill-current" />}
              {state === 'running' ? 'TO‘XTATISH' : busy ? 'TAYYORLANMOQDA' : online ? 'O‘YNASH' : 'SERVER OFLAYN'}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 shrink-0">
        <StatCard icon={Users} label="O‘yinchilar" value={playerValue} accent={online ? '#00f0ff' : '#ff4d6d'} />
        <StatCard icon={Gauge} label="Ping" value={online ? '24 ms' : '--'} accent={online ? '#22ff91' : '#ff4d6d'} />
        <StatCard icon={ShieldCheck} label="Status" value={online ? 'Jonli' : 'Tanaffus'} accent={online ? '#22ff91' : '#ff4d6d'} />
      </div>

      <div className="mt-4 flex-1 min-h-0">
        <div className="flex h-full flex-col rounded-2xl border border-[#263246] bg-[#0d1219]/95 p-4 min-h-0">
          <h3 className="text-sm font-black text-white shrink-0">Server tafsilotlari</h3>
          <div className="mt-3 grid flex-1 grid-cols-2 gap-2 text-xs min-h-0">
            <div className="flex flex-col justify-center rounded-xl bg-white/[0.03] p-2.5 min-h-0">
              <div className="text-[10px] text-[#8ba0b8]">Minecraft</div>
              <div className="mt-0.5 font-semibold text-white">{server.minecraft_version}</div>
            </div>
            <div className="flex flex-col justify-center rounded-xl bg-white/[0.03] p-2.5 min-h-0">
              <div className="text-[10px] text-[#8ba0b8]">Loader</div>
              <div className="mt-0.5 font-semibold text-white">{server.loader || 'NeoForge'}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function LaunchModal({
  state,
  downloadState,
  progress,
  message,
  onCancel,
  onRetry,
}: {
  state: PlayState
  downloadState: DownloadState
  progress: { percent: number; speed: string; eta: string }
  message: string
  onCancel: () => void
  onRetry: () => void
}) {
  const visible = ['checking', 'syncing', 'launching', 'error'].includes(state) || downloadState === 'downloading'
  if (!visible) return null

  const isError = state === 'error' || downloadState === 'error'
  const title = isError
    ? 'Ishga tushirishda xato'
    : downloadState === 'downloading'
      ? 'Modlar yuklanmoqda'
      : state === 'launching'
        ? 'O‘yin ochilmoqda'
        : 'Modlar tekshirilmoqda'
  const percent = Math.max(0, Math.min(100, progress.percent))

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`w-[430px] rounded-3xl border bg-[#101822] p-8 shadow-[0_28px_90px_rgba(0,0,0,0.45)] ${
          isError ? 'border-red-300/35' : 'border-cyan-300/35'
        }`}
      >
        <div className="flex items-start justify-between gap-5">
          <div>
            <h3 className="text-2xl font-black text-white">{title}</h3>
            <p className={`mt-2 text-sm leading-6 ${isError ? 'text-red-200' : 'text-[#8ba0b8]'}`}>
              {message || (isError ? 'Jarayon yakunlanmadi. Qayta urinishingiz mumkin.' : 'Server paketi tayyorlanmoqda.')}
            </p>
          </div>
          <button onClick={onCancel} className="rounded-lg p-2 text-[#8ba0b8] transition hover:bg-white/5 hover:text-white" aria-label="Modalni yopish">
            <X className="size-5" />
          </button>
        </div>

        {!isError ? (
          <>
            <div className="mt-8 h-3 overflow-hidden rounded-full bg-[#1c2738]">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300 shadow-[0_0_18px_rgba(0,240,255,0.45)]"
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
              />
            </div>
            <div className="mt-4 flex items-end justify-between">
              <span className="text-3xl font-black text-cyan-300">{Math.round(percent)}%</span>
              <span className="text-sm font-semibold text-[#dfeaff]">
                {progress.speed} • {progress.eta} qoldi
              </span>
            </div>
            <button onClick={onCancel} className="mt-8 h-11 rounded-xl border border-[#2b3950] px-5 text-sm font-bold text-[#dfeaff] transition hover:border-cyan-300/40">
              Bekor qilish
            </button>
          </>
        ) : (
          <div className="mt-8 flex gap-3">
            <button onClick={onRetry} className="h-12 rounded-xl bg-gradient-to-br from-red-400 to-orange-400 px-5 text-sm font-black text-[#071017]">
              Qayta urinish
            </button>
            <button onClick={onCancel} className="h-12 rounded-xl border border-[#2b3950] px-5 text-sm font-bold text-[#dfeaff]">
              Bekor qilish
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export function HomeView({
  user,
  servers,
  selectedServerId,
  setSelectedServerId,
  loadingSession,
  loadingServers,
  connectionError,
  onLogin,
  onOAuthLogin,
  onRefreshServers,
}: {
  user: LauncherUser | null
  servers: LauncherServer[]
  selectedServerId: string
  setSelectedServerId: (id: string) => void
  loadingSession: boolean
  loadingServers: boolean
  connectionError: string
  onLogin: (username: string, password: string) => Promise<void>
  onOAuthLogin: (provider: 'google' | 'telegram') => Promise<void>
  onRefreshServers: () => void
}) {
  const [state, setState] = useState<PlayState>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [liveServers, setLiveServers] = useState<LauncherServer[]>([])
  const [downloadState, setDownloadState] = useState<DownloadState>('idle')
  const [downloadProgress, setDownloadProgress] = useState<{ percent: number; speed: string; eta: string }>({
    percent: 0,
    speed: 'Tekshirilmoqda',
    eta: '00:12',
  })

  useEffect(() => {
    if (servers.length > 0) setLiveServers(servers)
  }, [servers])

  const displayServers = useMemo(() => {
    const source = liveServers.length > 0 ? liveServers : servers
    return source.length > 0 ? source : DEMO_SERVERS
  }, [liveServers, servers])

  const selectedServer = displayServers.find((server) => server.id === selectedServerId) || displayServers[0] || null
  const onlinePlayers = displayServers.reduce((sum, server) => sum + (server.current_players || 0), 0)
  const onlineServers = displayServers.filter(isOnline).length

  useEffect(() => {
    if (!selectedServerId && displayServers[0]) setSelectedServerId(displayServers[0].id)
  }, [displayServers, selectedServerId])

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return

    const unsubLaunchStatus = api.onLaunchStatus((status) => {
      setStatusMessage(status.message)
      setDownloadProgress((prev) => ({ ...prev, percent: status.progress || prev.percent }))
      if (status.state === 'idle') setState('idle')
      else if (status.state === 'running') setState('running')
      else if (status.state === 'checking') setState('checking')
      else if (status.state === 'syncing') setState('syncing')
      else if (status.state === 'loading') setState('launching')
      else if (status.state === 'error') setState('error')
    })

    const unsubDownloadProgress = api.onDownloadProgress((progress) => {
      if (progress.state === 'error') {
        setDownloadState('error')
        setState('error')
        setStatusMessage(progress.message || 'Yuklashda xato yuz berdi')
        return
      }
      const percent = progress.percent || 0
      setDownloadState(progress.state === 'completed' ? 'completed' : 'downloading')
      setDownloadProgress({
        percent,
        speed: progress.state === 'completed' ? 'Tayyor' : '8.4 MB/s',
        eta: progress.state === 'completed' ? '00:00' : percent > 70 ? '00:18' : '00:42',
      })
    })

    const unsubWsConnected = api.onWsConnected(() => setConnectionStatus('connected'))
    const unsubWsDisconnected = api.onWsDisconnected(() => {
      if (api.hasValidCache) {
        api.hasValidCache().then((valid) => setConnectionStatus(valid ? 'offline' : 'disconnected'))
      } else {
        setConnectionStatus('disconnected')
      }
    })
    const unsubWsStatus = api.onWsStatus((data) => {
      setConnectionStatus('connected')
      setLiveServers((prev) => {
        const base = prev.length > 0 ? [...prev] : [...displayServers]
        for (const wsServer of data.servers) {
          const idx = base.findIndex((server) => server.id === wsServer.id)
          if (idx >= 0) {
            base[idx] = { ...base[idx], status: wsServer.status, current_players: wsServer.current_players, max_players: wsServer.max_players }
          }
        }
        return base
      })
    })

    return () => {
      unsubLaunchStatus()
      unsubDownloadProgress()
      unsubWsConnected()
      unsubWsDisconnected()
      unsubWsStatus()
    }
  }, [displayServers])

  const handlePlay = useCallback(async () => {
    if (!selectedServer || !window.electronAPI || !isOnline(selectedServer)) return

    setState('checking')
    setDownloadState('downloading')
    setDownloadProgress({ percent: 12, speed: 'Tekshirilmoqda', eta: '00:12' })
    setStatusMessage('Server paketi tekshirilmoqda...')

    try {
      const result = await window.electronAPI.downloadServerFiles(selectedServer.id)
      setDownloadState('completed')
      setDownloadProgress({ percent: 100, speed: 'Tayyor', eta: '00:00' })
      setState('launching')
      setStatusMessage('O‘yin ochilmoqda...')
      await window.electronAPI.launchGame(selectedServer, result.baseDir)
    } catch (error) {
      setDownloadState('error')
      setState('error')
      setStatusMessage(error instanceof Error ? error.message : 'Ishga tushirish muvaffaqiyatsiz bo‘ldi')
    }
  }, [selectedServer])

  const handleCancel = useCallback(() => {
    if (state === 'running') window.electronAPI?.stopGame()
    setState('idle')
    setDownloadState('idle')
    setStatusMessage('')
    setDownloadProgress({ percent: 0, speed: 'Tekshirilmoqda', eta: '00:12' })
  }, [state])

  if (!user && !loadingSession) {
    return (
      <div className="relative flex h-full items-center justify-center">
        <LoginPanel onLogin={onLogin} onOAuthLogin={onOAuthLogin} error={connectionError} />
      </div>
    )
  }

  if (loadingSession) {
    return (
      <div className="flex h-full items-center justify-center">
        <motion.span
          className="size-11 rounded-full border-[3px] border-cyan-300/20 border-t-cyan-300"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
        />
      </div>
    )
  }

  const canPlay = Boolean(selectedServer && isOnline(selectedServer) && ['idle', 'error'].includes(state))

  return (
    <div className="relative flex h-full min-h-0">
      <main className="min-w-0 flex-1 flex flex-col h-full">
        <ServerDetail
          server={selectedServer}
          canPlay={canPlay}
          state={state}
          onPlay={handlePlay}
          onStop={() => window.electronAPI?.stopGame()}
        />
      </main>

      <LaunchModal
        state={state}
        downloadState={downloadState}
        progress={downloadProgress}
        message={statusMessage}
        onCancel={handleCancel}
        onRetry={handlePlay}
      />
    </div>
  )
}
