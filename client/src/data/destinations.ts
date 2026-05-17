import { COUNTRY_TAX_RATES } from './countryTaxRates'
import { STATE_TAX_RATES } from './stateTaxRates'

export type DestinationKind = 'country' | 'us-state'

export type DestinationCatalogEntry = {
  key: string
  kind: DestinationKind
  code: string
  name: string
  searchText: string
  flagEmoji?: string
  stateAbbr?: string
  noIncomeTax: boolean
  teleportSlug: string
  defaultMonthlyCostUsd: number
}

function buildCatalog(): DestinationCatalogEntry[] {
  const states: DestinationCatalogEntry[] = Object.values(STATE_TAX_RATES).map((s) => ({
    key: `state:${s.code}`,
    kind: 'us-state' as const,
    code: s.code,
    name: s.name,
    searchText: `${s.name} ${s.code} united states usa us state`.toLowerCase(),
    stateAbbr: s.code,
    noIncomeTax: s.noIncomeTax,
    teleportSlug: s.teleportSlug,
    defaultMonthlyCostUsd: s.defaultMonthlyCostUsd,
  }))

  const countries: DestinationCatalogEntry[] = Object.values(COUNTRY_TAX_RATES).map((c) => ({
    key: `country:${c.code}`,
    kind: 'country' as const,
    code: c.code,
    name: c.name,
    searchText: `${c.name} ${c.code} country international`.toLowerCase(),
    flagEmoji: c.flagEmoji,
    noIncomeTax: c.effectiveRetirementRate === 0,
    teleportSlug: c.teleportSlug,
    defaultMonthlyCostUsd: c.defaultMonthlyCostUsd,
  }))

  return [...countries, ...states].sort((a, b) => a.name.localeCompare(b.name))
}

export const DESTINATION_CATALOG = buildCatalog()

export function searchDestinations(query: string, limit = 12): DestinationCatalogEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return DESTINATION_CATALOG.filter((d) => d.searchText.includes(q) || d.name.toLowerCase().startsWith(q))
    .slice(0, limit)
}

export function getCatalogEntry(key: string): DestinationCatalogEntry | undefined {
  return DESTINATION_CATALOG.find((d) => d.key === key)
}
