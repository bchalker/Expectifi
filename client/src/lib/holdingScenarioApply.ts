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

export type ScenarioUiChoice = 'default' | 'bull' | 'base' | 'bear' | 'custom' | 'peryear'

export const SCENARIO_MIXED = '_mixed' as const

export function horizonClamp(y: number): number {
  return Math.max(1, Math.min(50, Math.round(y)))
}

export function inferScenarioUiChoice(m: PositionReturnModel, blended: number, horizon: number): ScenarioUiChoice {
  const h = horizonClamp(horizon)
  const rates = padYearlyReturns(m.yearlyReturns, h, m.flatRate)
  if (m.returnMode === 'peryear') return 'peryear'
  if (m.returnMode === 'scenario' && m.scenario) {
    if (ratesMatchScenario(m.scenario, rates, h)) {
      if (m.scenario === 'bull') return 'bull'
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
      }
    case 'bull':
      return applyScenarioToModel(m, 'bull', h)
    case 'base':
      return applyScenarioToModel(m, 'base', h)
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

export function scenarioColumnShortLabel(
  choice: ScenarioUiChoice | typeof SCENARIO_MIXED,
  customPctDecimal?: number,
): string {
  if (choice === SCENARIO_MIXED) return 'Various'
  switch (choice) {
    case 'default':
      return 'Default'
    case 'bull':
      return 'Bull'
    case 'bear':
      return 'Bear'
    case 'base':
      return 'Normal'
    case 'custom':
      return customPctDecimal != null && Number.isFinite(customPctDecimal)
        ? `Custom ${decimalToPct(customPctDecimal).toFixed(1)}%`
        : 'Custom %'
    case 'peryear':
      return 'Per year'
  }
}
