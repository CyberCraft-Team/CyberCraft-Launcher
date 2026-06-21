'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Home, Settings, Minus, X, Gamepad2, LogOut, RefreshCw } from 'lucide-react'
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
  const [loadingSession, setLoadingSession] = useState(true)
  const [loadingServers, setLoadingServers] = useState(false)
  const [connectionError, setConnectionError] = useState('')

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
  }, [])

  useEffect(() => {
    if (user) {
      refreshServers()
    } else {
      setServers([])
    }
  }, [user])

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

  async function handleLogout() {
    await window.electronAPI?.logout()
    setUser(null)
    setServers([])
  }

  const onlinePlayers = servers.reduce((sum, server) => sum + (server.current_players || 0), 0)

  return (
    <main className="relative flex h-dvh w-full flex-col overflow-hidden" style={{ background: '#0a0a0f' }}>
      {/* Deep dark background */}
      <div className="pointer-events-none absolute inset-0" style={{ background: '#0a0a0f' }} />

      {/* Launcher BG image */}
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-10"
        style={{ backgroundImage: 'url(/launcher-bg.png)' }}
      />

      {/* Grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-15"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0z' fill='none' stroke='%231a1a2e' stroke-width='1'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Ambient glow blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-[160px] opacity-20"
          style={{ background: '#00f0ff' }}
        />
        <div
          className="absolute bottom-0 right-0 w-80 h-80 rounded-full blur-[160px] opacity-15"
          style={{ background: '#ff0060' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-[120px] opacity-10"
          style={{ background: '#00ff88' }}
        />
      </div>

      {/* ── Title bar ── */}
      <header
        className="relative z-10 flex items-center justify-between border-b px-4 py-2.5 select-none"
        style={{
          borderColor: '#1a1a2e',
          background: 'rgba(13, 13, 20, 0.95)',
          WebkitAppRegion: 'drag',
        } as React.CSSProperties}
      >
        <div className="flex items-center gap-2.5">
          {/* Logo */}
          <div
            className="flex size-8 items-center justify-center rounded-lg"
            style={{
              background: 'linear-gradient(135deg, #00f0ff, #00a8b3)',
              boxShadow: '0 0 16px rgba(0,240,255,0.4)',
            }}
          >
            <Gamepad2 className="size-4.5" style={{ color: '#0a0a0f' }} />
          </div>

          <span className="font-display text-sm tracking-[0.2em]">
            <span style={{ color: '#00f0ff', textShadow: '0 0 12px rgba(0,240,255,0.7)' }}>CYBER</span>
            <span style={{ color: '#ffffff' }}>CRAFT</span>
          </span>

          <span className="ml-2 hidden items-center gap-1.5 text-xs sm:flex" style={{ color: '#8888aa' }}>
            <span
              className="size-1.5 rounded-full"
              style={{ background: '#00ff88', boxShadow: '0 0 6px #00ff88' }}
            />
            {onlinePlayers.toLocaleString()} o'yinchi onlayn
          </span>
        </div>

        {/* Window controls */}
        <div
          className="flex items-center gap-1"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            onClick={() => window.electronAPI?.minimize()}
            aria-label="Kichraytirish"
            className="rounded-md p-1.5 transition-all"
            style={{ color: '#8888aa' }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(0,240,255,0.1)'
              e.currentTarget.style.color = '#00f0ff'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#8888aa'
            }}
          >
            <Minus className="size-4" />
          </button>
          <button
            onClick={() => window.electronAPI?.close()}
            aria-label="Yopish"
            className="rounded-md p-1.5 transition-all"
            style={{ color: '#8888aa' }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,68,68,0.15)'
              e.currentTarget.style.color = '#ff4444'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#8888aa'
            }}
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1">
        {/* ── Sidebar ── */}
        <nav
          className="flex w-16 flex-col items-center gap-2 border-r py-5 md:w-52 md:items-stretch md:px-3"
          style={{ borderColor: '#1a1a2e', background: 'rgba(13, 13, 20, 0.8)' }}
        >
          {NAV.map((item) => {
            const active = tab === item.id
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className="relative flex items-center justify-center gap-3 rounded-xl px-0 py-3 transition-all md:justify-start md:px-3"
                style={{
                  color: active ? '#00f0ff' : '#8888aa',
                  background: active ? 'rgba(0,240,255,0.08)' : 'transparent',
                  border: active ? '1px solid rgba(0,240,255,0.25)' : '1px solid transparent',
                  boxShadow: active ? '0 0 12px rgba(0,240,255,0.1), inset 0 0 8px rgba(0,240,255,0.05)' : 'none',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.color = '#ffffff'
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.color = '#8888aa'
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    className="absolute inset-0 rounded-xl"
                    style={{ background: 'rgba(0,240,255,0.06)' }}
                  />
                )}
                <Icon className="relative size-5 shrink-0" />
                <span className="relative hidden text-sm font-medium md:inline">{item.label}</span>
              </button>
            )
          })}

          {/* User card */}
          <div className="mt-auto hidden flex-col gap-2 md:flex">
            <div
              className="flex items-center gap-2.5 rounded-xl p-2.5"
              style={{
                background: 'rgba(18,18,26,0.9)',
                border: '1px solid #1a1a2e',
              }}
            >
              {user?.skin_face_url ? (
                <img
                  src={user.skin_face_url}
                  alt={user.username}
                  className="size-8 rounded-lg object-cover"
                  style={{ imageRendering: 'pixelated', border: '1px solid rgba(0,240,255,0.3)' }}
                />
              ) : (
                <span
                  className="flex size-8 items-center justify-center rounded-lg font-display text-sm"
                  style={{
                    background: 'linear-gradient(135deg, #00f0ff, #00a8b3)',
                    color: '#0a0a0f',
                    fontWeight: 700,
                  }}
                >
                  {(user?.username || 'P').slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium" style={{ color: '#ffffff' }}>
                  {user?.username || 'Mehmon'}
                </span>
                <span className="text-[11px]" style={{ color: '#00f0ff' }}>
                  {user?.rank || 'Launcher'}
                </span>
              </div>
              {user && (
                <button
                  onClick={handleLogout}
                  aria-label="Chiqish"
                  className="ml-auto rounded-md p-1.5 transition-all"
                  style={{ color: '#8888aa' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255,68,68,0.1)'
                    e.currentTarget.style.color = '#ff4444'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = '#8888aa'
                  }}
                >
                  <LogOut className="size-4" />
                </button>
              )}
            </div>

            {user && (
              <button
                onClick={refreshServers}
                disabled={loadingServers}
                className="flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs transition-all disabled:opacity-60"
                style={{
                  border: '1px solid #1a1a2e',
                  background: 'rgba(0,240,255,0.05)',
                  color: '#8888aa',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = '#00f0ff'
                  e.currentTarget.style.borderColor = 'rgba(0,240,255,0.3)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = '#8888aa'
                  e.currentTarget.style.borderColor = '#1a1a2e'
                }}
              >
                <RefreshCw className={`size-3.5 ${loadingServers ? 'animate-spin' : ''}`} />
                Yangilash
              </button>
            )}
          </div>
        </nav>

        {/* ── Content ── */}
        <section className="min-h-0 flex-1 overflow-y-auto scrollbar-thin p-6 md:p-8">
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
                  loadingSession={loadingSession}
                  loadingServers={loadingServers}
                  connectionError={connectionError}
                  onLogin={handleLogin}
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
