import {
  decimalToPct,
  scenarioRatesDecimal,
  type PositionScenarioId,
} from './positionReturnModel'

function horizonClamp(y: number): number {
  return Math.max(1, Math.min(50, Math.round(y)))
}

/**
 * Outlook preset paths anchored to the user's global slider rate.
 * Preserves SCENARIO_PRESETS shape (early bull spike, bear dip) relative to Normal/base anchor.
 */
export function globalRelativeScenarioRates(
  choice: PositionScenarioId,
  globalBlended: number,
  horizon: number,
): number[] {
  const h = horizonClamp(horizon)
  const preset = scenarioRatesDecimal(choice, h)
  const anchor = scenarioRatesDecimal('base', h)
  return preset.map((rate, i) => {
    const anchorRate = anchor[i] ?? anchor[anchor.length - 1] ?? globalBlended
    return globalBlended + (rate - anchorRate)
  })
}

export function ratesMatchAnchoredScenario(
  scenario: PositionScenarioId,
  rates: number[],
  horizon: number,
  globalBlended: number,
): boolean {
  const h = horizonClamp(horizon)
  const target = globalRelativeScenarioRates(scenario, globalBlended, h)
  for (let i = 0; i < h; i++) {
    if (Math.abs((rates[i] ?? 0) - (target[i] ?? 0)) > 1e-4) return false
  }
  return true
}

export function anchoredOutlookScenarioRateRangePcts(
  choice: PositionScenarioId,
  globalBlended: number,
  horizon: number,
): { min: number; max: number } {
  const rates = globalRelativeScenarioRates(choice, globalBlended, horizon)
  const pcts = rates.map((d) => decimalToPct(d))
  return { min: Math.min(...pcts), max: Math.max(...pcts) }
}
