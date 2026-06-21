'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Check, Download, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { MOD_LOADERS, LOADER_STYLES, type LoaderType } from '@/lib/launcher-data'
import { LoaderBadge } from './loader-badge'

type InstallState = 'idle' | 'installing' | 'installed'

function InstallButton({
  state,
  color,
  onInstall,
}: {
  state: InstallState
  color: string
  onInstall: () => void
}) {
  const installed = state === 'installed'
  const installing = state === 'installing'

  return (
    <motion.button
      whileHover={state === 'idle' ? { scale: 1.05 } : {}}
      whileTap={state === 'idle' ? { scale: 0.95 } : {}}
      onClick={onInstall}
      disabled={state !== 'idle'}
      className="relative flex h-10 min-w-[130px] items-center justify-center gap-2 overflow-hidden rounded-lg px-4 text-sm font-bold transition-all"
      style={{
        background: installed
          ? 'linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,200,100,0.15))'
          : installing
          ? `${color}18`
          : `${color}18`,
        color: installed ? '#00ff88' : color,
        border: `1px solid ${installed ? 'rgba(0,255,136,0.4)' : `${color}44`}`,
        boxShadow: installed ? '0 0 12px rgba(0,255,136,0.2)' : 'none',
      }}
    >
      {/* Shine on idle */}
      {state === 'idle' && (
        <span
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 opacity-0 group-hover:opacity-20"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }}
        />
      )}

      <AnimatePresence mode="wait" initial={false}>
        {state === 'idle' && (
          <motion.span
            key="idle"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-center gap-2"
          >
            <Download className="size-4" /> O&apos;rnatish
          </motion.span>
        )}
        {state === 'installing' && (
          <motion.span
            key="installing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2"
          >
            <Loader2 className="size-4 animate-spin" /> O&apos;rnatilmoqda
          </motion.span>
        )}
        {state === 'installed' && (
          <motion.span
            key="installed"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            className="flex items-center gap-2"
          >
            <Check className="size-4" /> O&apos;rnatildi
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

export function InstallerView() {
  const [states, setStates] = useState<Record<LoaderType, InstallState>>(
    {} as Record<LoaderType, InstallState>,
  )

  function install(id: LoaderType) {
    setStates((s) => ({ ...s, [id]: 'installing' }))
    setTimeout(() => {
      setStates((s) => ({ ...s, [id]: 'installed' }))
    }, 2200)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <motion.header initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-[0.25em]" style={{ color: 'rgba(0,240,255,0.7)' }}>
          Avtomatik o&apos;rnatuvchi
        </span>
        <h1 className="font-display text-3xl md:text-4xl" style={{ color: '#ffffff', fontWeight: 900 }}>
          <span style={{ color: '#00f0ff', textShadow: '0 0 16px rgba(0,240,255,0.7)' }}>Mod </span>
          <span>Yuklagichlar</span>
        </h1>
        <p className="text-sm" style={{ color: '#8888aa' }}>
          Bitta bosish bilan sevimli yuklagichingizni o&apos;rnating.
        </p>
      </motion.header>

      {/* Cards grid */}
      <div className="scrollbar-thin mt-6 grid gap-4 overflow-y-auto pr-1 sm:grid-cols-2">
        {MOD_LOADERS.map((loader, i) => {
          const state = states[loader.id] ?? 'idle'
          const styles = LOADER_STYLES[loader.id]
          // Map oklch colors to hex-like accents for cyber theme
          const hexColor = loader.id === 'NeoForge' ? '#7777ff'
            : loader.id === 'Forge' ? '#ff8844'
            : loader.id === 'Fabric' ? '#aacc44'
            : loader.id === 'Quilt' ? '#cc44ff'
            : loader.id === 'OptiFine' ? '#00f0ff'
            : '#ffffff'

          return (
            <motion.div
              key={loader.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl p-5"
              style={{
                background: '#12121a',
                border: `1px solid #1a1a2e`,
                transition: 'border-color 0.3s, box-shadow 0.3s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.borderColor = `${hexColor}44`
                el.style.boxShadow = `0 0 30px ${hexColor}18`
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.borderColor = '#1a1a2e'
                el.style.boxShadow = 'none'
              }}
            >
              {/* Glow blob */}
              <span
                aria-hidden
                className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-35"
                style={{ background: hexColor }}
              />

              {/* Corner cyber accent */}
              <span
                aria-hidden
                className="pointer-events-none absolute right-0 top-0 h-px w-16 opacity-60"
                style={{ background: `linear-gradient(90deg, transparent, ${hexColor})` }}
              />
              <span
                aria-hidden
                className="pointer-events-none absolute right-0 top-0 w-px h-8 opacity-60"
                style={{ background: `linear-gradient(180deg, ${hexColor}, transparent)` }}
              />

              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-2">
                  <LoaderBadge loader={loader.id} />
                  <h3 className="font-display text-xl" style={{ color: '#ffffff', fontWeight: 700 }}>{loader.name}</h3>
                  <p className="max-w-[22ch] text-sm" style={{ color: '#8888aa' }}>
                    {loader.tagline}
                  </p>
                </div>
              </div>

              <div className="mt-auto flex items-center justify-between border-t pt-4" style={{ borderColor: '#1a1a2e' }}>
                <span className="font-mono text-xs" style={{ color: '#8888aa' }}>
                  so&apos;nggi{' '}
                  <span style={{ color: hexColor, fontWeight: 600 }}>{loader.latest}</span>
                </span>
                <InstallButton
                  state={state}
                  color={hexColor}
                  onInstall={() => install(loader.id)}
                />
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
