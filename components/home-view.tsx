'use client'

import { motion } from 'framer-motion'
import { Play, Users, Activity, Clock, Server, RefreshCw, Download, CheckCircle2, Wifi, WifiOff, WifiZero, FolderOpen, AlertCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

type PlayState = 'idle' | 'launching' | 'running' | 'error'
type ConnectionStatus = 'connecting' | 'connected' | 'offline' | 'disconnected'
type DownloadState = 'idle' | 'downloading' | 'completed' | 'error'

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Users
  label: string
  value: string
  color: string
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all"
      style={{
        background: '#12121a',
        border: '1px solid #1a1a2e',
        transition: 'all 0.3s ease',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = `${color}44`
        el.style.boxShadow = `0 0 20px ${color}15`
        el.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = '#1a1a2e'
        el.style.boxShadow = 'none'
        el.style.transform = 'translateY(0)'
      }}
    >
      <span
        className="flex size-10 items-center justify-center rounded-lg"
        style={{ background: `${color}20`, color }}
      >
        <Icon className="size-5" />
      </span>
      <div className="flex flex-col">
        <span className="text-lg font-bold leading-none" style={{ color: '#ffffff' }}>{value}</span>
        <span className="text-xs" style={{ color: '#8888aa' }}>{label}</span>
      </div>
    </div>
  )
}

function LoginPanel({
  onLogin,
  error,
}: {
  onLogin: (username: string, password: string) => Promise<void>
  error: string
}) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState('')

  const displayError = localError || error
  const isGoogleAccount =
    displayError &&
    (displayError.toLowerCase().includes("noto'g'ri") ||
      displayError.toLowerCase().includes('incorrect') ||
      displayError.toLowerCase().includes('invalid') ||
      displayError.toLowerCase().includes('password'))

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
      setLocalError(loginError instanceof Error ? loginError.message : 'Kirish muvaffaqiyatsiz bo\'ldi')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="mt-6 flex max-w-md flex-col gap-3 rounded-2xl p-5"
      style={{ background: '#12121a', border: '1px solid rgba(0,240,255,0.2)', boxShadow: '0 0 30px rgba(0,240,255,0.05)' }}
    >
      <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#00f0ff' }}>
        <Server className="size-4" /> Launcherga kirish
      </span>

      <input
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        className="rounded-xl px-3 py-2.5 text-sm outline-none transition-all"
        style={{
          background: '#0d0d14',
          border: '1px solid #1a1a2e',
          color: '#ffffff',
        }}
        placeholder="Foydalanuvchi nomi"
        autoComplete="username"
        onFocus={e => {
          e.target.style.borderColor = '#00f0ff'
          e.target.style.boxShadow = '0 0 0 2px rgba(0,240,255,0.15)'
        }}
        onBlur={e => {
          e.target.style.borderColor = '#1a1a2e'
          e.target.style.boxShadow = 'none'
        }}
      />

      <input
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        onKeyDown={(event) => { if (event.key === 'Enter') submit() }}
        className="rounded-xl px-3 py-2.5 text-sm outline-none transition-all"
        style={{
          background: '#0d0d14',
          border: '1px solid #1a1a2e',
          color: '#ffffff',
        }}
        placeholder="Parol"
        type="password"
        autoComplete="current-password"
        onFocus={e => {
          e.target.style.borderColor = '#00f0ff'
          e.target.style.boxShadow = '0 0 0 2px rgba(0,240,255,0.15)'
        }}
        onBlur={e => {
          e.target.style.borderColor = '#1a1a2e'
          e.target.style.boxShadow = 'none'
        }}
      />

      {displayError && (
        <div className="flex flex-col gap-1">
          <p className="text-xs" style={{ color: '#ff4444' }}>{displayError}</p>
          {isGoogleAccount && (
            <p className="text-xs" style={{ color: '#8888aa' }}>
              💡 Agar siz Google orqali ro&apos;yxatdan o&apos;tgan bo&apos;lsangiz, avval saytda alohida launcher paroli o&apos;rnatishingiz kerak.
            </p>
          )}
        </div>
      )}

      <button
        onClick={submit}
        disabled={busy}
        className="cyber-btn mt-1 rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-70"
        style={{ fontFamily: 'inherit' }}
      >
        {busy ? 'Kirilmoqda...' : 'Kirish'}
      </button>
    </div>
  )
}

export function HomeView({
  user,
  servers,
  loadingSession,
  loadingServers,
  connectionError,
  onLogin,
  onRefreshServers,
}: {
  user: LauncherUser | null
  servers: LauncherServer[]
  loadingSession: boolean
  loadingServers: boolean
  connectionError: string
  onLogin: (username: string, password: string) => Promise<void>
  onRefreshServers: () => void
}) {
  const [selectedServerId, setSelectedServerId] = useState('')
  const [state, setState] = useState<PlayState>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [liveServers, setLiveServers] = useState<LauncherServer[]>(servers)
  const [downloadState, setDownloadState] = useState<DownloadState>('idle')
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number; file: string; percent: number } | null>(null)
  const [downloadedFiles, setDownloadedFiles] = useState<number>(0)
  const [modsBaseDir, setModsBaseDir] = useState<string>('')
  const [playProgress, setPlayProgress] = useState(0)

  useEffect(() => {
    if (servers.length > 0) setLiveServers(servers)
  }, [servers])

  const displayServers = liveServers.length > 0 ? liveServers : servers
  const selectedServer = displayServers.find((s) => s.id === selectedServerId) || displayServers[0] || null
  const onlinePlayers = displayServers.reduce((sum, s) => sum + (s.current_players || 0), 0)
  const onlineServers = displayServers.filter((s) => ['online', 'running', 'starting'].includes(s.status)).length

  useEffect(() => {
    if (!selectedServerId && displayServers[0]) setSelectedServerId(displayServers[0].id)
  }, [displayServers, selectedServerId])

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return

    const unsubLaunchStatus = api.onLaunchStatus((status) => {
      setStatusMessage(status.message)
      setPlayProgress(status.progress)
      if (status.state === 'idle') setState('idle')
      else if (status.state === 'running') setState('running')
      else if (status.state === 'error') {
        setState('error')
        setStatusMessage(status.message)
      }
      else setState('launching')
    })

    const unsubDownloadProgress = api.onDownloadProgress((progress) => {
      if (progress.state === 'error') {
        setDownloadState('error')
        setStatusMessage(progress.message || 'Yuklashda xato yuz berdi')
        return
      }
      setDownloadProgress({
        current: progress.current || 0,
        total: progress.total || 0,
        file: progress.file || '',
        percent: progress.percent || 0,
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
      setLiveServers((prev) => {
        const updated = [...prev]
        for (const wsServer of data.servers) {
          const idx = updated.findIndex((s) => s.id === wsServer.id)
          if (idx >= 0) {
            updated[idx] = { ...updated[idx], status: wsServer.status, current_players: wsServer.current_players, max_players: wsServer.max_players }
          } else {
            updated.push(wsServer as unknown as LauncherServer)
          }
        }
        return updated
      })
    })

    return () => {
      unsubLaunchStatus()
      unsubDownloadProgress()
      unsubWsConnected()
      unsubWsDisconnected()
      unsubWsStatus()
    }
  }, [])

  const handleDownload = useCallback(async () => {
    if (!selectedServer || !window.electronAPI) return
    setDownloadState('downloading')
    setDownloadProgress(null)
    setStatusMessage('Server fayllari yuklanmoqda...')
    try {
      const result = await window.electronAPI.downloadServerFiles(selectedServer.id)
      setDownloadState('completed')
      setDownloadedFiles(result.files.length)
      setModsBaseDir(result.baseDir)
      setStatusMessage(`${result.files.length} ta fayl muvaffaqiyatli yuklandi!`)
    } catch (error) {
      setDownloadState('error')
      setStatusMessage(error instanceof Error ? error.message : 'Yuklash muvaffaqiyatsiz bo\'ldi')
    }
  }, [selectedServer])

  const handlePlay = useCallback(() => {
    if (state !== 'idle' || !selectedServer || !window.electronAPI) return
    setState('launching')
    setPlayProgress(0)
    setStatusMessage('Ishga tushirish bosqichi boshlanmoqda...')
    window.electronAPI
      .launchGame(selectedServer, modsBaseDir || undefined)
      .catch((error) => {
        setState('error')
        setPlayProgress(0)
        setStatusMessage(error instanceof Error ? error.message : 'Ishga tushirish muvaffaqiyatsiz bo\'ldi')
      })
  }, [state, selectedServer, modsBaseDir])

  const canDownload = selectedServer && downloadState !== 'downloading'
  const canPlay = selectedServer && (state === 'idle' || state === 'error') && modsBaseDir

  // ── Login screen ──
  if (!user && !loadingSession) {
    return (
      <div className="relative flex h-full flex-col">
        <motion.header initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-[0.25em]" style={{ color: 'rgba(0,240,255,0.7)' }}>
              CyberCraft Network
            </span>
            {connectionError && (
              <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]" style={{ background: 'rgba(255,68,68,0.15)', color: '#ff6666' }}>
                <WifiOff className="size-3" /> Ulanish xatosi
              </span>
            )}
          </div>
          <h1
            className="glitch font-display text-4xl md:text-5xl"
            data-text="Xush kelibsiz"
            style={{ fontWeight: 900 }}
          >
            <span style={{ color: '#ffffff' }}>Xush </span>
            <span style={{ color: '#00f0ff', textShadow: '0 0 20px rgba(0,240,255,0.8)' }}>kelibsiz</span>
          </h1>
          <p className="text-sm" style={{ color: '#8888aa' }}>
            CyberCraft server modlarini yuklash uchun kiring.
          </p>
        </motion.header>

        <LoginPanel onLogin={onLogin} error={connectionError} />
      </div>
    )
  }

  // ── Loading ──
  if (loadingSession) {
    return (
      <div className="flex h-full items-center justify-center">
        <motion.span
          className="size-10 rounded-full border-[3px]"
          style={{ borderColor: 'rgba(0,240,255,0.2)', borderTopColor: '#00f0ff' }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
        />
      </div>
    )
  }

  // ── Main content ──
  return (
    <div className="relative flex h-full flex-col">
      {/* Header */}
      <motion.header initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-[0.25em]" style={{ color: 'rgba(0,240,255,0.7)' }}>
            CyberCraft Network
          </span>
          {connectionStatus === 'connected' && (
            <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]" style={{ background: 'rgba(0,255,136,0.15)', color: '#00ff88' }}>
              <Wifi className="size-3" /> Jonli
            </span>
          )}
          {connectionStatus === 'offline' && (
            <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]" style={{ background: 'rgba(255,170,0,0.15)', color: '#ffaa00' }}>
              <WifiOff className="size-3" /> Oflayn keshlangan
            </span>
          )}
          {connectionStatus === 'connecting' && (
            <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]" style={{ background: 'rgba(0,240,255,0.15)', color: '#00f0ff' }}>
              <WifiZero className="size-3" /> Ulanilmoqda...
            </span>
          )}
          {connectionStatus === 'disconnected' && (
            <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]" style={{ background: 'rgba(255,68,68,0.15)', color: '#ff6666' }}>
              <WifiOff className="size-3" /> Uzilgan
            </span>
          )}
        </div>

        <h1
          className="glitch font-display text-3xl md:text-4xl"
          data-text={`Xush kelibsiz, ${user?.username || "O'yinchi"}`}
          style={{ fontWeight: 900 }}
        >
          <span style={{ color: '#ffffff' }}>Xush kelibsiz, </span>
          <span style={{ color: '#00f0ff', textShadow: '0 0 16px rgba(0,240,255,0.7)' }}>
            {user?.username || "O'yinchi"}
          </span>
        </h1>

        <p className="text-sm" style={{ color: '#8888aa' }}>
          {connectionStatus === 'offline'
            ? "Oflayn rejim — keshlangan serverlar ko'rsatilmoqda."
            : "Server tanlang va backend modlarini yuklab oling."}
        </p>
      </motion.header>

      {/* Stat cards */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-6 grid gap-3 sm:grid-cols-3"
      >
        <StatCard icon={Users} label="Onlayn o'yinchilar" value={onlinePlayers.toLocaleString()} color="#00f0ff" />
        <StatCard
          icon={Activity}
          label="Server holati"
          value={onlineServers ? 'Onlayn' : displayServers.length ? 'Oflayn' : 'Sinx'}
          color={onlineServers > 0 ? '#00ff88' : '#ff0060'}
        />
        <StatCard icon={Clock} label="Serverlar" value={displayServers.length ? String(displayServers.length) : '0'} color="#ff0060" />
      </motion.div>

      {/* Server info card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-4 flex items-center gap-4 overflow-hidden rounded-2xl p-5"
        style={{ background: '#12121a', border: '1px solid rgba(0,240,255,0.15)', boxShadow: '0 0 20px rgba(0,240,255,0.05)' }}
      >
        <span
          className="flex size-12 shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'rgba(0,240,255,0.12)', color: '#00f0ff' }}
        >
          {downloadState === 'completed' ? (
            <CheckCircle2 className="size-6" />
          ) : (
            <FolderOpen className="size-6" />
          )}
        </span>
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wider" style={{ color: 'rgba(0,240,255,0.7)' }}>
            {connectionStatus === 'connected' ? 'Jonli holat' : connectionStatus === 'offline' ? 'Keshlangan server' : "So'nggi yangilanish"}
          </span>
          <h3 className="font-display text-lg" style={{ color: '#ffffff' }}>
            {selectedServer?.name || 'CyberCraft Launcher'}
          </h3>
          <p className="text-sm" style={{ color: '#8888aa' }}>
            {selectedServer
              ? `${selectedServer.ip_address}:${selectedServer.port} · ${selectedServer.minecraft_version} · ${selectedServer.status}${selectedServer.current_players != null ? ` · ${selectedServer.current_players}/${selectedServer.max_players} o'yinchi` : ''}`
              : 'Backend server profillari kutilmoqda.'}
          </p>
        </div>
      </motion.div>

      {/* Controls */}
      <div className="mt-auto flex flex-col gap-4 pt-6">
        {/* Server selector */}
        <div className="max-w-md">
          <div className="flex flex-col gap-2 rounded-xl p-3" style={{ background: '#12121a', border: '1px solid #1a1a2e' }}>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#00f0ff' }}>
                <Server className="size-4" /> Server
              </span>
              <button
                onClick={onRefreshServers}
                disabled={loadingServers}
                className="rounded-md p-1.5 transition-all disabled:opacity-60"
                style={{ color: '#8888aa' }}
                aria-label="Serverlarni yangilash"
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#00f0ff' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#8888aa' }}
              >
                <RefreshCw className={`size-4 ${loadingServers ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <select
              value={selectedServer?.id || ''}
              onChange={(event) => {
                setSelectedServerId(event.target.value)
                setDownloadState('idle')
                setDownloadProgress(null)
                setModsBaseDir('')
              }}
              className="rounded-lg px-3 py-2 text-sm outline-none"
              style={{
                background: '#0d0d14',
                border: '1px solid #1a1a2e',
                color: '#ffffff',
              }}
              onFocus={e => {
                e.target.style.borderColor = '#00f0ff'
                e.target.style.boxShadow = '0 0 0 2px rgba(0,240,255,0.1)'
              }}
              onBlur={e => {
                e.target.style.borderColor = '#1a1a2e'
                e.target.style.boxShadow = 'none'
              }}
            >
              {displayServers.map((server) => (
                <option key={server.id} value={server.id} style={{ background: '#12121a' }}>
                  {server.name} — {server.minecraft_version} — {server.status}{server.current_players != null ? ` (${server.current_players})` : ''}
                </option>
              ))}
              {!displayServers.length && <option value="" style={{ background: '#12121a' }}>Serverlar topilmadi</option>}
            </select>
            {connectionError && <p className="text-xs" style={{ color: '#ff4444' }}>{connectionError}</p>}
          </div>
        </div>

        {/* Download progress bar */}
        {downloadProgress && downloadState === 'downloading' && (
          <div className="max-w-md">
            <div className="flex flex-col gap-2 rounded-xl p-4" style={{ background: '#12121a', border: '1px solid rgba(0,240,255,0.2)' }}>
              <div className="flex items-center justify-between text-xs" style={{ color: '#8888aa' }}>
                <span>Yuklanmoqda: {downloadProgress.file}</span>
                <span>{downloadProgress.current}/{downloadProgress.total}</span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full" style={{ background: '#1a1a2e' }}>
                <motion.div
                  className="absolute left-0 top-0 h-full rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #00a8b3, #00f0ff)',
                    boxShadow: '0 0 8px rgba(0,240,255,0.5)',
                    width: `${downloadProgress.percent}%`,
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${downloadProgress.percent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <span className="text-xs" style={{ color: '#00f0ff' }}>{downloadProgress.percent}%</span>
            </div>
          </div>
        )}

        {/* Download completed info */}
        {downloadState === 'completed' && (
          <div className="max-w-md">
            <div
              className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{
                background: 'rgba(0,255,136,0.08)',
                border: '1px solid rgba(0,255,136,0.3)',
              }}
            >
              <CheckCircle2 className="size-5 shrink-0" style={{ color: '#00ff88' }} />
              <div className="flex flex-col">
                <span className="text-sm font-semibold" style={{ color: '#00ff88' }}>
                  Yuklash tugallandi
                </span>
                <span className="text-xs" style={{ color: '#8888aa' }}>
                  {downloadedFiles} ta fayl muvaffaqiyatli yuklandi
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Download error */}
        {downloadState === 'error' && (
          <div className="max-w-md">
            <div
              className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{
                background: 'rgba(255,68,68,0.08)',
                border: '1px solid rgba(255,68,68,0.3)',
              }}
            >
              <AlertCircle className="size-5 shrink-0" style={{ color: '#ff4444' }} />
              <div className="flex flex-col">
                <span className="text-sm font-semibold" style={{ color: '#ff4444' }}>
                  Yuklashda xato
                </span>
                <span className="text-xs" style={{ color: '#ff8888' }}>
                  {statusMessage}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex max-w-md gap-2">
          {/* Download mods button */}
          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            whileHover={canDownload ? { scale: 1.02 } : {}}
            whileTap={canDownload ? { scale: 0.97 } : {}}
            onClick={handleDownload}
            disabled={!canDownload}
            className="group relative flex h-16 flex-1 items-center justify-center gap-3 overflow-hidden rounded-2xl font-display text-lg tracking-wider disabled:cursor-default"
            style={{
              background: downloadState === 'completed'
                ? 'linear-gradient(135deg, #00cc66, #00ff88)'
                : downloadState === 'error'
                ? 'linear-gradient(135deg, #cc2200, #ff4422)'
                : 'linear-gradient(135deg, #00f0ff, #00a8b3)',
              color: '#0a0a0f',
              fontWeight: 900,
              boxShadow: downloadState === 'completed'
                ? '0 0 30px rgba(0,255,136,0.4)'
                : '0 0 30px rgba(0,240,255,0.4)',
            }}
          >
            {downloadState === 'downloading' ? (
              <motion.span
                className="size-6 rounded-full border-[3px]"
                style={{ borderColor: 'rgba(0,0,0,0.3)', borderTopColor: 'rgba(0,0,0,0.8)' }}
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
              />
            ) : (
              <Download className="size-6" />
            )}
            <span>
              {downloadState === 'idle' && "MODLARNI YUKLASH"}
              {downloadState === 'downloading' && 'YUKLANMOQDA'}
              {downloadState === 'completed' && 'QAYTA YUKLASH'}
              {downloadState === 'error' && 'QAYTA URUNISH'}
            </span>
          </motion.button>

          {/* Play button (only after mods downloaded) */}
          {(downloadState === 'completed' || modsBaseDir) && (
            <motion.button
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={state === 'idle' ? { scale: 1.02 } : {}}
              whileTap={state === 'idle' ? { scale: 0.97 } : {}}
              onClick={state === 'running' ? () => window.electronAPI?.stopGame() : handlePlay}
              disabled={!(state === 'idle' || state === 'running' || state === 'error') || !selectedServer}
              className="group relative flex h-16 w-24 shrink-0 items-center justify-center gap-2 overflow-hidden rounded-2xl font-display text-sm tracking-wider disabled:cursor-default"
              style={{
                background: state === 'error'
                  ? 'linear-gradient(135deg, #cc2200, #ff4422)'
                  : state === 'running'
                  ? 'linear-gradient(135deg, #8800cc, #cc00ff)'
                  : 'linear-gradient(135deg, #00f0ff, #00a8b3)',
                color: '#0a0a0f',
                fontWeight: 900,
                boxShadow: '0 0 30px rgba(0,240,255,0.4)',
              }}
            >
              {state === 'launching' ? (
                <motion.span
                  className="size-5 rounded-full border-[3px]"
                  style={{ borderColor: 'rgba(0,0,0,0.3)', borderTopColor: 'rgba(0,0,0,0.8)' }}
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                />
              ) : (
                <Play className="size-5 fill-current" />
              )}
              <span>
                {state === 'idle' ? "O'YNA" : state === 'launching' ? '...' : state === 'error' ? 'XATO' : "TO'XTAT"}
              </span>
            </motion.button>
          )}
        </div>

        {/* Status message */}
        <p className="h-4 text-xs" style={{ color: '#8888aa' }}>
          {state === 'error'
            ? <span style={{ color: '#ff4444' }}>Xato: {statusMessage}</span>
            : state === 'running'
            ? <span style={{ color: '#00ff88' }}>{statusMessage}</span>
            : state !== 'idle'
            ? statusMessage
            : downloadState === 'completed'
            ? 'Modlar yuklandi. O\'ynash tugmasini bosing.'
            : selectedServer
            ? `${selectedServer.name} serveri modlarini yuklab oling.`
            : "Yuklash uchun server tanlang."}
        </p>
      </div>
    </div>
  )
}
