import type { CalculatorInputs } from './computeResults'
import { fmtK } from '../utils/format'
import {
  globalRelativeScenarioRates,
  ratesMatchAnchoredScenario,
} from './scenarioRates'
import {
  annualizedReturnFromYearlyPath,
  decimalToPct,
  defaultPositionReturns,
  padYearlyReturns,
  POSITION_FLAT_VS_BLENDED_EPS,
  pctToDecimal,
  projectPositionAtRetirement,
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

export type OutlookScenarioTile = {
  choice: OutlookScenarioChoice
  label: string
  hint: string
  description: string
  modifierLabel: string
}

/** Flat modifier vs global slider rate — used for tile effective-rate display. */
export const OUTLOOK_SCENARIO_MODIFIER_PCT: Record<OutlookScenarioChoice, number> = {
  very_bear: -4,
  bear: -2,
  base: 0,
  bull: 2,
  very_bull: 4,
}

export const OUTLOOK_SCENARIO_TILES: readonly OutlookScenarioTile[] = [
  {
    choice: 'very_bear',
    label: 'Very Bearish',
    hint: 'Strong negative',
    description: 'Sustained downturn with slow recovery',
    modifierLabel: '−4%',
  },
  {
    choice: 'bear',
    label: 'Bearish',
    hint: 'Leans negative',
    description: 'Prolonged weakness, gradual drag',
    modifierLabel: '−2%',
  },
  {
    choice: 'base',
    label: 'Normal',
    hint: 'Neutral',
    description: 'Neutral — no adjustment applied',
    modifierLabel: '0%',
  },
  {
    choice: 'bull',
    label: 'Bullish',
    hint: 'Leans positive',
    description: 'Steady above-average growth',
    modifierLabel: '+2%',
  },
  {
    choice: 'very_bull',
    label: 'Very Bullish',
    hint: 'Strong positive',
    description: 'Strong sustained growth throughout',
    modifierLabel: '+4%',
  },
]

export function formatOutlookRatePct(rateDecimal: number): string {
  return `${decimalToPct(rateDecimal).toFixed(1)}%`
}

export function formatSignedRatePct(pct: number): string {
  const rounded = Math.round(pct * 10) / 10
  const sign = rounded < 0 ? '−' : ''
  return `${sign}${Math.abs(rounded).toFixed(1)}%`
}

export type OutlookScenarioApplyOptions = {
  /** Holding outlook: anchor preset shape to global slider. Account scenarios omit this. */
  anchorOutlookToGlobal?: boolean
}

/**
 * Yearly return span for outlook tiles.
 * Pass `globalBlended` for slider-anchored holding ranges; omit for absolute account ranges.
 */
export function formatOutlookScenarioRateRange(
  choice: OutlookScenarioChoice,
  horizon: number,
  globalBlended?: number,
): string {
  const h = horizonClamp(horizon)
  const rateDecimals =
    globalBlended != null
      ? globalRelativeScenarioRates(choice, globalBlended, h)
      : scenarioRatesDecimal(choice, h)
  const pcts = rateDecimals.map((d) => decimalToPct(d))
  const min = Math.min(...pcts)
  const max = Math.max(...pcts)
  if (Math.abs(max - min) < 0.05) return formatSignedRatePct(min)
  return `${formatSignedRatePct(min)} … ${formatSignedRatePct(max)}`
}

/** Global slider rate after flat outlook modifier (display-only shorthand; not used in compute). */
export function outlookRateAfterModifier(globalBlended: number, choice: OutlookScenarioChoice): number {
  return globalBlended + pctToDecimal(OUTLOOK_SCENARIO_MODIFIER_PCT[choice])
}

/** Retirement FV delta vs holding flat at global rate, using scenario preset paths. */
export function outlookRetirementDelta(
  currentValue: number,
  globalBlended: number,
  choice: OutlookScenarioChoice,
  horizon: number,
): number {
  if (!(currentValue > 0)) return 0
  const h = horizonClamp(horizon)
  const stub = defaultPositionReturns(
    '__outlook_preview__',
    { ticker: '', label: '', currentValue, accountId: '' },
    globalBlended,
    h,
    0,
  )
  const globalModel = applyScenarioUiChoice(stub, 'default', globalBlended, h, 0)
  const scenarioModel = applyScenarioUiChoice(stub, choice, globalBlended, h, 0, undefined, {
    anchorOutlookToGlobal: true,
  })
  const baseline = projectPositionAtRetirement(globalModel, 0, h)
  const projected = projectPositionAtRetirement(scenarioModel, 0, h)
  return projected - baseline
}

export function formatOutlookProjectionDelta(delta: number): string {
  if (!Number.isFinite(delta) || Math.abs(delta) < 500) return '~±0'
  const sign = delta > 0 ? '+' : '−'
  return `~${sign}${fmtK(Math.abs(delta))}`
}

export function outlookProjectionDeltaTone(
  choice: OutlookScenarioChoice,
  delta: number,
): 'positive' | 'negative' | 'neutral' {
  if (choice === 'base') return 'neutral'
  if (delta > 500) return 'positive'
  if (delta < -500) return 'negative'
  return 'neutral'
}

export function outlookCalloutAmountLabel(delta: number): string {
  if (!Number.isFinite(delta) || Math.abs(delta) < 500) return '~±0'
  return `~${fmtK(Math.abs(delta))}`
}

export function outlookCalloutDirectionWord(
  choice: OutlookScenarioChoice,
  delta: number,
): 'more' | 'less' | 'same' {
  if (choice === 'base' || Math.abs(delta) < 500) return 'same'
  return delta > 0 ? 'more' : 'less'
}

export function getOutlookScenarioTileLabel(choice: OutlookScenarioChoice): string {
  return OUTLOOK_SCENARIO_TILES.find((t) => t.choice === choice)?.label ?? choice
}

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
    if (m.returnOverride === true && m.id !== '_account') {
      if (m.scenario === 'very_bull') return 'very_bull'
      if (m.scenario === 'bull') return 'bull'
      if (m.scenario === 'very_bear') return 'very_bear'
      if (m.scenario === 'bear') return 'bear'
      return 'base'
    }
    if (ratesMatchScenario(m.scenario, rates, h)) {
      if (m.scenario === 'very_bull') return 'very_bull'
      if (m.scenario === 'bull') return 'bull'
      if (m.scenario === 'very_bear') return 'very_bear'
      if (m.scenario === 'bear') return 'bear'
      return 'base'
    }
    if (ratesMatchAnchoredScenario(m.scenario, rates, h, blended)) {
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

function applyScenarioToModel(
  m: PositionReturnModel,
  scenario: PositionScenarioId,
  h: number,
  globalBlended: number,
  anchorToGlobal: boolean,
): PositionReturnModel {
  const yr = anchorToGlobal
    ? globalRelativeScenarioRates(scenario, globalBlended, h)
    : scenarioRatesDecimal(scenario, h)
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
  options?: OutlookScenarioApplyOptions,
): PositionReturnModel {
  const h = horizonClamp(horizon)
  const anchorOutlook = options?.anchorOutlookToGlobal === true
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
      return applyScenarioToModel(m, 'very_bull', h, blended, anchorOutlook)
    case 'bull':
      return applyScenarioToModel(m, 'bull', h, blended, anchorOutlook)
    case 'base':
      return applyScenarioToModel(m, 'base', h, blended, anchorOutlook)
    case 'very_bear':
      return applyScenarioToModel(m, 'very_bear', h, blended, anchorOutlook)
    case 'bear':
      return applyScenarioToModel(m, 'bear', h, blended, anchorOutlook)
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
      const base = yearlyOverride ?? padYearlyReturns(m.yearlyReturns, h, blended)
      const padded = padYearlyReturns(base, h, blended)
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

/** Badge sublabel on account summary rows when a scenario is set. */
export const ACCOUNT_SCENARIO_SUBLABEL = 'This account'

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
