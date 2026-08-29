'use client'

import { motion, useReducedMotion } from 'framer-motion'
import {
  CaretRightIcon,
  CubeIcon,
  GearSixIcon,
  MinusIcon,
  PlayIcon,
  SignOutIcon,
  StackSimpleIcon,
  StopIcon,
  XIcon,
} from '@phosphor-icons/react'
import { useState } from 'react'

import { V2_MANIFEST, V2_SERVERS, V2_USER, type V2Server } from './mock'
import { VoxelMark } from './voxel'
import { LoginV2 } from './login-v2'

type Screen = 'home' | 'settings'

function statusLabel(s: V2Server) {
  if (s.status === 'online') return 'ONLINE'
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
  server: V2Server
  active: boolean
  onSelect: () => void
  reduce: boolean | null
}) {
  const online = server.status === 'online'
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
        } ${server.status === 'offline' ? 'bg-[var(--v2-alert)]' : ''}`}
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
        <span
          className={`v2-mono text-2xl font-bold leading-none tabular-nums ${
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
  const [ram, setRam] = useState(8)
  const [fullscreen, setFullscreen] = useState(false)
  const [autoClose, setAutoClose] = useState(true)

  return (
    <div className="flex h-full flex-col overflow-y-auto pr-1">
      <h2 className="v2-pixel text-sm leading-relaxed text-[var(--v2-text)]">SOZLAMALAR</h2>

      <div className="mt-5 space-y-3">
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
            {Array.from({ length: 16 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setRam(n)}
                aria-label={`${n} GB`}
                className={`h-6 flex-1 transition-colors ${
                  n <= ram
                    ? 'bg-[var(--v2-acid)] hover:bg-[var(--v2-acid-deep)]'
                    : 'bg-[var(--v2-raised)] hover:bg-[var(--v2-line-hot)]'
                }`}
              />
            ))}
          </div>
          <p className="mt-2 v2-mono text-[10px] text-[var(--v2-faint)]">2 GB min / 16 GB max</p>
        </section>

        {[
          { label: "O'yin ochilganda launcherni yopish", on: autoClose, set: setAutoClose },
          { label: "To'liq ekran rejimi", on: fullscreen, set: setFullscreen },
        ].map((row) => (
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
            defaultValue="http://127.0.0.1:8000/api/v1"
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

function DashboardV2({ server }: { server: V2Server }) {
  const [running, setRunning] = useState(false)
  const online = server.status === 'online'

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Asymmetric header: name and action share one row, the action
          block is fixed-width so it never reflows as names change. */}
      <div className="flex items-start justify-between gap-6 border-b border-[var(--v2-line)] pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span
              className={`size-2 shrink-0 ${
                online
                  ? 'v2-live bg-[var(--v2-acid)]'
                  : server.status === 'starting'
                    ? 'bg-[var(--v2-warn)]'
                    : 'bg-[var(--v2-alert)]'
              }`}
            />
            <span className="v2-pixel text-[8px] text-[var(--v2-faint)]">{statusLabel(server)}</span>
          </div>
          <h1 className="mt-2 truncate text-[32px] font-bold leading-none tracking-tight text-[var(--v2-text)]">
            {server.name}
          </h1>
          <p className="mt-2 max-w-[46ch] text-[13px] leading-5 text-[var(--v2-dim)]">
            {server.description}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2">
          <button
            onClick={() => setRunning((r) => !r)}
            disabled={!online && !running}
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
              {running ? 'STOP' : online ? 'PLAY' : 'OFFLINE'}
            </span>
          </button>
          <span className="v2-mono text-center text-[10px] text-[var(--v2-faint)]">
            {server.minecraft_version} / {server.loader}
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
        <StatBlock label="PING" value={server.ping > 0 ? `${server.ping}` : '--'} unit="ms" />
        <StatBlock label="MODLAR" value={`${V2_MANIFEST.mods}`} />
      </div>

      {/* Content pane: a vertical spec stack rather than another card
          grid, so the two halves of this screen do not rhyme. */}
      <div className="mt-2 grid min-h-0 flex-1 grid-cols-[1.15fr_1fr] gap-2">
        <div
          className="v2-face relative flex flex-col justify-end overflow-hidden bg-[var(--v2-surface)] p-4"
          style={{
            backgroundImage: 'url(/launcher-bg.png)',
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
              v{V2_MANIFEST.version}
            </p>
            <p className="mt-1 text-[11px] text-[var(--v2-dim)]">
              {V2_MANIFEST.mods} mod / {V2_MANIFEST.resourcepacks} resurs paket /{' '}
              {V2_MANIFEST.shaders} shader
            </p>
          </div>
        </div>

        <div className="v2-face flex min-h-0 flex-col bg-[var(--v2-surface)]">
          {[
            { k: 'Rejim', v: server.server_type },
            { k: 'Versiya', v: server.minecraft_version },
            { k: 'Yadro', v: server.loader },
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
            <span className="text-[11px] text-[var(--v2-dim)]">Fayllar sinxronlangan</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Shell ─────────────────────────────────────────────────────────── */

export function LauncherV2() {
  const reduce = useReducedMotion()
  const [authed, setAuthed] = useState(true)
  const [screen, setScreen] = useState<Screen>('home')
  const [selected, setSelected] = useState(V2_SERVERS[0].id)

  const server = V2_SERVERS.find((s) => s.id === selected) ?? V2_SERVERS[0]
  const totalOnline = V2_SERVERS.reduce((n, s) => n + s.current_players, 0)

  return (
    <main className="v2-root relative flex h-[100dvh] w-full flex-col overflow-hidden">
      <div className="v2-grid-bg pointer-events-none fixed inset-0 opacity-60" />

      {/* Header */}
      <header className="v2-sweep relative z-10 flex h-14 shrink-0 select-none items-center justify-between border-b border-[var(--v2-line)] bg-[var(--v2-surface)] px-4">
        <div className="flex items-center gap-3">
          <VoxelMark size={20} />
          <span className="v2-pixel text-[11px] leading-none">
            <span className="text-[var(--v2-acid)]">CYBER</span>
            <span className="text-[var(--v2-text)]">CRAFT</span>
          </span>
          {authed && (
            <span className="ml-2 hidden items-center gap-2 sm:flex">
              <span className="v2-live size-1.5 bg-[var(--v2-acid)]" />
              <span className="v2-mono text-[11px] tabular-nums text-[var(--v2-dim)]">
                {totalOnline.toLocaleString()} onlayn
              </span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {authed && (
            <span className="mr-2 flex items-center gap-2.5 border border-[var(--v2-line-hot)] bg-[var(--v2-raised)] px-2.5 py-1.5">
              <span className="flex size-6 items-center justify-center bg-[var(--v2-acid)] v2-pixel text-[9px] text-[#06210a]">
                {V2_USER.username.slice(0, 1).toUpperCase()}
              </span>
              <span className="text-[12px] font-medium text-[var(--v2-text)]">
                {V2_USER.username}
              </span>
              <span className="v2-mono text-[11px] tabular-nums text-[var(--v2-acid)]">
                {V2_USER.cc_balance.toLocaleString()} CC
              </span>
            </span>
          )}
          <button
            className="flex size-8 items-center justify-center text-[var(--v2-dim)] transition-colors hover:bg-[var(--v2-raised)] hover:text-[var(--v2-text)]"
            aria-label="Kichraytirish"
          >
            <MinusIcon size={15} />
          </button>
          <button
            className="flex size-8 items-center justify-center text-[var(--v2-dim)] transition-colors hover:bg-[var(--v2-alert)] hover:text-white"
            aria-label="Yopish"
          >
            <XIcon size={15} />
          </button>
        </div>
      </header>

      {authed ? (
        <div className="relative z-10 flex min-h-0 flex-1">
          {/* Nav rail */}
          <nav className="flex w-[60px] shrink-0 flex-col items-center gap-2 border-r border-[var(--v2-line)] bg-[var(--v2-surface)]/80 py-3">
            {V2_SERVERS.map((s) => (
              <ServerBlock
                key={s.id}
                server={s}
                active={s.id === selected && screen === 'home'}
                onSelect={() => {
                  setSelected(s.id)
                  setScreen('home')
                }}
                reduce={reduce}
              />
            ))}

            <span className="my-1 h-px w-7 bg-[var(--v2-line)]" />

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
              onClick={() => setAuthed(false)}
              aria-label="Chiqish"
              className="v2-face mt-auto flex size-11 shrink-0 items-center justify-center bg-[var(--v2-raised)] text-[var(--v2-dim)] transition-colors hover:text-[var(--v2-alert)]"
            >
              <SignOutIcon size={19} />
            </button>
          </nav>

          <section className="min-h-0 flex-1 overflow-hidden p-4">
            {screen === 'home' ? <DashboardV2 server={server} /> : <SettingsV2 />}
          </section>
        </div>
      ) : (
        <LoginV2 onAuth={() => setAuthed(true)} />
      )}
    </main>
  )
}
