import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  applyDesignTokensToDocument,
  readStoredDesignTokens,
  resetStoredDesignTokens,
  writeStoredDesignTokens,
} from './applyDesignTokens'
import { DEFAULT_DESIGN_TOKENS } from './designTokens'

type Ctx = {
  tokens: Record<string, string>
  setToken: (key: string, value: string) => void
  save: () => void
  reset: () => void
}

const DesignSystemContext = createContext<Ctx | null>(null)

export function DesignSystemProvider({ children }: { children: ReactNode }) {
  const [tokens, setTokensState] = useState<Record<string, string>>(() => ({
    ...DEFAULT_DESIGN_TOKENS,
    ...readStoredDesignTokens(),
  }))

  useEffect(() => {
    applyDesignTokensToDocument(tokens)
  }, [tokens])

  const setToken = useCallback((key: string, value: string) => {
    setTokensState((s) => ({ ...s, [key]: value }))
  }, [])

  const save = useCallback(() => {
    writeStoredDesignTokens(tokens)
    applyDesignTokensToDocument(tokens)
  }, [tokens])

  const reset = useCallback(() => {
    resetStoredDesignTokens()
    setTokensState({ ...DEFAULT_DESIGN_TOKENS })
  }, [])

  const value = useMemo(() => ({ tokens, setToken, save, reset }), [tokens, setToken, save, reset])

  return <DesignSystemContext.Provider value={value}>{children}</DesignSystemContext.Provider>
}

export function useDesignSystem() {
  const c = useContext(DesignSystemContext)
  if (!c) throw new Error('useDesignSystem must be used within DesignSystemProvider')
  return c
}
