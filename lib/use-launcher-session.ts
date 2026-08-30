'use client'

import { useCallback, useEffect, useState } from 'react'

export type ConnectionStatus = 'connected' | 'offline' | 'disconnected'

/**
 * Session, server list and connection state for the launcher shell.
 *
 * Both visual directions render the same account and the same servers, so
 * this lives outside either of them. Keeping it here is what stops v1 and
 * v2 from drifting into two separate integrations against the same IPC
 * surface.
 */
export function useLauncherSession() {
  const [user, setUser] = useState<LauncherUser | null>(null)
  const [servers, setServers] = useState<LauncherServer[]>([])
  const [selectedServerId, setSelectedServerId] = useState('')
  const [loadingSession, setLoadingSession] = useState(true)
  const [loadingServers, setLoadingServers] = useState(false)
  const [connectionError, setConnectionError] = useState('')
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('disconnected')

  const refreshServers = useCallback(async () => {
    if (!window.electronAPI || !user) return
    setLoadingServers(true)
    setConnectionError('')
    try {
      setServers(await window.electronAPI.listServers())
    } catch (error) {
      setConnectionError(
        error instanceof Error ? error.message : 'Backend mavjud emas',
      )
    } finally {
      setLoadingServers(false)
    }
  }, [user])

  useEffect(() => {
    async function bootstrap() {
      if (!window.electronAPI) {
        setLoadingSession(false)
        return
      }
      try {
        const session = await window.electronAPI.getSession()
        if (session.authenticated) {
          setUser(session.user)
        } else if (session.error) {
          setConnectionError(session.error)
        }
      } finally {
        setLoadingSession(false)
      }
    }
    bootstrap()

    const api = window.electronAPI
    if (!api) return

    const unsubWsConnected = api.onWsConnected(() =>
      setConnectionStatus('connected'),
    )
    const unsubWsDisconnected = api.onWsDisconnected(() => {
      if (api.hasValidCache) {
        api
          .hasValidCache()
          .then((valid) => setConnectionStatus(valid ? 'offline' : 'disconnected'))
      } else {
        setConnectionStatus('disconnected')
      }
    })
    const unsubWsStatus = api.onWsStatus(() => setConnectionStatus('connected'))

    return () => {
      unsubWsConnected()
      unsubWsDisconnected()
      unsubWsStatus()
    }
  }, [])

  useEffect(() => {
    if (user) {
      refreshServers()
    } else {
      setServers([])
      setSelectedServerId('')
    }
  }, [user, refreshServers])

  useEffect(() => {
    if (!window.electronAPI) return
    window.electronAPI.checkUpdate().catch(() => {})
  }, [])

  useEffect(() => {
    if (servers.length > 0 && !selectedServerId) {
      setSelectedServerId(servers[0].id)
    }
  }, [servers, selectedServerId])

  const login = useCallback(async (username: string, password: string) => {
    if (!window.electronAPI) return
    setConnectionError('')
    try {
      const session = await window.electronAPI.login({ username, password })
      setUser(session.user)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Kirish muvaffaqiyatsiz bo\'ldi'
      setConnectionError(message)
      throw error
    }
  }, [])

  const oauthLogin = useCallback(async (provider: 'google' | 'telegram') => {
    if (!window.electronAPI) return
    setConnectionError('')
    try {
      const session = await window.electronAPI.startOauth(provider)
      setUser(session.user)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Ijtimoiy tarmoq orqali kirish muvaffaqiyatsiz bo\'ldi'
      setConnectionError(message)
      throw error
    }
  }, [])

  const logout = useCallback(async () => {
    await window.electronAPI?.logout()
    setUser(null)
    setServers([])
  }, [])

  const onlinePlayers = servers.reduce(
    (sum, server) => sum + (server.current_players || 0),
    0,
  )

  return {
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
    login,
    oauthLogin,
    logout,
  }
}
