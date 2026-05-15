import { DEFAULT_DESIGN_TOKENS, DESIGN_STORAGE_KEY } from './designTokens'

export function readStoredDesignTokens(): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(DESIGN_STORAGE_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as unknown
    if (!o || typeof o !== 'object') return null
    return o as Record<string, string>
  } catch {
    return null
  }
}

export function writeStoredDesignTokens(tokens: Record<string, string>) {
  localStorage.setItem(DESIGN_STORAGE_KEY, JSON.stringify(tokens))
}

export function applyDesignTokensToDocument(tokens: Record<string, string>) {
  const root = document.documentElement
  const merged = { ...DEFAULT_DESIGN_TOKENS, ...tokens }
  for (const [k, v] of Object.entries(merged)) {
    const val = typeof v === 'string' && v.trim() ? v.trim() : DEFAULT_DESIGN_TOKENS[k]
    if (val) root.style.setProperty(k, val)
  }
}

export function clearDesignTokensFromDocument() {
  const root = document.documentElement
  for (const k of Object.keys(DEFAULT_DESIGN_TOKENS)) {
    root.style.removeProperty(k)
  }
}

export function resetStoredDesignTokens() {
  localStorage.removeItem(DESIGN_STORAGE_KEY)
  clearDesignTokensFromDocument()
  applyDesignTokensToDocument(DEFAULT_DESIGN_TOKENS)
}
