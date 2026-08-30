'use client'

import { createContext, useContext } from 'react'

type UiVersionContextValue = {
  uiVersion: UiVersion
  /** Persists the choice and repaints the shell in the new direction. */
  setUiVersion: (next: UiVersion) => void
}

const UiVersionContext = createContext<UiVersionContextValue>({
  uiVersion: 'v1',
  setUiVersion: () => {},
})

export const UiVersionProvider = UiVersionContext.Provider

/**
 * Read/write the active visual direction.
 *
 * The settings panels sit several levels below the shell that owns this
 * state, and both directions need the same switch, so it travels by context
 * rather than through two parallel prop chains.
 */
export function useUiVersion() {
  return useContext(UiVersionContext)
}
