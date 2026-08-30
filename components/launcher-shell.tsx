'use client'

import { useCallback, useEffect, useState } from 'react'
import { UiVersionProvider } from '@/lib/ui-version'
import { Launcher } from './launcher'
import { LauncherV2 } from './v2/launcher-v2'

/**
 * Picks the visual direction and holds it for the session.
 *
 * The choice is persisted in settings, so it has to be read asynchronously
 * before either shell can draw. Rendering nothing until it resolves avoids
 * painting v1 and then swapping to v2 a frame later.
 */
export function LauncherShell() {
  const [uiVersion, setVersion] = useState<UiVersion | null>(null)

  useEffect(() => {
    if (!window.electronAPI) {
      setVersion('v2')
      return
    }
    window.electronAPI
      .loadSettings()
      .then((settings) => setVersion(settings.uiVersion === 'v1' ? 'v1' : 'v2'))
      .catch(() => setVersion('v2'))
  }, [])

  const setUiVersion = useCallback((next: UiVersion) => {
    setVersion(next)
    const api = window.electronAPI
    if (!api) return
    // Merge rather than replace: saveSettings takes the whole object, and
    // writing a bare { uiVersion } would drop RAM, paths and JVM args.
    api
      .loadSettings()
      .then((settings) => api.saveSettings({ ...settings, uiVersion: next }))
      .catch(() => {})
  }, [])

  if (uiVersion === null) {
    return <div className="h-dvh w-full bg-background" />
  }

  return (
    <UiVersionProvider value={{ uiVersion, setUiVersion }}>
      {uiVersion === 'v2' ? <LauncherV2 /> : <Launcher />}
    </UiVersionProvider>
  )
}
