import type { CalculatorInputs } from './computeResults'
import {
  annualizedReturnFromYearlyPath,
  decimalToPct,
  padYearlyReturns,
  POSITION_FLAT_VS_BLENDED_EPS,
  pctToDecimal,
  ratesMatchScenario,
  scenarioRatesDecimal,
  type PositionReturnModel,
  type PositionScenarioId,
} from './positionReturnModel'

export type ScenarioUiChoice =
  | 'default'
  | 'very_bear'
  | 'bear'
  | 'base'
  | 'bull'
  | 'very_bull'
  | 'custom'
  | 'peryear'

export type OutlookScenarioChoice = 'very_bear' | 'bear' | 'base' | 'bull' | 'very_bull'

export const OUTLOOK_SCENARIO_TILES: readonly {
  choice: OutlookScenarioChoice
  label: string
  hint: string
}[] = [
  { choice: 'very_bear', label: 'Very Bearish', hint: 'Strong negative' },
  { choice: 'bear', label: 'Bearish', hint: 'Leans negative' },
  { choice: 'base', label: 'Normal', hint: 'Neutral' },
  { choice: 'bull', label: 'Bullish', hint: 'Leans positive' },
  { choice: 'very_bull', label: 'Very Bullish', hint: 'Strong positive' },
]

export function isOutlookScenarioChoice(choice: ScenarioUiChoice): choice is OutlookScenarioChoice {
  return (
    choice === 'very_bear' ||
    choice === 'bear' ||
    choice === 'base' ||
    choice === 'bull' ||
    choice === 'very_bull'
  )
}

export const SCENARIO_MIXED = '_mixed' as const

export function horizonClamp(y: number): number {
  return Math.max(1, Math.min(50, Math.round(y)))
}

export function inferScenarioUiChoice(m: PositionReturnModel, blended: number, horizon: number): ScenarioUiChoice {
  const h = horizonClamp(horizon)
  const rates = padYearlyReturns(m.yearlyReturns, h, m.flatRate)
  if (m.returnOverride === true && m.returnMode === 'flat') {
    const matchesBlended =
      Math.abs(m.flatRate - blended) <= POSITION_FLAT_VS_BLENDED_EPS &&
      rates.every((r) => Math.abs(r - blended) <= 1e-5)
    if (matchesBlended) return 'custom'
  }
  if (m.returnMode === 'peryear') return 'peryear'
  if (m.returnMode === 'scenario' && m.scenario) {
    if (ratesMatchScenario(m.scenario, rates, h)) {
      if (m.scenario === 'very_bull') return 'very_bull'
      if (m.scenario === 'bull') return 'bull'
      if (m.scenario === 'very_bear') return 'very_bear'
      if (m.scenario === 'bear') return 'bear'
      return 'base'
    }
    return 'peryear'
  }
  if (m.returnMode === 'flat') {
    const matchesBlended =
      Math.abs(m.flatRate - blended) <= POSITION_FLAT_VS_BLENDED_EPS &&
      rates.every((r) => Math.abs(r - blended) <= 1e-5)
    if (matchesBlended) return 'default'
    const uniform = rates.every((r) => Math.abs(r - (rates[0] ?? 0)) <= 1e-6)
    if (uniform) return 'custom'
  }
  return 'peryear'
}

export function inferCommonScenarioChoiceForModels(
  models: PositionReturnModel[],
  horizon: number,
  blendedForModel: (m: PositionReturnModel) => number,
): ScenarioUiChoice | typeof SCENARIO_MIXED {
  if (models.length === 0) return SCENARIO_MIXED
  const first = inferScenarioUiChoice(models[0], blendedForModel(models[0]), horizon)
  for (let i = 1; i < models.length; i++) {
    if (inferScenarioUiChoice(models[i], blendedForModel(models[i]), horizon) !== first) return SCENARIO_MIXED
  }
  return first
}

export function inferCommonScenarioChoice(
  models: PositionReturnModel[],
  horizon: number,
  blended: number,
): ScenarioUiChoice | typeof SCENARIO_MIXED {
  if (models.length === 0) return SCENARIO_MIXED
  const first = inferScenarioUiChoice(models[0], blended, horizon)
  for (let i = 1; i < models.length; i++) {
    if (inferScenarioUiChoice(models[i], blended, horizon) !== first) return SCENARIO_MIXED
  }
  return first
}

function applyScenarioToModel(m: PositionReturnModel, scenario: PositionScenarioId, h: number): PositionReturnModel {
  const yr = scenarioRatesDecimal(scenario, h)
  return {
    ...m,
    returnMode: 'scenario',
    scenario,
    yearlyReturns: yr,
    flatRate: annualizedReturnFromYearlyPath(yr),
    returnOverride: true,
  }
}

export function applyScenarioUiChoice(
  m: PositionReturnModel,
  choice: ScenarioUiChoice,
  blended: number,
  horizon: number,
  customPct: number,
  yearlyOverride?: number[],
): PositionReturnModel {
  const h = horizonClamp(horizon)
  switch (choice) {
    case 'default':
      return {
        ...m,
        returnMode: 'flat',
        flatRate: blended,
        scenario: null,
        yearlyReturns: Array.from({ length: h }, () => blended),
        returnOverride: false,
      }
    case 'very_bull':
      return applyScenarioToModel(m, 'very_bull', h)
    case 'bull':
      return applyScenarioToModel(m, 'bull', h)
    case 'base':
      return applyScenarioToModel(m, 'base', h)
    case 'very_bear':
      return applyScenarioToModel(m, 'very_bear', h)
    case 'bear':
      return applyScenarioToModel(m, 'bear', h)
    case 'custom': {
      const dec = pctToDecimal(customPct)
      return {
        ...m,
        returnMode: 'flat',
        flatRate: dec,
        scenario: null,
        yearlyReturns: Array.from({ length: h }, () => dec),
        returnOverride: true,
      }
    }
    case 'peryear': {
      const base = yearlyOverride ?? padYearlyReturns(m.yearlyReturns, h, m.flatRate)
      const padded = padYearlyReturns(base, h, m.flatRate)
      return {
        ...m,
        returnMode: 'peryear',
        scenario: null,
        yearlyReturns: padded,
        flatRate: annualizedReturnFromYearlyPath(padded),
        returnOverride: true,
      }
    }
  }
}

export function mergePatchPositionModelsIntoInputs(
  inputs: CalculatorInputs,
  patched: PositionReturnModel[],
): CalculatorInputs['positionReturnModels'] {
  const ids = new Set(patched.map((p) => p.id))
  const rest = (inputs.positionReturnModels ?? []).filter((p) => !ids.has(p.id))
  return [...rest, ...patched]
}

/** Outline trigger when a holding has no per-position scenario override. */
export const HOLDING_SCENARIO_PLACEHOLDER_LABEL = 'Holding Scenario'

/** Outline trigger when an account has no return scenario. */
export const ACCOUNT_SCENARIO_PLACEHOLDER_LABEL = 'Account Scenario'

/** Badge sublabel on account summary rows. */
export const ACCOUNT_SCENARIO_SUBLABEL = 'Account Scenario'

/** Badge sublabel on per-holding scenario controls. */
export const HOLDING_ROW_SCENARIO_SUBLABEL = 'This holding'

export function scenarioColumnShortLabel(
  choice: ScenarioUiChoice | typeof SCENARIO_MIXED,
  customPctDecimal?: number,
): string {
  if (choice === SCENARIO_MIXED) return 'Various'
  switch (choice) {
    case 'default':
      return 'Scenario'
    case 'very_bull':
      return 'Very Bullish'
    case 'bull':
      return 'Bullish'
    case 'very_bear':
      return 'Very Bearish'
    case 'bear':
      return 'Bearish'
    case 'base':
      return 'Normal'
    case 'custom':
      if (customPctDecimal != null && Number.isFinite(customPctDecimal)) {
        const pct = decimalToPct(customPctDecimal)
        const pctStr = Number.isInteger(pct) ? String(pct) : pct.toFixed(1)
        return `Custom ${pctStr}%`
      }
      return 'Custom %'
    case 'peryear':
      return 'Per Year'
  }
}
