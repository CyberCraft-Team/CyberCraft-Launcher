const WebSocket = require('ws')

class WebSocketManager {
  constructor() {
    this.ws = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 10
    this.shouldReconnect = false
    this.wsToken = null
    this.wsEndpoints = null
    this.tokenRefreshTimer = null
    this.apiRequestFn = null
    this.apiBaseUrl = 'http://127.0.0.1:8000/api/v1'
    this.mainWindow = null
  }

  setMainWindow(mainWindow) {
    this.mainWindow = mainWindow
  }

  setApiBaseUrl(apiBaseUrl) {
    if (apiBaseUrl) this.apiBaseUrl = apiBaseUrl
  }

  async getWsToken(apiRequestFn) {
    try {
      const result = await apiRequestFn('/launcher/ws-token/')
      this.wsToken = result.token
      this.wsEndpoints = result.ws_endpoints
      this.scheduleTokenRefresh(result.expires_at, apiRequestFn)
      return true
    } catch (error) {
      console.error('Failed to get WS token:', error.message)
      return false
    }
  }

  scheduleTokenRefresh(expiresAt, apiRequestFn) {
    if (this.tokenRefreshTimer) clearTimeout(this.tokenRefreshTimer)
    const expiresMs = new Date(expiresAt).getTime() - Date.now()
    const refreshIn = Math.max(expiresMs - 60000, 10000)
    this.tokenRefreshTimer = setTimeout(async () => {
      if (this.shouldReconnect) {
        await this.getWsToken(apiRequestFn)
        await this.connectToEndpoint('status')
      }
    }, refreshIn)
  }

  async connectToEndpoint(endpoint) {
    if (!this.wsEndpoints || !this.wsEndpoints[endpoint]) {
      console.error(`Unknown WS endpoint: ${endpoint}`)
      return
    }

    try {
      const apiHost = new URL(this.apiBaseUrl).host
      const wsProtocol = this.apiBaseUrl.startsWith('https') ? 'wss' : 'ws'
      const url = `${wsProtocol}://${apiHost}${this.wsEndpoints[endpoint]}?token=${this.wsToken}`

      if (this.ws) {
        this.ws.close()
        this.ws = null
      }

      this.ws = new WebSocket(url)

      this.ws.on('open', () => {
        console.log(`WebSocket connected: ${endpoint}`)
        this.reconnectAttempts = 0
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('ws:connected', { endpoint })
        }
      })

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString())
          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            if (message.type === 'status_update') {
              this.mainWindow.webContents.send('ws:status', message)
            } else if (message.type === 'console_log') {
              this.mainWindow.webContents.send('ws:console', message)
            } else if (message.type === 'launch_progress') {
              this.mainWindow.webContents.send('ws:launch-progress', message)
            } else if (message.type === 'update_notification') {
              this.mainWindow.webContents.send('ws:update', message)
            }
          }
        } catch (e) {
          console.error('WS message parse error:', e)
        }
      })

      this.ws.on('close', (code) => {
        console.log(`WebSocket closed: ${code}`)
        this.ws = null
        if (this.shouldReconnect) this.scheduleReconnect()
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('ws:disconnected', { endpoint, code })
        }
      })

      this.ws.on('error', (err) => {
        console.error('WebSocket error:', err.message)
      })
    } catch (error) {
      console.error('WebSocket connection error:', error)
      if (this.shouldReconnect) this.scheduleReconnect()
    }
  }

  scheduleReconnect() {
    this.reconnectAttempts++
    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached')
      this.shouldReconnect = false
      return
    }
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000)
    setTimeout(() => {
      if (this.shouldReconnect && this.apiRequestFn) this.connect(this.apiRequestFn)
    }, delay)
  }

  async connect(apiRequestFn) {
    this.apiRequestFn = apiRequestFn
    if (!await this.getWsToken(apiRequestFn)) return
    this.shouldReconnect = true
    await this.connectToEndpoint('status')
  }

  updateAuthToken(token) {
    if (this.shouldReconnect && this.ws) {
      this.disconnect()
      setTimeout(() => { if (this.apiRequestFn) this.connect(this.apiRequestFn) }, 100)
    }
  }

  disconnect() {
    this.shouldReconnect = false
    if (this.tokenRefreshTimer) clearTimeout(this.tokenRefreshTimer)
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}

module.exports = { WebSocketManager }
