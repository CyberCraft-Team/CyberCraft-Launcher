'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Download, DownloadCloud, RefreshCw, Sparkles, X } from 'lucide-react'
import { useEffect, useState } from 'react'

type UpdatePhase = 'idle' | 'available' | 'downloading' | 'downloaded'

interface UpdateInfo {
  version: string
  releaseNotes?: string
  releaseDate?: string
  fileSize?: number
}

export function UpdateBanner() {
  const [phase, setPhase] = useState<UpdatePhase>('idle')
  const [info, setInfo] = useState<UpdateInfo | null>(null)
  const [percent, setPercent] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return

    const unsubAvailable = api.onUpdateAvailable((data) => {
      setInfo({
        version: data.version,
        releaseNotes: data.releaseNotes,
        releaseDate: data.releaseDate,
        fileSize: data.fileSize,
      })
      setPhase('available')
      setDismissed(false)
    })

    const unsubProgress = api.onUpdateProgress((progress) => {
      setPercent(Math.max(0, Math.min(100, Math.round(progress.percent))))
      setPhase('downloading')
    })

    const unsubDownloaded = api.onUpdateDownloaded((data) => {
      setInfo((prev) => ({
        version: data.version,
        releaseNotes: data.releaseNotes,
        releaseDate: prev?.releaseDate,
        fileSize: prev?.fileSize,
      }))
      setPercent(100)
      setPhase('downloaded')
      setDownloading(false)
      setDismissed(false)
    })

    return () => {
      unsubAvailable()
      unsubProgress()
      unsubDownloaded()
    }
  }, [])

  async function handleDownload() {
    if (!window.electronAPI || downloading) return
    setDownloading(true)
    setPhase('downloading')
    try {
      await window.electronAPI.downloadUpdate()
    } catch {
      // If the download kicks off asynchronously the progress/downloaded
      // events will still drive the UI; swallow errors here to avoid a
      // dead-end state and let the user retry.
      setDownloading(false)
    }
  }

  async function handleInstall() {
    if (!window.electronAPI) return
    try {
      await window.electronAPI.installUpdate()
    } catch {
      // no-op — if this fails the banner just stays put
    }
  }

  if (phase === 'idle' || dismissed || !info) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        key="update-banner"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="pointer-events-none absolute left-1/2 top-[4.5rem] z-50 w-[min(420px,calc(100%-2rem))] -translate-x-1/2"
      >
        <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-cyan-300/20 bg-[#101822]/95 p-3.5 shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-300/10">
            {phase === 'downloaded' ? (
              <Sparkles className="size-4.5 text-emerald-300" />
            ) : phase === 'downloading' ? (
              <DownloadCloud className="size-4.5 animate-pulse text-cyan-300" />
            ) : (
              <Download className="size-4.5 text-cyan-300" />
            )}
          </span>

          <div className="min-w-0 flex-1">
            {phase === 'available' && (
              <>
                <div className="truncate text-sm font-bold text-white">
                  Yangi versiya mavjud <span className="text-cyan-300">v{info.version}</span>
                </div>
                <div className="mt-0.5 text-xs text-[#8ba0b8]">Yuklab olish uchun bosing</div>
              </>
            )}
            {phase === 'downloading' && (
              <>
                <div className="truncate text-sm font-bold text-white">
                  Yuklanmoqda <span className="text-cyan-300">v{info.version}</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#1f2a3d]">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300 shadow-[0_0_8px_rgba(0,240,255,0.6)]"
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  />
                </div>
                <div className="mt-1 text-[11px] text-[#8ba0b8]">{percent}%</div>
              </>
            )}
            {phase === 'downloaded' && (
              <>
                <div className="truncate text-sm font-bold text-white">
                  O'rnatish uchun tayyor <span className="text-emerald-300">v{info.version}</span>
                </div>
                <div className="mt-0.5 text-xs text-[#8ba0b8]">Dasturni qayta ishga tushiring</div>
              </>
            )}
          </div>

          {phase === 'available' && (
            <button
              onClick={handleDownload}
              className="shrink-0 rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs font-bold text-cyan-200 transition hover:border-cyan-300/60 hover:bg-cyan-300/15 hover:text-white"
            >
              Yuklab olish
            </button>
          )}
          {phase === 'downloaded' && (
            <button
              onClick={handleInstall}
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-xs font-bold text-emerald-200 transition hover:border-emerald-300/60 hover:bg-emerald-300/15 hover:text-white"
            >
              <RefreshCw className="size-3.5" />
              Qayta ishga tushirish
            </button>
          )}

          {phase !== 'downloading' && (
            <button
              onClick={() => setDismissed(true)}
              aria-label="Yopish"
              className="shrink-0 rounded-lg p-1.5 text-[#8ba0b8] transition hover:bg-white/5 hover:text-white"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
