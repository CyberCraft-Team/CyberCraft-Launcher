'use client'

import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowsClockwiseIcon,
  CubeIcon,
  GearSixIcon,
  MinusIcon,
  PlayIcon,
  SignOutIcon,
  StackSimpleIcon,
  StopIcon,
  XIcon,
} from '@phosphor-icons/react'
import { useCallback, useEffect, useState } from 'react'

import { useLauncherSession } from '@/lib/use-launcher-session'
import { useUiVersion } from '@/lib/ui-version'
import { VoxelMark } from './voxel'
import { LoginV2 } from './login-v2'

type Screen = 'home' | 'settings'

function isOnline(server: LauncherServer) {
  return ['online', 'running', 'starting'].includes(server.status)
}

function statusLabel(s: LauncherServer) {
  if (s.status === 'online' || s.status === 'running') return 'ONLINE'
  if (s.status === 'starting') return 'BOOTING'
  return 'OFFLINE'
}

/* ── Nav rail ──────────────────────────────────────────────────────── */

function ServerBlock({
  server,
  active,
  onSelect,
  reduce,
}: {
  server: LauncherServer
  active: boolean
  onSelect: () => void
  reduce: boolean | null
}) {
  const online = server.status === 'online' || server.status === 'running'
  return (
    <button
      onClick={onSelect}
      className={`group relative flex size-11 shrink-0 items-center justify-center v2-face transition-colors ${
        active
          ? 'bg-[var(--v2-acid)]/12 text-[var(--v2-acid)]'
          : 'bg-[var(--v2-raised)] text-[var(--v2-dim)] hover:text-[var(--v2-text)]'
      }`}
      aria-label={server.name}
      aria-current={active ? 'true' : undefined}
    >
      {active && (
        <motion.span
          layoutId={reduce ? undefined : 'v2-rail-active'}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          className="absolute -left-[7px] top-1/2 h-6 w-[3px] -translate-y-1/2 bg-[var(--v2-acid)]"
        />
      )}
      <CubeIcon size={19} weight={active ? 'fill' : 'regular'} />
      <span
        className={`absolute -bottom-px -right-px size-2 ${online ? 'v2-live bg-[var(--v2-acid)]' : ''} ${
          server.status === 'starting' ? 'bg-[var(--v2-warn)]' : ''
        } ${!online && server.status !== 'starting' ? 'bg-[var(--v2-alert)]' : ''}`}
      />
      <span className="pointer-events-none absolute left-[52px] top-1/2 z-50 -translate-y-1/2 scale-0 whitespace-nowrap border border-[var(--v2-line-hot)] bg-[var(--v2-surface)] px-2 py-1 text-[11px] font-medium text-[var(--v2-text)] transition-transform duration-150 group-hover:scale-100 origin-left">
        {server.name}
      </span>
    </button>
  )
}

/* ── Stat block ────────────────────────────────────────────────────── */

function StatBlock({
  label,
  value,
  unit,
  wide = false,
  accent = false,
}: {
  label: string
  value: string
  unit?: string
  wide?: boolean
  accent?: boolean
}) {
  return (
    <div
      className={`v2-face relative flex flex-col justify-between bg-[var(--v2-surface)] p-3.5 ${
        wide ? 'col-span-2' : ''
      }`}
    >
      <span className="v2-pixel text-[8px] leading-none text-[var(--v2-faint)]">{label}</span>
      <span className="mt-3 flex items-baseline gap-1.5">
        {/* The pixel font is a bitmap design, so its digits are already
            fixed-width and stay aligned as these values change. */}
        <span
          className={`v2-pixel text-[17px] leading-none ${
            accent ? 'text-[var(--v2-acid)]' : 'text-[var(--v2-text)]'
          }`}
        >
          {value}
        </span>
        {unit && <span className="v2-mono text-[11px] text-[var(--v2-dim)]">{unit}</span>}
      </span>
    </div>
  )
}

/* ── Settings ──────────────────────────────────────────────────────── */

function SettingsV2() {
  const { uiVersion, setUiVersion } = useUiVersion()
  const [ram, setRam] = useState(8)
  const [maxRam, setMaxRam] = useState(16)
  const [fullscreen, setFullscreen] = useState(false)
  const [autoClose, setAutoClose] = useState(true)
  const [apiBaseUrl, setApiBaseUrl] = useState('')
  const [savedAt, setSavedAt] = useState(0)

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return
    let cancelled = false
    Promise.all([
      api.loadSettings(),
      api.getSystemMemory().catch(() => 16),
    ]).then(([settings, systemGb]) => {
      if (cancelled) return
      setRam(settings.ram)
      setFullscreen(settings.fullscreen)
      setAutoClose(settings.autoClose !== false)
      setApiBaseUrl(settings.apiBaseUrl || '')
      // Never offer the whole machine: the OS and the launcher itself still
      // need headroom while the game runs.
      setMaxRam(Math.max(4, Math.min(32, systemGb - 2)))
    })
    return () => {
      cancelled = true
    }
  }, [])

  /*
   * Settings persist as you change them, so the panel needs no save button.
   * saveSettings replaces the whole object, so the current values are read
   * back first — writing a bare patch would drop paths and JVM args.
   */
  const persist = useCallback(
    async (patch: Partial<Parameters<NonNullable<typeof window.electronAPI>['saveSettings']>[0]>) => {
      const api = window.electronAPI
      if (!api) return
      const current = await api.loadSettings()
      await api.saveSettings({ ...current, ...patch })
      setSavedAt(Date.now())
    },
    [],
  )

  useEffect(() => {
    if (!savedAt) return
    const t = setTimeout(() => setSavedAt(0), 1600)
    return () => clearTimeout(t)
  }, [savedAt])

  const toggles = [
    {
      label: "O'yin ochilganda launcherni yopish",
      on: autoClose,
      set: (v: boolean) => {
        setAutoClose(v)
        persist({ autoClose: v })
      },
    },
    {
      label: "To'liq ekran rejimi",
      on: fullscreen,
      set: (v: boolean) => {
        setFullscreen(v)
        persist({ fullscreen: v })
      },
    },
  ]

  return (
    <div className="flex h-full flex-col overflow-y-auto pr-1">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="v2-pixel text-sm leading-relaxed text-[var(--v2-text)]">SOZLAMALAR</h2>
        {savedAt > 0 && (
          <span className="v2-mono text-[10px] text-[var(--v2-acid)]">SAQLANDI</span>
        )}
      </div>

      <div className="mt-5 space-y-3">
        {/* Design switch. Both directions are fully wired, so this only
            changes which one draws. */}
        <section className="v2-face bg-[var(--v2-surface)] p-4">
          <span className="text-sm font-semibold text-[var(--v2-text)]">Dizayn</span>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(
              [
                { id: 'v1' as const, name: 'KLASSIK', hint: 'Zumrad / yumaloq' },
                { id: 'v2' as const, name: 'VOXEL', hint: 'Kislotali / bloklar' },
              ]
            ).map((option) => {
              const active = uiVersion === option.id
              return (
                <button
                  key={option.id}
                  onClick={() => setUiVersion(option.id)}
                  aria-pressed={active}
                  className={`v2-face flex flex-col items-start gap-1.5 p-3 text-left transition-colors ${
                    active
                      ? 'bg-[var(--v2-acid)]/12 text-[var(--v2-acid)]'
                      : 'bg-[var(--v2-raised)] text-[var(--v2-dim)] hover:text-[var(--v2-text)]'
                  }`}
                >
                  <span className="v2-pixel text-[9px] leading-none">{option.name}</span>
                  <span className="text-[11px] text-[var(--v2-faint)]">{option.hint}</span>
                </button>
              )
            })}
          </div>
        </section>

        <section className="v2-face bg-[var(--v2-surface)] p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-[var(--v2-text)]">Ajratilgan xotira</span>
            <span className="v2-mono text-lg font-bold tabular-nums text-[var(--v2-acid)]">
              {ram} GB
            </span>
          </div>
          {/* Segmented, not a smooth track: memory is allocated in whole
              blocks, and the control should say so. */}
          <div className="mt-3 flex gap-[3px]">
            {Array.from({ length: maxRam }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => {
                  setRam(n)
                  persist({ ram: n })
                }}
                aria-label={`${n} GB`}
                className={`h-6 flex-1 transition-colors ${
                  n <= ram
                    ? 'bg-[var(--v2-acid)] hover:bg-[var(--v2-acid-deep)]'
                    : 'bg-[var(--v2-raised)] hover:bg-[var(--v2-line-hot)]'
                }`}
              />
            ))}
          </div>
          <p className="mt-2 v2-mono text-[10px] text-[var(--v2-faint)]">
            1 GB min / {maxRam} GB max
          </p>
        </section>

        {toggles.map((row) => (
          <button
            key={row.label}
            onClick={() => row.set(!row.on)}
            className="v2-face flex w-full items-center justify-between gap-4 bg-[var(--v2-surface)] p-4 text-left transition-colors hover:bg-[var(--v2-raised)]"
          >
            <span className="text-sm font-medium text-[var(--v2-text)]">{row.label}</span>
            <span
              className={`relative h-6 w-12 shrink-0 border transition-colors ${
                row.on
                  ? 'border-[var(--v2-acid-deep)] bg-[var(--v2-acid)]/20'
                  : 'border-[var(--v2-line-hot)] bg-[var(--v2-sunk)]'
              }`}
            >
              <span
                className={`absolute top-[3px] size-[16px] transition-all duration-150 ${
                  row.on
                    ? 'left-[26px] bg-[var(--v2-acid)]'
                    : 'left-[3px] bg-[var(--v2-faint)]'
                }`}
              />
            </span>
          </button>
        ))}

        <section className="v2-face bg-[var(--v2-surface)] p-4">
          <label className="block text-sm font-semibold text-[var(--v2-text)]">
            Backend manzili
          </label>
          <input
            value={apiBaseUrl}
            onChange={(e) => setApiBaseUrl(e.target.value)}
            onBlur={() => persist({ apiBaseUrl })}
            spellCheck={false}
            className="v2-mono mt-2 h-10 w-full border border-[var(--v2-line-hot)] bg-[var(--v2-sunk)] px-3 text-xs text-[var(--v2-text)] outline-none transition-colors focus:border-[var(--v2-acid)]"
          />
          <p className="mt-2 text-[11px] text-[var(--v2-dim)]">
            O&apos;zgartirilgach qayta tizimga kirish talab qilinadi.
          </p>
        </section>
      </div>
    </div>
  )
}

/* ── Dashboard ─────────────────────────────────────────────────────── */

type PlayState = 'idle' | 'working' | 'running' | 'error'

function DashboardV2({ server }: { server: LauncherServer }) {
  const [state, setState] = useState<PlayState>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [percent, setPercent] = useState(0)
  const [manifest, setManifest] = useState<LauncherManifest | null>(null)
  const online = isOnline(server)

  useEffect(() => {
    if (!window.electronAPI) return
    let cancelled = false
    window.electronAPI
      .getManifest(server.id)
      .then((m) => {
        if (!cancelled) setManifest(m)
      })
      .catch(() => {
        if (!cancelled) setManifest(null)
      })
    return () => {
      cancelled = true
    }
  }, [server.id])

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return

    const unsubLaunch = api.onLaunchStatus((status) => {
      setStatusMessage(status.message)
      if (status.progress) setPercent(status.progress)
      if (status.state === 'idle') setState('idle')
      else if (status.state === 'running') setState('running')
      else if (status.state === 'error') setState('error')
      else setState('working')
    })

    const unsubDownload = api.onDownloadProgress((progress) => {
      if (progress.state === 'error') {
        setState('error')
        setStatusMessage(progress.message || 'Yuklashda xato yuz berdi')
        return
      }
      setState('working')
      setPercent(progress.percent || 0)
    })

    return () => {
      unsubLaunch()
      unsubDownload()
    }
  }, [])

  const handlePlay = useCallback(async () => {
    if (!window.electronAPI || !online) return
    setState('working')
    setPercent(0)
    setStatusMessage('Server paketi tekshirilmoqda...')
    try {
      const result = await window.electronAPI.downloadServerFiles(server.id)
      setPercent(100)
      setStatusMessage("O'yin ochilmoqda...")
      await window.electronAPI.launchGame(server, result.baseDir)
    } catch (error) {
      setState('error')
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Ishga tushirish muvaffaqiyatsiz bo'ldi",
      )
    }
  }, [server, online])

  const handleStop = useCallback(() => {
    window.electronAPI?.stopGame()
    setState('idle')
    setPercent(0)
    setStatusMessage('')
  }, [])

  const running = state === 'running'
  const working = state === 'working'
  const modCount = manifest?.files.mods.length ?? 0

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Asymmetric header: name and action share one row, the action
          block is fixed-width so it never reflows as names change. */}
      <div className="flex items-start justify-between gap-6 border-b border-[var(--v2-line)] pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span
              className={`size-2 shrink-0 ${
                server.status === 'online' || server.status === 'running'
                  ? 'v2-live bg-[var(--v2-acid)]'
                  : server.status === 'starting'
                    ? 'bg-[var(--v2-warn)]'
                    : 'bg-[var(--v2-alert)]'
              }`}
            />
            <span className="v2-pixel text-[8px] text-[var(--v2-faint)]">{statusLabel(server)}</span>
          </div>
          {/* Press Start 2P carries roughly twice the width per glyph of a
              normal sans, so hero type drops to about 60% of the size it
              would otherwise take. */}
          <h1 className="v2-pixel mt-2.5 truncate text-[19px] leading-[1.3] text-[var(--v2-text)]">
            {server.name}
          </h1>
          <p className="mt-2 max-w-[46ch] text-[13px] leading-5 text-[var(--v2-dim)]">
            {server.description}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2">
          <button
            onClick={running ? handleStop : handlePlay}
            disabled={(!online && !running) || working}
            className={`v2-block-btn flex h-12 w-[188px] items-center justify-center gap-2.5 px-6 ${
              running
                ? 'bg-[var(--v2-alert)] text-white'
                : online
                  ? 'bg-[var(--v2-acid-deep)] text-[#06210a]'
                  : 'bg-[var(--v2-raised)] text-[var(--v2-faint)]'
            }`}
          >
            {running ? <StopIcon size={17} weight="fill" /> : <PlayIcon size={17} weight="fill" />}
            <span className="v2-pixel text-[10px] leading-none">
              {running ? 'STOP' : working ? `${percent}%` : online ? 'PLAY' : 'OFFLINE'}
            </span>
          </button>
          <span className="v2-mono text-center text-[10px] text-[var(--v2-faint)]">
            {statusMessage ||
              `${server.minecraft_version} / ${server.loader || 'Vanilla'}`}
          </span>
        </div>
      </div>

      {/* 4-cell grid, 4 real values. The player count earns double width
          because it is the number a player actually opens the app for. */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        <StatBlock
          label="O'YINCHILAR"
          value={online ? `${server.current_players}` : '0'}
          unit={`/ ${server.max_players}`}
          wide
          accent
        />
        <StatBlock
          label="PING"
          value={server.ping && server.ping > 0 ? `${server.ping}` : '--'}
          unit="ms"
        />
        <StatBlock label="MODLAR" value={`${modCount}`} />
      </div>

      {/* Content pane: a vertical spec stack rather than another card
          grid, so the two halves of this screen do not rhyme. */}
      <div className="mt-2 grid min-h-0 flex-1 grid-cols-[1.15fr_1fr] gap-2">
        <div
          className="v2-face relative flex flex-col justify-end overflow-hidden bg-[var(--v2-surface)] p-4"
          style={{
            backgroundImage: `url(${server.background_image_url || '/launcher-bg.png'})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Scrim only where the text sits, so the art stays visible. */}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--v2-void)] via-[var(--v2-void)]/45 to-transparent" />
          <div className="v2-grid-bg absolute inset-0 opacity-30" />
          <div className="relative">
            <span className="v2-pixel text-[8px] text-[var(--v2-acid)]">MODPACK</span>
            <p className="mt-2 v2-mono text-[13px] text-[var(--v2-text)]">
              {manifest ? `v${manifest.version}` : '--'}
            </p>
            <p className="mt-1 text-[11px] text-[var(--v2-dim)]">
              {manifest
                ? `${manifest.files.mods.length} mod / ${manifest.files.resourcepacks.length} resurs paket / ${manifest.files.shaders.length} shader`
                : 'Manifest yuklanmadi'}
            </p>
          </div>
        </div>

        <div className="v2-face flex min-h-0 flex-col bg-[var(--v2-surface)]">
          {[
            { k: 'Rejim', v: server.server_type },
            { k: 'Versiya', v: server.minecraft_version },
            { k: 'Yadro', v: server.loader || 'Vanilla' },
            { k: 'Whitelist', v: server.whitelist_enabled ? 'Yoqilgan' : "O'chirilgan" },
          ].map((row, i) => (
            <div
              key={row.k}
              className={`flex items-center justify-between px-4 py-[13px] ${
                i !== 0 ? 'border-t border-[var(--v2-line)]' : ''
              }`}
            >
              <span className="text-[12px] text-[var(--v2-dim)]">{row.k}</span>
              <span className="v2-mono text-[12px] font-medium text-[var(--v2-text)]">{row.v}</span>
            </div>
          ))}
          <div className="mt-auto flex items-center gap-2 border-t border-[var(--v2-line)] px-4 py-3">
            <StackSimpleIcon size={15} className="text-[var(--v2-acid)]" />
            <span className="text-[11px] text-[var(--v2-dim)]">
              {manifest ? 'Fayllar sinxronlangan' : 'Sinxronlanmagan'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Shell ─────────────────────────────────────────────────────────── */

export function LauncherV2() {
  const reduce = useReducedMotion()
  const [screen, setScreen] = useState<Screen>('home')
  const {
    user,
    servers,
    selectedServerId,
    setSelectedServerId,
    loadingSession,
    loadingServers,
    connectionError,
    connectionStatus,
    onlinePlayers,
    refreshServers,
    login,
    oauthLogin,
    logout,
  } = useLauncherSession()

  const server = servers.find((s) => s.id === selectedServerId) ?? servers[0] ?? null

  if (loadingSession) {
    return (
      <main className="v2-root flex h-[100dvh] w-full items-center justify-center">
        <span className="v2-pixel text-[11px] text-[var(--v2-dim)]">YUKLANMOQDA</span>
      </main>
    )
  }

  return (
    <main className="v2-root relative flex h-[100dvh] w-full flex-col overflow-hidden">
      <div className="v2-grid-bg pointer-events-none fixed inset-0 opacity-60" />

      {/* Header */}
      <header
        className="v2-sweep relative z-10 flex h-14 shrink-0 select-none items-center justify-between border-b border-[var(--v2-line)] bg-[var(--v2-surface)] px-4"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-3">
          <VoxelMark size={20} />
          <span className="v2-pixel text-[11px] leading-none">
            <span className="text-[var(--v2-acid)]">CYBER</span>
            <span className="text-[var(--v2-text)]">CRAFT</span>
          </span>
          {user && (
            <span className="ml-2 hidden items-center gap-2 sm:flex">
              <span
                className={`v2-live size-1.5 ${
                  connectionStatus === 'connected'
                    ? 'bg-[var(--v2-acid)]'
                    : connectionStatus === 'offline'
                      ? 'bg-[var(--v2-warn)]'
                      : 'bg-[var(--v2-alert)]'
                }`}
              />
              <span className="v2-mono text-[11px] tabular-nums text-[var(--v2-dim)]">
                {connectionStatus === 'connected'
                  ? `${onlinePlayers.toLocaleString()} onlayn`
                  : connectionStatus === 'offline'
                    ? 'Oflayn (keshdan)'
                    : 'Ulanish uzildi'}
              </span>
            </span>
          )}
        </div>

        <div
          className="flex items-center gap-1.5"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {user && (
            <span className="mr-2 flex items-center gap-2.5 border border-[var(--v2-line-hot)] bg-[var(--v2-raised)] px-2.5 py-1.5">
              {user.skin_face_url ? (
                <img
                  src={user.skin_face_url}
                  alt={user.username}
                  className="size-6 object-cover"
                  style={{ imageRendering: 'pixelated' }}
                />
              ) : (
                <span className="flex size-6 items-center justify-center bg-[var(--v2-acid)] v2-pixel text-[9px] text-[#06210a]">
                  {user.username.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="text-[12px] font-medium text-[var(--v2-text)]">
                {user.username}
              </span>
              {typeof user.cc_balance === 'number' && (
                <span className="v2-mono text-[11px] tabular-nums text-[var(--v2-acid)]">
                  {user.cc_balance.toLocaleString()} CC
                </span>
              )}
            </span>
          )}
          <button
            onClick={() => window.electronAPI?.minimize()}
            className="flex size-8 items-center justify-center text-[var(--v2-dim)] transition-colors hover:bg-[var(--v2-raised)] hover:text-[var(--v2-text)]"
            aria-label="Kichraytirish"
          >
            <MinusIcon size={15} />
          </button>
          <button
            onClick={() => window.electronAPI?.close()}
            className="flex size-8 items-center justify-center text-[var(--v2-dim)] transition-colors hover:bg-[var(--v2-alert)] hover:text-white"
            aria-label="Yopish"
          >
            <XIcon size={15} />
          </button>
        </div>
      </header>

      {user ? (
        <div className="relative z-10 flex min-h-0 flex-1">
          {/* Nav rail */}
          <nav className="flex w-[60px] shrink-0 flex-col items-center gap-2 border-r border-[var(--v2-line)] bg-[var(--v2-surface)]/80 py-3">
            {servers.map((s) => (
              <ServerBlock
                key={s.id}
                server={s}
                active={s.id === selectedServerId && screen === 'home'}
                onSelect={() => {
                  setSelectedServerId(s.id)
                  setScreen('home')
                }}
                reduce={reduce}
              />
            ))}

            <span className="my-1 h-px w-7 bg-[var(--v2-line)]" />

            <button
              onClick={refreshServers}
              disabled={loadingServers}
              aria-label="Serverlarni yangilash"
              className="v2-face flex size-11 shrink-0 items-center justify-center bg-[var(--v2-raised)] text-[var(--v2-dim)] transition-colors hover:text-[var(--v2-text)] disabled:opacity-50"
            >
              <ArrowsClockwiseIcon
                size={18}
                className={loadingServers && !reduce ? 'animate-spin' : ''}
              />
            </button>

            <button
              onClick={() => setScreen('settings')}
              aria-label="Sozlamalar"
              className={`v2-face flex size-11 shrink-0 items-center justify-center transition-colors ${
                screen === 'settings'
                  ? 'bg-[var(--v2-acid)]/12 text-[var(--v2-acid)]'
                  : 'bg-[var(--v2-raised)] text-[var(--v2-dim)] hover:text-[var(--v2-text)]'
              }`}
            >
              <GearSixIcon size={19} />
            </button>

            <button
              onClick={logout}
              aria-label="Chiqish"
              className="v2-face mt-auto flex size-11 shrink-0 items-center justify-center bg-[var(--v2-raised)] text-[var(--v2-dim)] transition-colors hover:text-[var(--v2-alert)]"
            >
              <SignOutIcon size={19} />
            </button>
          </nav>

          <section className="min-h-0 flex-1 overflow-hidden p-4">
            {screen === 'settings' ? (
              <SettingsV2 />
            ) : server ? (
              <DashboardV2 server={server} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3">
                <span className="v2-pixel text-[11px] text-[var(--v2-dim)]">
                  {loadingServers ? 'YUKLANMOQDA' : 'SERVER YOQ'}
                </span>
                {connectionError && (
                  <span className="v2-mono max-w-[420px] text-center text-[11px] text-[var(--v2-alert)]">
                    {connectionError}
                  </span>
                )}
              </div>
            )}
          </section>
        </div>
      ) : (
        <LoginV2 onLogin={login} onOAuth={oauthLogin} error={connectionError} />
      )}
    </main>
  )
}
