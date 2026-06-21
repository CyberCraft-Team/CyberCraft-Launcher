'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { GAME_VERSIONS, type GameVersion } from '@/lib/launcher-data'
import { LoaderBadge } from './loader-badge'

export function VersionSelector({
  selected,
  onSelect,
  versions = GAME_VERSIONS,
}: {
  selected: GameVersion
  onSelect: (v: GameVersion) => void
  versions?: GameVersion[]
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!open) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [open])

  const filtered = versions.filter(
    (v) =>
      v.version.toLowerCase().includes(query.toLowerCase()) ||
      v.loader.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <>
      {/* Trigger button */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => { setQuery(''); setOpen(true) }}
        className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition-all"
        style={{
          background: '#12121a',
          border: '1px solid #1a1a2e',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.borderColor = 'rgba(0,240,255,0.3)'
          el.style.boxShadow = '0 0 12px rgba(0,240,255,0.06)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.borderColor = '#1a1a2e'
          el.style.boxShadow = 'none'
        }}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wider" style={{ color: '#8888aa' }}>
              Tanlangan versiya
            </span>
            <span className="font-mono text-base font-bold" style={{ color: '#00f0ff' }}>
              {selected.version}
            </span>
          </span>
          <LoaderBadge loader={selected.loader} size="sm" />
        </span>
        <ChevronDown className="size-5 shrink-0" style={{ color: '#8888aa' }} />
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(8px)' }}
            onClick={() => setOpen(false)}
            onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false) }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 24, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[70vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl shadow-2xl"
              style={{
                background: '#0d0d14',
                border: '1px solid rgba(0,240,255,0.2)',
                boxShadow: '0 0 60px rgba(0,240,255,0.1), 0 24px 48px rgba(0,0,0,0.6)',
              }}
            >
              {/* Modal header */}
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: '1px solid #1a1a2e' }}
              >
                {/* Cyber accent line */}
                <span
                  className="absolute left-0 top-0 h-px w-full"
                  style={{ background: 'linear-gradient(90deg, transparent, #00f0ff, transparent)' }}
                />
                <h2 className="font-display text-lg font-bold" style={{ color: '#00f0ff', textShadow: '0 0 12px rgba(0,240,255,0.5)' }}>
                  Versiya tanlash
                </h2>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Yopish"
                  className="rounded-lg p-1.5 transition-all"
                  style={{ color: '#8888aa' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255,68,68,0.12)'
                    e.currentTarget.style.color = '#ff4444'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = '#8888aa'
                  }}
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Search */}
              <div className="p-3" style={{ borderBottom: '1px solid #1a1a2e' }}>
                <div
                  className="flex items-center gap-2 rounded-lg px-3 py-2"
                  style={{ background: '#12121a', border: '1px solid #1a1a2e' }}
                >
                  <Search className="size-4 shrink-0" style={{ color: '#8888aa' }} />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Versiya yoki yuklagichni qidiring..."
                    className="w-full bg-transparent text-sm outline-none"
                    style={{ color: '#ffffff' }}
                  />
                  {query && (
                    <button onClick={() => setQuery('')} style={{ color: '#8888aa' }}>
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Version list */}
              <div className="scrollbar-thin flex flex-col gap-1.5 overflow-y-auto p-3">
                {filtered.map((v, i) => {
                  const active = v.id === selected.id
                  return (
                    <motion.button
                      key={v.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.025 }}
                      whileHover={{ x: 4 }}
                      onClick={() => { onSelect(v); setOpen(false) }}
                      className="flex items-center justify-between rounded-xl px-4 py-3 text-left transition-all"
                      style={{
                        background: active ? 'rgba(0,240,255,0.08)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${active ? 'rgba(0,240,255,0.3)' : '#1a1a2e'}`,
                        boxShadow: active ? '0 0 12px rgba(0,240,255,0.08)' : 'none',
                      }}
                      onMouseEnter={e => {
                        if (!active) {
                          const el = e.currentTarget as HTMLButtonElement
                          el.style.background = 'rgba(255,255,255,0.04)'
                          el.style.borderColor = '#333355'
                        }
                      }}
                      onMouseLeave={e => {
                        if (!active) {
                          const el = e.currentTarget as HTMLButtonElement
                          el.style.background = 'rgba(255,255,255,0.02)'
                          el.style.borderColor = '#1a1a2e'
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="font-mono text-sm font-bold"
                          style={{ color: active ? '#00f0ff' : '#ffffff' }}
                        >
                          {v.version}
                        </span>
                        <LoaderBadge loader={v.loader} size="sm" />
                        {v.releaseType === 'snapshot' && (
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide"
                            style={{ background: 'rgba(255,170,0,0.15)', color: '#ffaa00' }}
                          >
                            snapshot
                          </span>
                        )}
                      </div>
                      {active && <Check className="size-4" style={{ color: '#00f0ff' }} />}
                    </motion.button>
                  )
                })}

                {filtered.length === 0 && (
                  <p className="px-4 py-8 text-center text-sm" style={{ color: '#8888aa' }}>
                    &ldquo;{query}&rdquo; ga mos versiyalar topilmadi.
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
