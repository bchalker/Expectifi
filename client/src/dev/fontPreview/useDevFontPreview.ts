import { useCallback, useEffect, useState } from 'react'
import {
  DEV_FONT_HEADING_STORAGE_KEY,
  DEV_FONT_SANS_STORAGE_KEY,
  DEV_FONT_HEADING_CATEGORIES,
  DEV_FONT_SANS_CATEGORIES,
  fetchGoogleFontCatalog,
  filterFontsByCategories,
  googleFontCssHref,
  headingFontStack,
  readTokenPrimaryFamily,
  sansFontStack,
  type GoogleFontEntry,
} from './devFontCatalog'

const DEV_FONT_LINK_HEADING_ID = 'dev-font-preview-heading'
const DEV_FONT_LINK_SANS_ID = 'dev-font-preview-sans'

function readStoredFamily(key: string): string | null {
  try {
    const value = sessionStorage.getItem(key)
    return value && value.trim() ? value : null
  } catch {
    return null
  }
}

function writeStoredFamily(key: string, family: string) {
  try {
    sessionStorage.setItem(key, family)
  } catch {
    /* ignore quota / private mode */
  }
}

function ensureStylesheet(id: string, href: string) {
  let link = document.getElementById(id) as HTMLLinkElement | null
  if (!link) {
    link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }
  if (link.href !== href) link.href = href
}

function clearHeadingFontOverride() {
  document.getElementById(DEV_FONT_LINK_HEADING_ID)?.remove()
  document.documentElement.style.removeProperty('--font-heading')
}

function applyHeadingFont(family: string) {
  ensureStylesheet(DEV_FONT_LINK_HEADING_ID, googleFontCssHref(family))
  document.documentElement.style.setProperty('--font-heading', headingFontStack(family))
}

function clearSansFontOverride() {
  document.getElementById(DEV_FONT_LINK_SANS_ID)?.remove()
  document.documentElement.style.removeProperty('--font-sans')
  document.documentElement.style.removeProperty('--font-mono')
  document.documentElement.style.removeProperty('--ds-font-body')
  document.documentElement.style.removeProperty('--ds-font-mono')
}

function applySansFont(family: string) {
  const stack = sansFontStack(family)
  ensureStylesheet(DEV_FONT_LINK_SANS_ID, googleFontCssHref(family))
  document.documentElement.style.setProperty('--font-sans', stack)
  document.documentElement.style.setProperty('--font-mono', stack)
  document.documentElement.style.setProperty('--ds-font-body', stack)
  document.documentElement.style.setProperty('--ds-font-mono', stack)
}

function readInitialHeadingFamily(): string {
  return readStoredFamily(DEV_FONT_HEADING_STORAGE_KEY) ?? readTokenPrimaryFamily('--font-heading')
}

function readInitialSansFamily(): string {
  return readStoredFamily(DEV_FONT_SANS_STORAGE_KEY) ?? readTokenPrimaryFamily('--font-sans')
}

export type DevFontPreviewState = {
  loading: boolean
  error: string | null
  headingFonts: GoogleFontEntry[]
  sansFonts: GoogleFontEntry[]
  headingFamily: string
  sansFamily: string
  setHeadingFamily: (family: string) => void
  setSansFamily: (family: string) => void
}

export function useDevFontPreview(): DevFontPreviewState {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [headingFonts, setHeadingFonts] = useState<GoogleFontEntry[]>([])
  const [sansFonts, setSansFonts] = useState<GoogleFontEntry[]>([])
  const [headingFamily, setHeadingFamilyState] = useState(readInitialHeadingFamily)
  const [sansFamily, setSansFamilyState] = useState(readInitialSansFamily)

  useEffect(() => {
    const storedHeading = readStoredFamily(DEV_FONT_HEADING_STORAGE_KEY)
    const storedSans = readStoredFamily(DEV_FONT_SANS_STORAGE_KEY)

    if (storedHeading) {
      applyHeadingFont(storedHeading)
    } else {
      clearHeadingFontOverride()
      setHeadingFamilyState(readTokenPrimaryFamily('--font-heading'))
    }

    if (storedSans) {
      applySansFont(storedSans)
    } else {
      clearSansFontOverride()
      setSansFamilyState(readTokenPrimaryFamily('--font-sans'))
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void fetchGoogleFontCatalog()
      .then((catalog) => {
        if (cancelled) return
        setHeadingFonts(filterFontsByCategories(catalog, DEV_FONT_HEADING_CATEGORIES))
        setSansFonts(filterFontsByCategories(catalog, DEV_FONT_SANS_CATEGORIES))
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load Google Fonts')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const setHeadingFamily = useCallback((family: string) => {
    setHeadingFamilyState(family)
    writeStoredFamily(DEV_FONT_HEADING_STORAGE_KEY, family)
    applyHeadingFont(family)
  }, [])

  const setSansFamily = useCallback((family: string) => {
    setSansFamilyState(family)
    writeStoredFamily(DEV_FONT_SANS_STORAGE_KEY, family)
    applySansFont(family)
  }, [])

  return {
    loading,
    error,
    headingFonts,
    sansFonts,
    headingFamily,
    sansFamily,
    setHeadingFamily,
    setSansFamily,
  }
}
