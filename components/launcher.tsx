'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Home, Settings, Minus, X, Gamepad2, LogOut, RefreshCw, Cuboid, User, Search, Server } from 'lucide-react'
import { useState } from 'react'
import { useLauncherSession } from '@/lib/use-launcher-session'
import { HomeView } from './home-view'
import { SettingsView } from './settings-view'
import { UpdateBanner } from './update-banner'

type Tab = 'home' | 'settings'

const NAV: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Bosh sahifa', icon: Home },
  { id: 'settings', label: 'Sozlamalar', icon: Settings },
]

export function Launcher() {
  const [tab, setTab] = useState<Tab>('home')
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
    login: handleLogin,
    oauthLogin: handleOAuthLogin,
    logout: handleLogout,
  } = useLauncherSession()

  return (
    <main className="relative flex h-dvh w-full flex-col overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-background" />
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.04]"
        style={{ backgroundImage: 'url(/launcher-bg.png)' }}
      />
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:linear-gradient(90deg,#ffffff_1px,transparent_1px),linear-gradient(#ffffff_1px,transparent_1px)] [background-size:40px_40px]" />

      <header
        className="relative z-10 flex h-16 select-none items-center justify-between border-b border-border bg-background/95 px-4"
        style={{
          WebkitAppRegion: 'drag',
        } as React.CSSProperties}
      >
        <div className="flex items-center gap-2.5">
          <div className="relative flex size-10 items-center justify-center rounded-xl bg-primary">
            <Cuboid className="size-6 text-primary-foreground" />
          </div>

          <span className="text-base font-semibold tracking-tight">
            <span className="text-primary">CYBER</span>
            <span className="text-foreground">CRAFT</span>
          </span>

          {user && (
            <span className="ml-2.5 hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
              <span className={`size-1.5 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-primary'
                  : connectionStatus === 'offline'
                    ? 'bg-warning'
                    : 'bg-destructive'
              }`} />
              {connectionStatus === 'connected'
                ? `${onlinePlayers.toLocaleString()} o'yinchi onlayn`
                : connectionStatus === 'offline'
                  ? 'Oflayn (keshdan)'
                  : 'Ulanish uzildi'}
            </span>
          )}
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
              className="mr-2 flex items-center gap-2.5 rounded border border-border bg-surface p-0.5 pr-3.5 text-sm font-bold text-foreground transition hover:border-strong"
              aria-label="Profilni ochish"
              style={{ borderRadius: '10px' } as React.CSSProperties}
            >
              {user.skin_face_url ? (
                <img
                  src={user.skin_face_url}
                  alt={user.username}
                  className="size-9 rounded border border-border object-cover"
                  style={{ imageRendering: 'pixelated' }}
                />
              ) : (
                <span className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {(user?.username || 'P').slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="max-w-[120px] truncate">{user.username}</span>
            </button>
          )}

          <button
            onClick={() => window.electronAPI?.minimize()}
            aria-label="Kichraytirish"
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-surface-3 hover:text-foreground"
          >
            <Minus className="size-4.5" />
          </button>
          <button
            onClick={() => window.electronAPI?.close()}
            aria-label="Yopish"
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive"
          >
            <X className="size-4.5" />
          </button>
        </div>
      </header>

      <UpdateBanner />

      <div className="relative z-10 flex min-h-0 flex-1">
        {user && (
          <nav
            className="flex w-14 shrink-0 flex-col items-center rounded-xl border border-border bg-surface py-3.5 px-1.5 h-fit max-h-[calc(100vh-80px)] my-auto ml-4 shadow-md animate-fade-in"
          >
            {/* Server List - height adapts to number of servers dynamically */}
            <div className="flex w-full flex-col items-center gap-2.5 shrink-0 my-1">
              {servers.map((server) => {
                const active = selectedServerId === server.id && tab === 'home'
                const online = ['online', 'running', 'starting'].includes(server.status)
                
                return (
                  <motion.button
                    key={server.id}
                    onClick={() => {
                      setSelectedServerId(server.id)
                      setTab('home')
                    }}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 20 }}
                    className={`group relative flex size-11 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                      active
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-surface-2 text-muted-foreground hover:border-strong hover:text-foreground'
                    }`}
                  >
                    {active && (
                      <span className="absolute left-[-6px] top-1/2 -translate-y-1/2 w-1 h-6 rounded-r bg-primary" />
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
                    
                    <span className={`absolute bottom-[-1px] right-[-1px] size-2.5 rounded-full border border-surface ${
                      online ? 'bg-primary' : 'bg-destructive'
                    }`} />

                    <div className="absolute left-14 top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 transition-all origin-left bg-surface border border-border text-foreground text-xs rounded px-2 py-1 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                      {server.name} ({online ? `${server.current_players}/${server.max_players}` : 'Oflayn'})
                    </div>
                  </motion.button>
                )
              })}
            </div>

            <span className="w-8 h-px bg-border my-1 shrink-0" />

            {/* Settings tab button */}
            <motion.button
              onClick={() => setTab('settings')}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 420, damping: 20 }}
              className={`group relative flex size-11 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                tab === 'settings'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-surface-2 text-muted-foreground hover:border-strong hover:text-foreground'
              }`}
            >
              {tab === 'settings' && (
                <motion.span
                  layoutId="nav-active"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  className="absolute inset-0 rounded-xl bg-primary/10"
                />
              )}
              <Settings className="relative size-5 shrink-0" />
              <div className="absolute left-14 top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 transition-all origin-left bg-surface border border-border text-foreground text-xs rounded px-2 py-1 pointer-events-none whitespace-nowrap z-50">
                Sozlamalar
              </div>
            </motion.button>

            {/* Logout button (avatar completely removed) */}
            <motion.button
              onClick={handleLogout}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 420, damping: 20 }}
              className="group relative flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-transparent text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive mt-2"
            >
              <LogOut className="size-5" />
              <div className="absolute left-14 top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 transition-all origin-left bg-surface border border-border text-foreground text-xs rounded px-2 py-1 pointer-events-none whitespace-nowrap z-50">
                Chiqish
              </div>
            </motion.button>
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
