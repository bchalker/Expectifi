export type GoogleFontCategory =
  | 'Sans Serif'
  | 'Serif'
  | 'Display'
  | 'Handwriting'
  | 'Monospace'

export type GoogleFontEntry = {
  family: string
  category: GoogleFontCategory
}

type GoogleFontsMetadataResponse = {
  familyMetadataList: Array<{
    family: string
    category: GoogleFontCategory
  }>
}

let catalogPromise: Promise<GoogleFontEntry[]> | null = null

function parseGoogleFontsMetadata(text: string): GoogleFontEntry[] {
  const jsonText = text.startsWith(")]}'") ? text.replace(/^\)\]\}'\n?/, '') : text
  const data = JSON.parse(jsonText) as GoogleFontsMetadataResponse
  return data.familyMetadataList
    .map(({ family, category }) => ({ family, category }))
    .sort((a, b) => a.family.localeCompare(b.family, undefined, { sensitivity: 'base' }))
}

/** Fetches the full Google Fonts catalog (dev tooling only). */
export async function fetchGoogleFontCatalog(): Promise<GoogleFontEntry[]> {
  if (!import.meta.env.DEV) {
    throw new Error('Font preview is only available in development')
  }
  if (!catalogPromise) {
    catalogPromise = fetch('/api/dev/google-fonts-metadata')
      .then(async (res) => {
        if (!res.ok) throw new Error(`Google Fonts metadata failed (${res.status})`)
        const text = await res.text()
        return parseGoogleFontsMetadata(text)
      })
      .catch((err) => {
        catalogPromise = null
        throw err
      })
  }
  return catalogPromise
}

export function filterFontsByCategories(
  catalog: GoogleFontEntry[],
  categories: readonly GoogleFontCategory[],
): GoogleFontEntry[] {
  const allowed = new Set(categories)
  return catalog.filter((entry) => allowed.has(entry.category))
}

export const DEV_FONT_HEADING_CATEGORIES = ['Serif', 'Handwriting'] as const satisfies readonly GoogleFontCategory[]

export const DEV_FONT_SANS_CATEGORIES = ['Sans Serif', 'Serif'] as const satisfies readonly GoogleFontCategory[]

export const DEV_FONT_HEADING_STORAGE_KEY = 'retirement-calculator/dev-font-heading'
export const DEV_FONT_SANS_STORAGE_KEY = 'retirement-calculator/dev-font-sans'

export function googleFontCssHref(family: string): string {
  const encoded = encodeURIComponent(family).replace(/%20/g, '+')
  return `https://fonts.googleapis.com/css2?family=${encoded}&display=swap`
}

export function headingFontStack(family: string): string {
  return `'${family}', Georgia, 'Times New Roman', serif`
}

export function sansFontStack(family: string): string {
  return `'${family}', system-ui, -apple-system, sans-serif`
}

export function parsePrimaryFontFamily(fontStack: string): string {
  const first = fontStack.split(',')[0]?.trim() ?? ''
  return first.replace(/^['"]|['"]$/g, '')
}

export function readTokenPrimaryFamily(token: '--font-heading' | '--font-sans'): string {
  return parsePrimaryFontFamily(getComputedStyle(document.documentElement).getPropertyValue(token))
}
