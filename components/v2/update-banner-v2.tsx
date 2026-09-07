'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowClockwise, DownloadSimple, Sparkle, X } from '@phosphor-icons/react'

import { useUpdateStatus } from '@/lib/use-update-status'

/**
 * The update banner in v2's language: square corners, pixel type, acid
 * accent. Same three moments as the v1 banner, same hook behind it -- only
 * the surface differs, because v1's rounded tokens read as a foreign object
 * inside the voxel shell.
 */
export function UpdateBannerV2() {
  const { phase, info, percent, error, visible, download, install, dismiss } = useUpdateStatus()

  if (!visible || !info) return null

  return (
    <AnimatePresence>
      <motion.div
        key="update-banner-v2"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="pointer-events-none absolute left-1/2 top-[4.25rem] z-50 w-[min(440px,calc(100%-2rem))] -translate-x-1/2"
      >
        <div className="pointer-events-auto flex items-center gap-3 border border-[var(--v2-line-hot)] bg-[var(--v2-surface)] p-3 shadow-[0_6px_0_0_rgba(0,0,0,0.45)]">
          <span className="flex size-8 shrink-0 items-center justify-center border border-[var(--v2-line)] bg-[var(--v2-sunk)]">
            {phase === 'downloaded' ? (
              <Sparkle size={16} weight="fill" className="text-[var(--v2-acid)]" />
            ) : (
              <DownloadSimple size={16} weight="bold" className="text-[var(--v2-acid)]" />
            )}
          </span>

          <div className="min-w-0 flex-1">
            {phase === 'available' && (
              <>
                <div className="v2-pixel truncate text-[10px] leading-none text-[var(--v2-text)]">
                  YANGI VERSIYA <span className="text-[var(--v2-acid)]">v{info.version}</span>
                </div>
                <div className="mt-1 text-[11px] text-[var(--v2-dim)]">
                  {error ?? 'Yuklab olish uchun bosing'}
                </div>
              </>
            )}

            {phase === 'downloading' && (
              <>
                <div className="v2-pixel truncate text-[10px] leading-none text-[var(--v2-text)]">
                  YUKLANMOQDA <span className="text-[var(--v2-acid)]">v{info.version}</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden bg-[var(--v2-sunk)]">
                  <motion.div
                    className="h-full bg-[var(--v2-acid)]"
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  />
                </div>
                <div className="v2-mono mt-1 text-[10px] text-[var(--v2-dim)]">{percent}%</div>
              </>
            )}

            {phase === 'downloaded' && (
              <>
                <div className="v2-pixel truncate text-[10px] leading-none text-[var(--v2-text)]">
                  TAYYOR <span className="text-[var(--v2-acid)]">v{info.version}</span>
                </div>
                <div className="mt-1 text-[11px] text-[var(--v2-dim)]">
                  Qayta ishga tushirilganda o&apos;rnatiladi
                </div>
              </>
            )}
          </div>

          {phase === 'available' && (
            <button
              onClick={download}
              className="v2-pixel shrink-0 border border-[var(--v2-line-hot)] bg-[var(--v2-raised)] px-3 py-2 text-[9px] leading-none text-[var(--v2-text)] transition hover:bg-[var(--v2-line)]"
            >
              YUKLASH
            </button>
          )}

          {phase === 'downloaded' && (
            <button
              onClick={install}
              className="v2-block-btn v2-pixel flex shrink-0 items-center gap-1.5 bg-[var(--v2-acid-deep)] px-3 py-2 text-[9px] leading-none text-[var(--v2-void)]"
            >
              <ArrowClockwise size={12} weight="bold" />
              QAYTA ISHGA TUSHIRISH
            </button>
          )}

          {phase !== 'downloading' && (
            <button
              onClick={dismiss}
              aria-label="Yopish"
              className="shrink-0 p-1.5 text-[var(--v2-faint)] transition hover:text-[var(--v2-text)]"
            >
              <X size={14} weight="bold" />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
