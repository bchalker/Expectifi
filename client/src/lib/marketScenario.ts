import { calcPositionFV } from './positionReturnModel'

/** Macro market regime applied dashboard-wide unless superseded at bucket or holding level. */
export type MarketScenarioId =
  | 'base'
  | 'bull'
  | 'bear'
  | 'stagflation'
  | 'lost_decade'
  | 'recession_recovery'

export type MarketScenarioKind = 'flat_modifier' | 'curve'

export type MarketScenarioDefinition = {
  id: MarketScenarioId
  label: string
  description: string
  /** Plain-language copy for the dashboard context row. */
  contextDescription: string
  /** One-sentence summary for the context row left column. */
  contextSummary: string
  /** Short modifier hint shown in the selector menu. */
  modifierLabel: string
  kind: MarketScenarioKind
  /** Decimal added to the global slider rate each year (flat scenarios). */
  flatModifier?: number
  /** Percent points added to the global slider rate per year (curve scenarios). */
  curveOffsetsPct?: readonly number[]
}

export const DEFAULT_MARKET_SCENARIO_ID: MarketScenarioId = 'base'

/** Visible near the scenario selector — these are hand-authored rate paths, not models. */
export const MARKET_SCENARIO_ILLUSTRATIVE_NOTE =
  'Illustrative fixed-rate paths — not statistical projections, Monte Carlo simulations, or historical backtests.'

export const MARKET_SCENARIOS: readonly MarketScenarioDefinition[] = [
  {
    id: 'base',
    label: 'None',
    description: 'Your global slider rate, no adjustment.',
    contextDescription:
      'Your global growth rate applies across the board. No adjustments, no assumptions, just the rate you set.',
    contextSummary:
      'Your global growth rate applies across the board. No adjustments, no assumptions, just the rate you set.',
    modifierLabel: '0%',
    kind: 'flat_modifier',
    flatModifier: 0,
  },
  {
    id: 'bull',
    label: 'Bull run',
    description: 'Optimistic sustained growth above your global slider rate.',
    contextDescription:
      'Markets climb steadily and stay there. Companies grow, investor confidence holds, and your portfolio compounds faster than average. Similar in spirit to long bull stretches like 2013–17, using an illustrative fixed rate rather than actual historical returns.',
    contextSummary:
      'Markets climb steadily and stay there. Companies grow, investor confidence holds, and your portfolio compounds faster than average. Similar in spirit to long bull stretches like 2013–17, using an illustrative fixed rate rather than actual historical returns.',
    modifierLabel: '+3%',
    kind: 'flat_modifier',
    flatModifier: 0.03,
  },
  {
    id: 'bear',
    label: 'Bear market',
    description: 'Prolonged downturn below your global slider rate.',
    contextDescription:
      "Prices fall and stay down for a while. It's not a crash, it's a grind. Returns shrink, recovery is slow, and the drag compounds over time the same way gains do, just in the wrong direction.",
    contextSummary:
      "Prices fall and stay down for a while. It's not a crash, it's a grind. Returns shrink, recovery is slow, and the drag compounds over time the same way gains do, just in the wrong direction.",
    modifierLabel: '-4%',
    kind: 'flat_modifier',
    flatModifier: -0.04,
  },
  {
    id: 'stagflation',
    label: 'Stagflation',
    description: 'A sustained lower-growth scenario (illustrative fixed rate).',
    contextDescription:
      'The worst of both worlds: the economy stalls but prices keep rising. Your returns may look okay on paper while purchasing power feels squeezed. Similar in spirit to the 1970s, using an illustrative fixed rate rather than actual historical returns.',
    contextSummary:
      'The worst of both worlds: the economy stalls but prices keep rising. Your returns may look okay on paper while purchasing power feels squeezed. Similar in spirit to the 1970s, using an illustrative fixed rate rather than actual historical returns.',
    modifierLabel: '-2%',
    kind: 'flat_modifier',
    flatModifier: -0.02,
  },
  {
    id: 'lost_decade',
    label: 'Lost decade',
    description: 'Flat or near-zero growth for five years, then recovery.',
    contextDescription:
      "Growth doesn't crash, it just disappears for years. Your portfolio treads water while time passes. Similar in spirit to a lost decade like the 2000s, using an illustrative fixed curve rather than actual historical returns. Starting point and timing matter enormously here.",
    contextSummary:
      "Growth doesn't crash, it just disappears for years. Your portfolio treads water while time passes. Similar in spirit to a lost decade like the 2000s, using an illustrative fixed curve rather than actual historical returns. Starting point and timing matter enormously here.",
    modifierLabel: 'Custom curve',
    kind: 'curve',
    curveOffsetsPct: [-6, -6, -5, -5, -4, 2, 3, 4, 3, 2],
  },
  {
    id: 'recession_recovery',
    label: 'Recession + recovery',
    description: 'Two negative years, then an above-average bounce.',
    contextDescription:
      'A sharp contraction, with negative returns for a year or two, followed by a faster-than-normal rebound. The net outcome depends almost entirely on where you are in your timeline. Early in your window it can average out fine. Close to retirement, the early losses hit harder.',
    contextSummary:
      'A sharp contraction, with negative returns for a year or two, followed by a faster-than-normal rebound. The net outcome depends almost entirely on where you are in your timeline. Early in your window it can average out fine. Close to retirement, the early losses hit harder.',
    modifierLabel: 'Custom curve',
    kind: 'curve',
    curveOffsetsPct: [-4, -3, 4, 5, 4, 3],
  },
] as const

const MARKET_SCENARIO_BY_ID = Object.fromEntries(
  MARKET_SCENARIOS.map((s) => [s.id, s]),
) as Record<MarketScenarioId, MarketScenarioDefinition>

export function normalizeMarketScenarioId(value: unknown): MarketScenarioId {
  if (typeof value === 'string' && value in MARKET_SCENARIO_BY_ID) {
    return value as MarketScenarioId
  }
  return DEFAULT_MARKET_SCENARIO_ID
}

export function getMarketScenarioDefinition(id: MarketScenarioId): MarketScenarioDefinition {
  return MARKET_SCENARIO_BY_ID[id] ?? MARKET_SCENARIO_BY_ID.base
}

/**
 * Resolve annual return path (decimals) for the global market scenario tier.
 * Applies on top of the user's global slider rate (`globalBlendedRate`).
 */
export function resolveGlobalMarketScenarioRates(
  scenarioId: MarketScenarioId | undefined,
  globalBlendedRate: number,
  horizon: number,
): number[] {
  const id = scenarioId ?? DEFAULT_MARKET_SCENARIO_ID
  const def = getMarketScenarioDefinition(id)
  const h = Math.max(1, Math.round(horizon))

  if (def.kind === 'flat_modifier') {
    const rate = globalBlendedRate + (def.flatModifier ?? 0)
    return Array.from({ length: h }, () => rate)
  }

  const offsets = def.curveOffsetsPct ?? []
  const rates: number[] = []
  for (let i = 0; i < h; i++) {
    const offsetPct = i < offsets.length ? offsets[i]! : (offsets[offsets.length - 1] ?? 0)
    rates.push(globalBlendedRate + offsetPct / 100)
  }
  return rates
}

export function marketScenarioIsBase(scenarioId: MarketScenarioId | undefined): boolean {
  return normalizeMarketScenarioId(scenarioId) === DEFAULT_MARKET_SCENARIO_ID
}

export type MarketScenarioInputState = {
  marketScenario?: MarketScenarioId
  marketScenarioActive?: boolean
}

/** UI + compute: non-Base scenarios apply when selected. */
export function resolveMarketScenarioActive(inputs: MarketScenarioInputState): boolean {
  return !marketScenarioIsBase(inputs.marketScenario)
}

/** Whether the selected macro scenario affects projections (non-Base and toggle on). */
export function isMarketScenarioApplied(inputs: MarketScenarioInputState): boolean {
  return resolveMarketScenarioActive(inputs)
}

/** Scenario id used in compute — Base when inactive or Base is selected. */
export function effectiveMarketScenarioId(inputs: MarketScenarioInputState): MarketScenarioId {
  return isMarketScenarioApplied(inputs) ? normalizeMarketScenarioId(inputs.marketScenario) : 'base'
}

/** One-line modifier summary for the dashboard context row. */
export function marketScenarioModifierSummary(scenarioId: MarketScenarioId): string {
  const def = getMarketScenarioDefinition(scenarioId)
  if (def.kind === 'flat_modifier' && def.flatModifier != null && def.flatModifier !== 0) {
    const pct = Math.abs(def.flatModifier * 100)
    const sign = def.flatModifier > 0 ? '+' : '−'
    return `Applies ${sign}${pct.toFixed(0)}% adjustment to all holdings using the global rate.`
  }
  if (def.kind === 'curve') {
    return 'Applies a custom year-by-year return curve on top of your global rate for holdings without their own override.'
  }
  return 'Uses your global slider rate with no macro adjustment.'
}

/** Hero pill label, e.g. "Bull run +3%" — modifier from resolved global rates. */
export function marketScenarioHeroBadgeLabel(
  scenarioId: MarketScenarioId,
  globalBlendedRate: number,
  horizon: number,
): string {
  const def = getMarketScenarioDefinition(scenarioId)
  const rates = resolveGlobalMarketScenarioRates(scenarioId, globalBlendedRate, horizon)
  if (rates.length === 0) return def.label
  const avgOffset =
    rates.reduce((sum, rate) => sum + (rate - globalBlendedRate), 0) / rates.length
  const roundedPct = Math.round(avgOffset * 100)
  if (roundedPct === 0) return def.label
  const sign = roundedPct > 0 ? '+' : '−'
  return `${def.label} ${sign}${Math.abs(roundedPct)}%`
}

/** Compound a balance with a variable annual return path. */
export function fvWithYearlyRates(principal: number, yearlyRates: number[]): number {
  return calcPositionFV(principal, yearlyRates)
}

/** End value of equal annual contributions with a variable return path. */
export function fvAnnuityWithYearlyRates(payment: number, yearlyRates: number[]): number {
  let balance = 0
  for (const r of yearlyRates) {
    balance = (balance + payment) * (1 + r)
  }
  return balance
}
