/** Retirement destination catalog + comparison math (US citizen, simplified tax model). */

import { getUsdToEurRate, usdToEur } from '../api/exchangeRates'
import { calcPortugalTax } from './portugalTax'
import { franceBlendedEffectiveRate } from './franceTax'
import { IT_UNSOURCED_EFFECTIVE_STUB } from './italyTax'

export const MAX_RETIRE_REGIONS = 5

export type RetireRegionId =
  | 'italy'
  | 'portugal'
  | 'spain'
  | 'mexico'
  | 'costa-rica'
  | 'thailand'
  | 'greece'
  | 'panama'
  | 'france'
  | 'united-states'

export type RetireRegionPick = {
  regionId: RetireRegionId
  /** Monthly living cost in USD (user-adjustable; defaults from catalog). */
  monthlyCostUsd: number
}

export type RetireRegionDefinition = {
  id: RetireRegionId
  name: string
  /** 2–3 CSS colors for a simple flag stripe (left → right). */
  flagColors: readonly string[]
  defaultMonthlyCostUsd: number
  /** Annual COL inflation (decimal, e.g. 0.025). */
  annualColInflation: number
  /** Flat tax on gross annual income when set; otherwise local tax estimate is $0 with footnote. */
  localFlatTaxRate: number | null
  localTaxShortLabel: string
  taxSummary: string
  colGuidance: string
  colSliderMax: number
}

export type RetireRegionComparison = {
  regionId: RetireRegionId
  name: string
  flagColors: readonly string[]
  monthlyCostUsd: number
  annualColInflation: number
  localTaxShortLabel: string
  taxSummary: string
  colGuidance: string
  grossMonthlyUsd: number
  localTaxMonthlyUsd: number
  afterTaxMonthlyUsd: number
  surplusMonthlyUsd: number
  usTaxMonthlyUsd: number
  /** Monthly COL after `years` at region inflation rate. */
  projectedCostMonthlyUsd: (years: number) => number
}

const REGIONS: RetireRegionDefinition[] = [
  {
    id: 'italy',
    name: 'Italy',
    flagColors: ['#009246', '#ffffff', '#CE2B37'],
    defaultMonthlyCostUsd: 2800,
    annualColInflation: 0.02,
    // Catalog cities do not qualify for Art. 24-ter 7%. IRPEF brackets unsourced — stub only.
    localFlatTaxRate: IT_UNSOURCED_EFFECTIVE_STUB,
    localTaxShortLabel: 'Progressive IRPEF (stub)',
    taxSummary:
      'Most Expectifi Italy destinations use standard progressive IRPEF — not Article 24-ter. The 7% regime requires an eligible southern or earthquake-zone town ≤30,000 residents; confirmed catalog exceptions (e.g. San Giovanni Rotondo) are modeled at 7% in city views. IRPEF brackets are not sourced yet for non-eligible cities, so this strip uses a temporary planning stub. US citizens still file US returns; Foreign Tax Credit usually prevents double taxation on the same income.',
    colGuidance:
      '$2,000–$2,800: smaller cities (Bari, Lecce, Abruzzo)\n$2,800–$3,800: mid-size cities (Bologna, Florence outskirts)\n$4,000+: Milan, Rome, coastal hotspots',
    colSliderMax: 8000,
  },
  {
    id: 'portugal',
    name: 'Portugal',
    flagColors: ['#006600', '#FF0000', '#FFCC00'],
    defaultMonthlyCostUsd: 2600,
    annualColInflation: 0.022,
    // null — local tax computed via calcPortugalTax (2026 IRS brackets), not a flat rate
    localFlatTaxRate: null,
    localTaxShortLabel: 'Progressive IRS (up to 48%)',
    taxSummary:
      'NHR closed to new applicants in 2024; foreign pensions face progressive IRS rates up to 48% (Art. 68 CIRS). Tax is computed from your gross income using 2026 brackets plus solidarity surcharge above €80k — not tax advice.',
    colGuidance:
      '$1,800–$2,400: interior / smaller towns\n$2,400–$3,200: Porto, Lisbon suburbs\n$3,500+: central Lisbon, Algarve prime areas',
    colSliderMax: 7500,
  },
  {
    id: 'spain',
    name: 'Spain',
    flagColors: ['#AA151B', '#F1BF00', '#AA151B'],
    defaultMonthlyCostUsd: 2700,
    annualColInflation: 0.024,
    localFlatTaxRate: 0.19,
    localTaxShortLabel: '~19% flat (Beckham-style placeholder)',
    taxSummary:
      'Spain’s special expat regimes are limited and evolving. We model a 19% flat rate on gross income as a planning placeholder only.',
    colGuidance:
      '$1,700–$2,300: Andalusia inland, smaller cities\n$2,500–$3,400: Valencia, Seville, Malaga\n$3,800+: Barcelona, Madrid core',
    colSliderMax: 8000,
  },
  {
    id: 'mexico',
    name: 'Mexico',
    flagColors: ['#006847', '#ffffff', '#CE1126'],
    defaultMonthlyCostUsd: 2200,
    annualColInflation: 0.035,
    localFlatTaxRate: null,
    localTaxShortLabel: 'Local tax not modeled',
    taxSummary:
      'Mexico residency triggers complex local rules; US tax still applies on worldwide income. Compare primarily on cost of living — consult a cross-border advisor for tax.',
    colGuidance:
      '$1,200–$1,800: smaller cities (Mérida, Guanajuato)\n$1,800–$2,600: Guadalajara, Playa del Carmen\n$2,800+: Mexico City Polanco, Los Cabos',
    colSliderMax: 6500,
  },
  {
    id: 'costa-rica',
    name: 'Costa Rica',
    flagColors: ['#002B7F', '#ffffff', '#CE1126'],
    defaultMonthlyCostUsd: 2400,
    annualColInflation: 0.03,
    localFlatTaxRate: null,
    localTaxShortLabel: '0% on foreign-source income',
    taxSummary:
      'Costa Rica’s territorial system does not tax foreign-source pensions, Social Security, dividends, or capital gains. Local-source Costa Rican income is taxed progressively (not modeled here). US citizens still owe US tax on worldwide income.',
    colGuidance:
      '$1,600–$2,200: Central Valley towns\n$2,200–$3,000: Escazú, Tamarindo\n$3,200+: premium coastal pockets',
    colSliderMax: 7000,
  },
  {
    id: 'thailand',
    name: 'Thailand',
    flagColors: ['#A51931', '#ffffff', '#2D2A4A'],
    defaultMonthlyCostUsd: 1800,
    annualColInflation: 0.028,
    localFlatTaxRate: null,
    localTaxShortLabel: 'Local tax not modeled',
    taxSummary:
      'Thailand tax residency rules depend on time spent in-country and income type. US filing continues; model focuses on COL and lifestyle cost.',
    colGuidance:
      '$1,000–$1,500: Chiang Mai, Isaan\n$1,500–$2,200: Bangkok suburbs\n$2,500+: central Bangkok, Phuket west coast',
    colSliderMax: 5500,
  },
  {
    id: 'greece',
    name: 'Greece',
    flagColors: ['#0D5EAF', '#ffffff', '#0D5EAF'],
    defaultMonthlyCostUsd: 2100,
    annualColInflation: 0.025,
    localFlatTaxRate: 0.07,
    localTaxShortLabel: '7% flat (foreign pension income)',
    taxSummary:
      'Greece offers a flat regime on foreign pension income for qualifying retirees. US tax still applies; FTC may offset depending on circumstances.',
    colGuidance:
      '$1,400–$1,900: mainland towns, Peloponnese\n$1,900–$2,600: Thessaloniki, Crete\n$2,800+: Athens center, Mykonos/Santorini season',
    colSliderMax: 6500,
  },
  {
    id: 'panama',
    name: 'Panama',
    flagColors: ['#ffffff', '#005293', '#D21034'],
    defaultMonthlyCostUsd: 2300,
    annualColInflation: 0.025,
    localFlatTaxRate: null,
    localTaxShortLabel: 'Territorial (simplified)',
    taxSummary:
      'Panama’s territorial system can exclude foreign-source income from local tax when structured correctly. US citizens still owe US tax; compare COL and visa paths.',
    colGuidance:
      '$1,500–$2,000: interior (Boquete, David)\n$2,000–$2,800: Panama City suburbs\n$3,000+: Punta Pacifica, beach corridors',
    colSliderMax: 7000,
  },
  {
    id: 'france',
    name: 'France',
    flagColors: ['#0055A4', '#ffffff', '#EF4135'],
    defaultMonthlyCostUsd: 3200,
    annualColInflation: 0.018,
    // SS uses calcFranceSSTax; non-SS uses stub — see FRANCE_PENSION_TYPE_FOLLOWUP in franceTax.ts
    localFlatTaxRate: null,
    localTaxShortLabel: 'SS progressive + stub',
    taxSummary:
      'France: US Social Security is taxed under 2026 progressive brackets (Art. 20). Other retirement income is 0–45% depending on amount and pension type; US government pensions may be reserved to US taxation (Art. 19). CSM (~6.5%) and prélèvements sociaux can apply on top — not modeled. Non-SS surplus math uses a ~25% stub until government vs private pension is distinguished in the product.',
    colGuidance:
      '$2,200–$2,800: smaller cities (Toulouse, Lyon outskirts)\n$2,800–$3,800: Bordeaux, Nantes\n$4,000+: Paris, Côte d’Azur',
    colSliderMax: 9000,
  },
  {
    id: 'united-states',
    name: 'United States',
    flagColors: ['#3C3B6E', '#ffffff', '#B22234'],
    defaultMonthlyCostUsd: 4500,
    annualColInflation: 0.025,
    localFlatTaxRate: null,
    localTaxShortLabel: 'US federal (same model)',
    taxSummary:
      'Staying in the US uses your federal tax model above. Adjust monthly cost for your state and city — this default is a moderate COL metro average.',
    colGuidance:
      '$2,800–$3,500: LCOL metros & suburbs\n$3,500–$5,000: mid-tier cities\n$5,500+: HCOL (SF, NYC, Boston)',
    colSliderMax: 12000,
  },
]

const REGION_BY_ID = new Map(REGIONS.map((r) => [r.id, r]))

export function listRetireRegions(): readonly RetireRegionDefinition[] {
  return REGIONS
}

export function getRetireRegion(id: string): RetireRegionDefinition | undefined {
  return REGION_BY_ID.get(id as RetireRegionId)
}

export function isRetireRegionId(id: string): id is RetireRegionId {
  return REGION_BY_ID.has(id as RetireRegionId)
}

export function defaultRetireRegionPick(id: RetireRegionId = 'italy'): RetireRegionPick {
  const def = getRetireRegion(id) ?? REGIONS[0]
  return { regionId: def.id, monthlyCostUsd: def.defaultMonthlyCostUsd }
}

/** Hydrate picks from saved state or legacy `italyCost`. */
export function normalizeRetireRegions(
  raw: unknown,
  legacyItalyCost?: number,
): RetireRegionPick[] {
  const picks: RetireRegionPick[] = []
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue
      const o = item as Record<string, unknown>
      const regionId = typeof o.regionId === 'string' ? o.regionId : ''
      if (!isRetireRegionId(regionId)) continue
      const def = getRetireRegion(regionId)!
      const monthlyCostUsd =
        typeof o.monthlyCostUsd === 'number' && Number.isFinite(o.monthlyCostUsd)
          ? Math.max(0, o.monthlyCostUsd)
          : def.defaultMonthlyCostUsd
      picks.push({ regionId, monthlyCostUsd })
      if (picks.length >= MAX_RETIRE_REGIONS) break
    }
  }
  if (picks.length > 0) return picks

  if (typeof legacyItalyCost === 'number' && legacyItalyCost > 0) {
    return [{ regionId: 'italy', monthlyCostUsd: legacyItalyCost }]
  }

  return [defaultRetireRegionPick('italy')]
}

export function computeRetireRegionComparison(
  pick: RetireRegionPick,
  grossAnnualUsd: number,
  usTaxAnnualUsd: number,
  annualSsUsd?: number,
): RetireRegionComparison | null {
  const def = getRetireRegion(pick.regionId)
  if (!def) return null

  const grossMonthlyUsd = grossAnnualUsd / 12
  let localTaxAnnualUsd = 0
  if (def.id === 'united-states') {
    localTaxAnnualUsd = usTaxAnnualUsd
  } else if (def.id === 'portugal') {
    const eurPerUsd = getUsdToEurRate()
    const taxEur = calcPortugalTax(usdToEur(grossAnnualUsd)).totalTax
    localTaxAnnualUsd = eurPerUsd > 0 ? taxEur / eurPerUsd : 0
  } else if (def.id === 'france') {
    const eurPerUsd = getUsdToEurRate()
    const rate = franceBlendedEffectiveRate(
      grossAnnualUsd,
      annualSsUsd,
      usdToEur,
      (eur) => (eurPerUsd > 0 ? eur / eurPerUsd : 0),
    )
    localTaxAnnualUsd = grossAnnualUsd * rate
  } else if (def.localFlatTaxRate != null) {
    localTaxAnnualUsd = grossAnnualUsd * def.localFlatTaxRate
  }

  const afterTaxMonthlyUsd = Math.max(0, (grossAnnualUsd - localTaxAnnualUsd) / 12)
  const surplusMonthlyUsd = afterTaxMonthlyUsd - pick.monthlyCostUsd

  return {
    regionId: def.id,
    name: def.name,
    flagColors: def.flagColors,
    monthlyCostUsd: pick.monthlyCostUsd,
    annualColInflation: def.annualColInflation,
    localTaxShortLabel: def.localTaxShortLabel,
    taxSummary: def.taxSummary,
    colGuidance: def.colGuidance,
    grossMonthlyUsd,
    localTaxMonthlyUsd: localTaxAnnualUsd / 12,
    afterTaxMonthlyUsd,
    surplusMonthlyUsd,
    usTaxMonthlyUsd: usTaxAnnualUsd / 12,
    projectedCostMonthlyUsd: (years: number) =>
      pick.monthlyCostUsd * Math.pow(1 + def.annualColInflation, Math.max(0, years)),
  }
}

export function computeAllRetireRegionComparisons(
  picks: RetireRegionPick[],
  grossAnnualUsd: number,
  usTaxAnnualUsd: number,
  annualSsUsd?: number,
): RetireRegionComparison[] {
  return picks
    .map((pick) =>
      computeRetireRegionComparison(pick, grossAnnualUsd, usTaxAnnualUsd, annualSsUsd),
    )
    .filter((row): row is RetireRegionComparison => row != null)
}
