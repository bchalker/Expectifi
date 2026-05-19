import type { DestinationCatalogEntry, DestinationKind } from '../../data/destinations'

/** Teleport slug → livingcost.org path segment(s) after `/cost/`. */
const TELEPORT_PATH_OVERRIDES: Record<string, string> = {
  'kansas-city-mo': 'united-states/mo/kansas',
  'oklahoma-city-ok': 'united-states/ok/oklahoma',
  'salt-lake-city-ut': 'united-states/ut/salt-lake',
  'rome-it': 'italy/lz/rome',
  'lyon-fr': 'france/ara/lyon',
  'berlin-de': 'germany/bb/berlin',
  'edinburgh-gb': 'united-kingdom/sct/edinburgh',
  'halifax-ca': 'canada/ns/halifax',
  'panama-city-pa': 'panama/panama',
  'penang-my': 'malaysia',
}

const COUNTRY_SLUG_BY_CODE: Record<string, string> = {
  pt: 'portugal',
  es: 'spain',
  it: 'italy',
  mx: 'mexico',
  cr: 'costa-rica',
  pa: 'panama',
  th: 'thailand',
  gr: 'greece',
  fr: 'france',
  de: 'germany',
  nl: 'netherlands',
  ie: 'ireland',
  gb: 'united-kingdom',
  ca: 'canada',
  au: 'australia',
  nz: 'new-zealand',
  jp: 'japan',
  co: 'colombia',
  ec: 'ecuador',
  vn: 'vietnam',
  ph: 'philippines',
  my: 'malaysia',
  uy: 'uruguay',
  cl: 'chile',
}

export function livingCostPathForTeleportSlug(slug: string, kind: DestinationKind): string {
  const override = TELEPORT_PATH_OVERRIDES[slug]
  if (override) return override

  const m = slug.match(/^(.+)-([a-z]{2})$/i)
  if (!m) return kind === 'us-state' ? 'united-states' : slug

  const city = m[1]
  const cc = m[2].toLowerCase()

  if (kind === 'us-state') {
    return `united-states/${cc}/${city}`
  }

  const country = COUNTRY_SLUG_BY_CODE[cc]
  return country ? `${country}/${city}` : slug
}

export function livingCostPathForEntry(entry: DestinationCatalogEntry): string {
  return livingCostPathForTeleportSlug(entry.teleportSlug, entry.kind)
}

/** Allowed for API `path` query — blocks traversal and odd characters. */
export function isValidLivingCostPath(path: string): boolean {
  if (!path || path.length > 96) return false
  return /^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/i.test(path)
}
