'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Home, Settings, Minus, X, Gamepad2, LogOut, RefreshCw, Cuboid, User, Search, Server } from 'lucide-react'
import { useEffect, useState } from 'react'
import { HomeView } from './home-view'
import { SettingsView } from './settings-view'

type Tab = 'home' | 'settings'

const NAV: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Bosh sahifa', icon: Home },
  { id: 'settings', label: 'Sozlamalar', icon: Settings },
]

export function Launcher() {
  const [tab, setTab] = useState<Tab>('home')
  const [user, setUser] = useState<LauncherUser | null>(null)
  const [servers, setServers] = useState<LauncherServer[]>([])
  const [selectedServerId, setSelectedServerId] = useState('')
  const [loadingSession, setLoadingSession] = useState(true)
  const [loadingServers, setLoadingServers] = useState(false)
  const [connectionError, setConnectionError] = useState('')
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'offline' | 'disconnected'>('disconnected')

  async function refreshServers() {
    if (!window.electronAPI || !user) return
    setLoadingServers(true)
    setConnectionError('')
    try {
      const nextServers = await window.electronAPI.listServers()
      setServers(nextServers)
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Backend mavjud emas')
    } finally {
      setLoadingServers(false)
    }
  }

  useEffect(() => {
    async function bootstrap() {
      if (!window.electronAPI) {
        setLoadingSession(false)
        return
      }
      try {
        const session = await window.electronAPI.getSession()
        if (session.authenticated) {
          setUser(session.user)
        } else if (session.error) {
          setConnectionError(session.error)
        }
      } finally {
        setLoadingSession(false)
      }
    }
    bootstrap()

    const api = window.electronAPI
    if (!api) return

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
    })

    return () => {
      unsubWsConnected()
      unsubWsDisconnected()
      unsubWsStatus()
    }
  }, [])

  useEffect(() => {
    if (user) {
      refreshServers()
    } else {
      setServers([])
      setSelectedServerId('')
    }
  }, [user])

  useEffect(() => {
    if (servers.length > 0 && !selectedServerId) {
      setSelectedServerId(servers[0].id)
    }
  }, [servers, selectedServerId])

  async function handleLogin(username: string, password: string) {
    if (!window.electronAPI) return
    setConnectionError('')
    try {
      const session = await window.electronAPI.login({ username, password })
      setUser(session.user)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Kirish muvaffaqiyatsiz bo\'ldi'
      setConnectionError(message)
      throw error
    }
  }

  async function handleOAuthLogin(provider: 'google' | 'telegram') {
    if (!window.electronAPI) return
    setConnectionError('')
    try {
      const session = await window.electronAPI.startOauth(provider)
      setUser(session.user)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ijtimoiy tarmoq orqali kirish muvaffaqiyatsiz bo\'ldi'
      setConnectionError(message)
      throw error
    }
  }

  async function handleLogout() {
    await window.electronAPI?.logout()
    setUser(null)
    setServers([])
  }

  const onlinePlayers = servers.reduce((sum, server) => sum + (server.current_players || 0), 0)

  return (
    <main className="relative flex h-dvh w-full flex-col overflow-hidden bg-[#070b10]">
      <div className="pointer-events-none absolute inset-0 bg-[#070b10]" />
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-10"
        style={{ backgroundImage: 'url(/launcher-bg.png)' }}
      />
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(90deg,#ffffff_1px,transparent_1px),linear-gradient(#ffffff_1px,transparent_1px)] [background-size:40px_40px]" />
      <div className="pointer-events-none absolute -left-32 -top-32 size-[420px] rounded-full bg-cyan-300/12 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-36 right-0 size-[420px] rounded-full bg-emerald-300/10 blur-[150px]" />

      <header
        className="relative z-10 flex h-16 select-none items-center justify-between border-b border-[#1f2a3d] bg-[#080d13]/95 px-4"
        style={{
          WebkitAppRegion: 'drag',
        } as React.CSSProperties}
      >
        <div className="flex items-center gap-2.5">
          <div className="relative flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 to-emerald-300 shadow-[0_0_18px_rgba(0,240,255,0.38)]">
            <Cuboid className="size-6 text-[#071017]" />
            <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-yellow-300 shadow-[0_0_8px_rgba(255,222,89,0.8)]" />
          </div>

          <span className="font-display text-base tracking-[0.18em]">
            <span className="text-cyan-300 text-glow">CYBER</span>
            <span className="text-white">CRAFT</span>
          </span>

          <span className="ml-2.5 hidden items-center gap-1.5 text-xs text-[#8ba0b8] sm:flex">
            <span className={`size-1.5 rounded-full ${
              connectionStatus === 'connected' 
                ? 'bg-emerald-300 shadow-[0_0_8px_rgba(34,255,145,0.9)] animate-pulse' 
                : connectionStatus === 'offline' 
                  ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] animate-pulse'
                  : 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.9)] animate-pulse'
            }`} />
            {connectionStatus === 'connected' 
              ? `${onlinePlayers.toLocaleString()} o'yinchi onlayn` 
              : connectionStatus === 'offline' 
                ? 'Oflayn (keshdan)' 
                : 'Ulanish uzildi'}
          </span>
        </div>

        <div
          className="flex items-center gap-1.5"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {/* User Profile Button */}
          {user && (
            <button
              onClick={async () => {
                if (!window.electronAPI) return
                const settings = await window.electronAPI.loadSettings()
                const apiBaseUrl = settings.apiBaseUrl || 'http://127.0.0.1:8000/api/v1'
                let domain = apiBaseUrl.replace(/\/api\/v1\/?$/, '')
                if (domain.includes('127.0.0.1:8000') || domain.includes('localhost:8000')) {
                  domain = 'http://127.0.0.1:3000'
                } else {
                  domain = domain.replace(/^https?:\/\/api\./, 'https://')
                }
                const profileUrl = `${domain}/cabinet/profile`
                window.electronAPI.openExternal(profileUrl)
              }}
              className="mr-2 flex items-center gap-2.5 rounded border border-cyan-300/25 bg-[#0e141f]/95 p-0.5 pr-3.5 text-sm font-bold text-white transition hover:border-cyan-300/60 hover:shadow-[0_0_12px_rgba(0,240,255,0.18)]"
              aria-label="Profilni ochish"
              style={{ borderRadius: '10px' } as React.CSSProperties}
            >
              {user.skin_face_url ? (
                <img
                  src={user.skin_face_url}
                  alt={user.username}
                  className="size-9 rounded border border-cyan-300/20 object-cover"
                  style={{ imageRendering: 'pixelated' }}
                />
              ) : (
                <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 to-emerald-300 font-display text-xs font-black text-[#071017]">
                  {(user?.username || 'P').slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="max-w-[120px] truncate">{user.username}</span>
            </button>
          )}

          <button
            onClick={() => window.electronAPI?.minimize()}
            aria-label="Kichraytirish"
            className="rounded-lg p-2 text-[#8ba0b8] transition hover:bg-cyan-300/10 hover:text-cyan-300"
          >
            <Minus className="size-4.5" />
          </button>
          <button
            onClick={() => window.electronAPI?.close()}
            aria-label="Yopish"
            className="rounded-lg p-2 text-[#8ba0b8] transition hover:bg-red-400/15 hover:text-red-300"
          >
            <X className="size-4.5" />
          </button>
        </div>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1">
        {user && (
          <nav
            className="flex w-14 shrink-0 flex-col items-center rounded-3xl border border-white/8 bg-[#080d14]/95 py-3.5 px-1.5 h-fit max-h-[calc(100vh-80px)] my-auto ml-4 shadow-[0_16px_48px_rgba(0,0,0,0.4)] animate-fade-in"
          >
            {/* Server List - height adapts to number of servers dynamically */}
            <div className="flex w-full flex-col items-center gap-2.5 shrink-0 my-1">
              {servers.map((server) => {
                const active = selectedServerId === server.id && tab === 'home'
                const online = ['online', 'running', 'starting'].includes(server.status)
                
                return (
                  <button
                    key={server.id}
                    onClick={() => {
                      setSelectedServerId(server.id)
                      setTab('home')
                    }}
                    className={`group relative flex size-11 shrink-0 items-center justify-center rounded-xl border transition ${
                      active
                        ? 'border-cyan-300 bg-cyan-300/[0.08] text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.25)]'
                        : 'border-[#263246] bg-[#0d1219]/90 text-[#8ba0b8] hover:border-cyan-300/40 hover:text-white'
                    }`}
                  >
                    {active && (
                      <span className="absolute left-[-6px] top-1/2 -translate-y-1/2 w-1 h-6 rounded-r bg-cyan-300 shadow-[0_0_8px_rgba(0,240,255,0.8)]" />
                    )}
                    
                    {server.icon_url ? (
                      <img
                        src={server.icon_url}
                        alt={server.name}
                        className="size-full rounded-xl object-cover"
                      />
                    ) : (
                      <Server className="size-5" />
                    )}
                    
                    <span className={`absolute bottom-[-1px] right-[-1px] size-2.5 rounded-full border border-[#080d14] ${
                      online ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-red-400'
                    }`} />
                    
                    <div className="absolute left-14 top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 transition-all origin-left bg-[#101822] border border-[#263246] text-white text-xs rounded px-2 py-1 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                      {server.name} ({online ? `${server.current_players}/${server.max_players}` : 'Oflayn'})
                    </div>
                  </button>
                )
              })}
            </div>

            <span className="w-8 h-px bg-[#1f2a3d] my-1 shrink-0" />

            {/* Settings tab button */}
            <button
              onClick={() => setTab('settings')}
              className={`group relative flex size-11 shrink-0 items-center justify-center rounded-xl border transition ${
                tab === 'settings'
                  ? 'border-cyan-300 bg-cyan-300/[0.08] text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.25)]'
                  : 'border-[#263246] bg-[#0d1219]/90 text-[#8ba0b8] hover:border-cyan-300/40 hover:text-white'
              }`}
            >
              {tab === 'settings' && (
                <motion.span
                  layoutId="nav-active"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  className="absolute inset-0 rounded-xl bg-cyan-300/[0.06]"
                />
              )}
              <Settings className="relative size-5 shrink-0" />
              <div className="absolute left-14 top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 transition-all origin-left bg-[#101822] border border-[#263246] text-white text-xs rounded px-2 py-1 pointer-events-none whitespace-nowrap z-50">
                Sozlamalar
              </div>
            </button>

            {/* Logout button (avatar completely removed) */}
            <button
              onClick={handleLogout}
              className="group relative flex size-11 shrink-0 items-center justify-center rounded-xl border border-[#263246] bg-red-500/5 text-[#8ba0b8] transition hover:border-red-400/30 hover:text-red-400 mt-2"
            >
              <LogOut className="size-5" />
              <div className="absolute left-14 top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 transition-all origin-left bg-[#101822] border border-[#263246] text-white text-xs rounded px-2 py-1 pointer-events-none whitespace-nowrap z-50">
                Chiqish
              </div>
            </button>
          </nav>
        )}

        <section className="min-h-0 flex-1 overflow-hidden p-4 md:p-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="h-full"
            >
              {tab === 'home' && (
                <HomeView
                  user={user}
                  servers={servers}
                  selectedServerId={selectedServerId}
                  setSelectedServerId={setSelectedServerId}
                  loadingSession={loadingSession}
                  loadingServers={loadingServers}
                  connectionError={connectionError}
                  onLogin={handleLogin}
                  onOAuthLogin={handleOAuthLogin}
                  onRefreshServers={refreshServers}
                />
              )}
              {tab === 'settings' && <SettingsView />}
            </motion.div>
          </AnimatePresence>
        </section>
      </div>
    </main>
  )
}
