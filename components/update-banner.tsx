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
        <div className="pointer-events-auto flex items-center gap-3 rounded-lg border border-border bg-surface p-3.5 shadow-md backdrop-blur">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-3">
            {phase === 'downloaded' ? (
              <Sparkles className="size-4.5 text-primary" />
            ) : phase === 'downloading' ? (
              <DownloadCloud className="size-4.5 text-primary" />
            ) : (
              <Download className="size-4.5 text-primary" />
            )}
          </span>

          <div className="min-w-0 flex-1">
            {phase === 'available' && (
              <>
                <div className="truncate text-sm font-bold text-foreground">
                  Yangi versiya mavjud <span className="text-primary">v{info.version}</span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">Yuklab olish uchun bosing</div>
              </>
            )}
            {phase === 'downloading' && (
              <>
                <div className="truncate text-sm font-bold text-foreground">
                  Yuklanmoqda <span className="text-primary">v{info.version}</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  />
                </div>
                <div className="mt-1 font-mono text-[11px] text-muted-foreground">{percent}%</div>
              </>
            )}
            {phase === 'downloaded' && (
              <>
                <div className="truncate text-sm font-bold text-foreground">
                  O'rnatish uchun tayyor <span className="text-primary">v{info.version}</span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">Dasturni qayta ishga tushiring</div>
              </>
            )}
          </div>

          {phase === 'available' && (
            <button
              onClick={handleDownload}
              className="shrink-0 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs font-bold text-foreground transition hover:border-strong hover:bg-surface-3"
            >
              Yuklab olish
            </button>
          )}
          {phase === 'downloaded' && (
            <button
              onClick={handleInstall}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-transparent bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition hover:bg-primary-hover"
            >
              <RefreshCw className="size-3.5" />
              Qayta ishga tushirish
            </button>
          )}

          {phase !== 'downloading' && (
            <button
              onClick={() => setDismissed(true)}
              aria-label="Yopish"
              className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:bg-surface-3 hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
