import {
  DEFAULT_MARKET_SCENARIO_ID,
  resolveGlobalMarketScenarioRates,
  type MarketScenarioId,
} from './marketScenario'

export type MarketScenarioProjectionSeries = {
  years: number[]
  baseValues: number[]
  scenarioValues: number[]
}

/** Match computeResults horizon clamping for growth-phase projections. */
export function projectionHorizon(yearsToRetirement: number): number {
  return Math.max(1, Math.min(50, Math.round(yearsToRetirement)))
}

/** Calendar-year axis from today through retirement — same as buildLifeEventsProjectionData. */
export function growthPhaseProjectionYears(
  retirementCalendarYear: number,
  yearsToRetirement: number,
): number[] {
  const h = projectionHorizon(yearsToRetirement)
  const currentYear = retirementCalendarYear - h
  const years: number[] = []
  for (let yr = currentYear; yr <= retirementCalendarYear; yr++) {
    years.push(yr)
  }
  return years
}

/**
 * Year-by-year portfolio totals for Base vs a selected market scenario.
 * Calendar years and endpoint totals align with the main computeResults engine when
 * `terminalBaseTotal` / `terminalScenarioTotal` are supplied (same pattern as life events).
 */
export function buildMarketScenarioProjectionSeries(params: {
  retBal: number
  brkBal: number
  annualSave: number
  retRate: number
  brkRate: number
  yearsToRetirement: number
  retirementCalendarYear: number
  scenarioId: MarketScenarioId
  terminalBaseTotal?: number
  terminalScenarioTotal?: number
}): MarketScenarioProjectionSeries {
  const {
    retBal,
    brkBal,
    annualSave,
    retRate,
    brkRate,
    yearsToRetirement,
    retirementCalendarYear,
    scenarioId,
    terminalBaseTotal,
    terminalScenarioTotal,
  } = params

  const h = projectionHorizon(yearsToRetirement)
  const years = growthPhaseProjectionYears(retirementCalendarYear, yearsToRetirement)

  const baseRetRates = resolveGlobalMarketScenarioRates(DEFAULT_MARKET_SCENARIO_ID, retRate, h)
  const baseBrkRates = resolveGlobalMarketScenarioRates(DEFAULT_MARKET_SCENARIO_ID, brkRate, h)
  const scenarioRetRates = resolveGlobalMarketScenarioRates(scenarioId, retRate, h)
  const scenarioBrkRates = resolveGlobalMarketScenarioRates(scenarioId, brkRate, h)

  let baseValues = projectPortfolioTotals(retBal, brkBal, annualSave, baseRetRates, baseBrkRates)
  let scenarioValues = projectPortfolioTotals(retBal, brkBal, annualSave, scenarioRetRates, scenarioBrkRates)

  if (terminalBaseTotal != null && terminalBaseTotal > 0) {
    baseValues = alignSeriesToTerminal(baseValues, terminalBaseTotal)
  }
  if (terminalScenarioTotal != null && terminalScenarioTotal > 0) {
    scenarioValues = alignSeriesToTerminal(scenarioValues, terminalScenarioTotal)
  }

  return { years, baseValues, scenarioValues }
}

function projectPortfolioTotals(
  retBal: number,
  brkBal: number,
  annualSave: number,
  retRates: number[],
  brkRates: number[],
): number[] {
  const values: number[] = []
  let ret = retBal
  let brk = brkBal
  values.push(ret + brk)

  for (let i = 0; i < retRates.length; i++) {
    ret += annualSave
    ret *= 1 + (retRates[i] ?? 0)
    brk *= 1 + (brkRates[i] ?? 0)
    values.push(ret + brk)
  }

  return values
}

/**
 * Match retirement endpoint to computeResults while preserving the year-by-year
 * curve shape from scenario-specific rates (uniform CAGR rescaling destroys shapes).
 */
function alignSeriesToTerminal(values: number[], terminal: number): number[] {
  if (values.length < 2) return values
  const start = values[0] ?? 0
  const end = values[values.length - 1] ?? 0
  if (Math.abs(end - terminal) <= 1) {
    const next = [...values]
    next[next.length - 1] = terminal
    return next
  }
  const delta = end - start
  const targetDelta = terminal - start
  if (Math.abs(delta) <= 1) {
    const next = [...values]
    next[next.length - 1] = terminal
    return next
  }
  return values.map((v, i) => {
    if (i === 0) return start
    if (i === values.length - 1) return terminal
    const t = (v - start) / delta
    return start + t * targetDelta
  })
}
