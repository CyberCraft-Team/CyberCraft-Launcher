'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { GoogleLogoIcon, LockKeyIcon, TelegramLogoIcon } from '@phosphor-icons/react'
import { useState } from 'react'

import { VoxelMark } from './voxel'

/**
 * Login is split 45/55: a voxel-stack panel on the left carrying the
 * brand, the form on the right. Nothing is centered, per the asymmetry
 * the rest of v2 holds to.
 */
export function LoginV2({
  onLogin,
  onOAuth,
  error,
}: {
  onLogin: (username: string, password: string) => Promise<void>
  onOAuth: (provider: 'google' | 'telegram') => Promise<void>
  error?: string
}) {
  const reduce = useReducedMotion()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (busy || !username || !password) return
    setBusy(true)
    try {
      await onLogin(username, password)
    } catch {
      // The shell owns the error text; it arrives back through `error`.
    } finally {
      setBusy(false)
    }
  }

  async function oauth(provider: 'google' | 'telegram') {
    if (busy) return
    setBusy(true)
    try {
      await onOAuth(provider)
    } catch {
      // Same: surfaced through `error`.
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative z-10 flex min-h-0 flex-1">
      {/* Brand panel */}
      <div className="relative hidden w-[45%] shrink-0 flex-col justify-between overflow-hidden border-r border-[var(--v2-line)] bg-[var(--v2-sunk)] p-7 sm:flex">
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage: 'url(/launcher-bg.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="v2-grid-bg absolute inset-0 opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--v2-void)] to-transparent" />

        <div className="relative flex items-center gap-3">
          <VoxelMark size={20} />
          <span className="v2-pixel text-[11px] leading-none">
            <span className="text-[var(--v2-acid)]">CYBER</span>
            <span className="text-[var(--v2-text)]">CRAFT</span>
          </span>
        </div>

        <div className="relative">
          {/* A short stack of blocks, drawn as three offset faces. The
              brand mark is a cube, so the hero art is cubes too. */}
          <div className="mb-6 flex items-end gap-1.5">
            {[36, 52, 28, 44].map((h, i) => (
              <motion.span
                key={i}
                initial={reduce ? false : { scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: 1 }}
                transition={{
                  delay: 0.1 + i * 0.07,
                  duration: 0.35,
                  ease: [0.16, 1, 0.3, 1],
                }}
                style={{ height: h, originY: 1 }}
                className={`w-8 v2-face ${
                  i === 1 ? 'bg-[var(--v2-acid-deep)]' : 'bg-[var(--v2-raised)]'
                }`}
              />
            ))}
          </div>

          <h1 className="v2-pixel text-[17px] leading-[1.7] text-[var(--v2-text)]">
            Blok qo&apos;ying.
            <br />
            <span className="text-[var(--v2-acid)]">Dunyo quring.</span>
          </h1>
          <p className="mt-3 max-w-[28ch] text-[13px] leading-5 text-[var(--v2-dim)]">
            Modlar, resurs paketlar va yadro sozlamalari avtomatik sinxronlanadi.
          </p>
        </div>

        {/* Capability markers, not metrics: nothing is signed in yet, so
            there are no real counts to show here. */}
        <div className="relative flex gap-5">
          {[
            { n: 'AUTO', l: 'SINXRON' },
            { n: 'JAVA', l: 'AVTO-TOPISH' },
            { n: '1-KLIK', l: 'ISHGA TUSHIRISH' },
          ].map((s) => (
            <div key={s.l}>
              <div className="v2-pixel text-[15px] leading-none text-[var(--v2-text)]">
                {s.n}
              </div>
              <div className="v2-pixel mt-1.5 text-[7px] text-[var(--v2-faint)]">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-[320px]">
          <h2 className="v2-pixel text-[13px] leading-relaxed text-[var(--v2-text)]">KIRISH</h2>
          <p className="mt-2.5 text-[13px] text-[var(--v2-dim)]">
            CyberCraft akkauntingiz bilan davom eting.
          </p>

          {error && (
            <p
              role="alert"
              className="mt-4 border-l-2 border-[var(--v2-alert)] bg-[var(--v2-alert)]/10 px-3 py-2 text-[12px] leading-5 text-[var(--v2-text)]"
            >
              {error}
            </p>
          )}

          <div className="mt-6 space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-[var(--v2-dim)]">
                Username
              </span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Steve"
                autoComplete="username"
                className="h-11 w-full border border-[var(--v2-line-hot)] bg-[var(--v2-sunk)] px-3 text-[13px] text-[var(--v2-text)] outline-none transition-colors placeholder:text-[var(--v2-faint)] focus:border-[var(--v2-acid)]"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-[var(--v2-dim)]">
                Parol
              </span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                className="h-11 w-full border border-[var(--v2-line-hot)] bg-[var(--v2-sunk)] px-3 text-[13px] text-[var(--v2-text)] outline-none transition-colors placeholder:text-[var(--v2-faint)] focus:border-[var(--v2-acid)]"
              />
            </label>

            <button
              onClick={submit}
              disabled={busy}
              className="v2-block-btn flex h-12 w-full items-center justify-center gap-2 bg-[var(--v2-acid-deep)] text-[#06210a] disabled:opacity-70"
            >
              <LockKeyIcon size={16} weight="fill" />
              <span className="v2-pixel text-[10px] leading-none">
                {busy ? 'KUTING' : 'KIRISH'}
              </span>
            </button>

            <div className="flex items-center gap-3 py-1">
              <span className="h-px flex-1 bg-[var(--v2-line)]" />
              <span className="v2-pixel text-[7px] text-[var(--v2-faint)]">YOKI</span>
              <span className="h-px flex-1 bg-[var(--v2-line)]" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => oauth('google')}
                disabled={busy}
                className="v2-block-btn v2-block-btn--ghost flex h-11 items-center justify-center gap-2 bg-[var(--v2-raised)] text-[13px] font-medium text-[var(--v2-text)] disabled:opacity-70"
              >
                <GoogleLogoIcon size={16} weight="bold" />
                Google
              </button>
              <button
                onClick={() => oauth('telegram')}
                disabled={busy}
                className="v2-block-btn v2-block-btn--ghost flex h-11 items-center justify-center gap-2 bg-[var(--v2-raised)] text-[13px] font-medium text-[var(--v2-text)] disabled:opacity-70"
              >
                <TelegramLogoIcon size={16} weight="fill" />
                Telegram
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
