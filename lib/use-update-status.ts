'use client'

import { useCallback, useEffect, useState } from 'react'

export type UpdatePhase = 'idle' | 'available' | 'downloading' | 'downloaded'

export interface UpdateInfo {
  version: string
  releaseNotes?: string
  releaseDate?: string
  fileSize?: number
  autoDownloading?: boolean
}

/**
 * Update state as the main process reports it.
 *
 * Both shells show the same three moments -- found, downloading, ready to
 * restart -- in their own visual language, so the wiring lives here and the
 * banners stay purely presentational.
 */
export function useUpdateStatus() {
  const [phase, setPhase] = useState<UpdatePhase>('idle')
  const [info, setInfo] = useState<UpdateInfo | null>(null)
  const [percent, setPercent] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return

    const unsubAvailable = api.onUpdateAvailable((data: UpdateInfo) => {
      setInfo(data)
      setError(null)
      // The main process downloads on its own, so the "available" moment is
      // usually a blink. Going straight to downloading avoids showing a
      // button that stops meaning anything a moment later.
      setPhase(data.autoDownloading ? 'downloading' : 'available')
      setDismissed(false)
    })

    const unsubProgress = api.onUpdateProgress((progress: { percent: number }) => {
      setPercent(Math.max(0, Math.min(100, Math.round(progress.percent))))
      setPhase('downloading')
    })

    const unsubDownloaded = api.onUpdateDownloaded((data: UpdateInfo) => {
      setInfo((prev) => ({ ...prev, ...data }))
      setPercent(100)
      setPhase('downloaded')
      setDismissed(false)
    })

    const unsubError = api.onUpdateError
      ? api.onUpdateError((message: string) => {
          setError(message)
          // Drop back so the banner can offer the download again rather than
          // sitting at a progress bar that will never move.
          setPhase((prev) => (prev === 'downloading' ? 'available' : prev))
        })
      : () => {}

    return () => {
      unsubAvailable()
      unsubProgress()
      unsubDownloaded()
      unsubError()
    }
  }, [])

  const download = useCallback(async () => {
    if (!window.electronAPI) return
    setError(null)
    setPhase('downloading')
    try {
      await window.electronAPI.downloadUpdate()
    } catch {
      // Progress and downloaded events still drive the UI if the download
      // started anyway; only a hard failure surfaces through onUpdateError.
    }
  }, [])

  const install = useCallback(async () => {
    if (!window.electronAPI) return
    try {
      await window.electronAPI.installUpdate()
    } catch {
      // Nothing to do -- the banner stays put and the update installs on
      // quit regardless.
    }
  }, [])

  const dismiss = useCallback(() => setDismissed(true), [])

  const visible = phase !== 'idle' && !dismissed && info !== null

  return { phase, info, percent, error, visible, download, install, dismiss }
}
