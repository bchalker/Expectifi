import type { CalculatorInputs } from './computeResults'
import {
  applyScenarioUiChoice,
  inferScenarioUiChoice,
  type ScenarioUiChoice,
} from './holdingScenarioApply'
import { horizonClamp } from './holdingScenarioApply'
import type { MarketScenarioId } from './marketScenario'
import { resolveGlobalMarketScenarioRates } from './marketScenario'
import {
  annualizedReturnFromYearlyPath,
  padYearlyReturns,
  positionUsesCustomReturnMode,
  type PositionReturnMode,
  type PositionReturnModel,
  type PositionScenarioId,
} from './positionReturnModel'

/** Tax-bucket account scopes for return overrides (below holding, above global slider). */
export type AccountScenarioBucketId = 'brokerage' | 'pretax' | 'roth' | 'hsa'

export type AccountReturnScenario = {
  yearlyReturns: number[]
  returnMode: PositionReturnMode
  flatRate: number
  scenario?: PositionScenarioId | null
  returnOverride?: boolean
}

export type HoldingReturnRateSource = 'global' | 'account' | 'custom'

const ACCOUNT_BUCKET_PREFIXES: Record<AccountScenarioBucketId, readonly string[]> = {
  brokerage: ['fid-brk-'],
  pretax: ['fid-ret401k-', 'fid-se401k-'],
  roth: ['fid-roth-'],
  hsa: ['fid-hsa-'],
}

export function accountScenarioBucketForPositionId(positionId: string): AccountScenarioBucketId | null {
  if (positionId.startsWith('fid-brk-')) return 'brokerage'
  if (positionId.startsWith('fid-ret401k-') || positionId.startsWith('fid-se401k-')) return 'pretax'
  if (positionId.startsWith('fid-roth-')) return 'roth'
  if (positionId.startsWith('fid-hsa-')) return 'hsa'
  return null
}

export function mergedModelsForAccountBucket(
  bucket: AccountScenarioBucketId,
  merged: PositionReturnModel[],
): PositionReturnModel[] {
  const prefixes = ACCOUNT_BUCKET_PREFIXES[bucket]
  return merged.filter((m) => prefixes.some((p) => m.id.startsWith(p)))
}

export function blendedRateForAccountBucket(
  bucket: AccountScenarioBucketId,
  retRate: number,
  brkRate: number,
): number {
  return bucket === 'brokerage' ? brkRate : retRate
}

export function getAccountReturnScenario(
  inputs: CalculatorInputs,
  bucket: AccountScenarioBucketId,
): AccountReturnScenario | undefined {
  return inputs.accountReturnScenarios?.[bucket]
}

function accountScenarioAsModel(scenario: AccountReturnScenario): PositionReturnModel {
  return {
    id: '_account',
    ticker: '',
    label: '',
    currentValue: 0,
    accountId: '',
    yearlyReturns: scenario.yearlyReturns,
    returnMode: scenario.returnMode,
    flatRate: scenario.flatRate,
    scenario: scenario.scenario ?? null,
    returnOverride: scenario.returnOverride,
  }
}

export function inferAccountScenarioUiChoice(
  scenario: AccountReturnScenario | undefined,
  blended: number,
  horizon: number,
): ScenarioUiChoice {
  if (!scenario) return 'default'
  const inferred = inferScenarioUiChoice(accountScenarioAsModel(scenario), blended, horizon)
  if (scenario.returnOverride && inferred === 'default' && scenario.returnMode === 'flat') {
    return 'custom'
  }
  return inferred
}

export function accountScenarioIsActive(
  inputs: CalculatorInputs,
  bucket: AccountScenarioBucketId,
): boolean {
  return getAccountReturnScenario(inputs, bucket) != null
}

/** Which tier supplies this holding's growth rate (holding → bucket → global market scenario). */
export function holdingReturnRateSource(
  model: PositionReturnModel,
  accountScenario: AccountReturnScenario | undefined,
  blended: number,
): HoldingReturnRateSource {
  if (positionUsesCustomReturnMode(model, blended)) return 'custom'
  if (accountScenario) return 'account'
  return 'global'
}

export function buildAccountReturnScenario(
  choice: ScenarioUiChoice,
  blended: number,
  horizon: number,
  customPct: number,
  existing?: AccountReturnScenario,
  yearlyOverride?: number[],
): AccountReturnScenario | null {
  if (choice === 'default') return null
  const seed: PositionReturnModel = {
    id: '_account',
    ticker: '',
    label: '',
    currentValue: 0,
    accountId: '',
    yearlyReturns: existing?.yearlyReturns ?? [],
    returnMode: existing?.returnMode ?? 'flat',
    flatRate: existing?.flatRate ?? blended,
    scenario: existing?.scenario ?? null,
  }
  const applied = applyScenarioUiChoice(seed, choice, blended, horizon, customPct, yearlyOverride)
  return {
    yearlyReturns: applied.yearlyReturns,
    returnMode: applied.returnMode,
    flatRate: applied.flatRate,
    scenario: applied.scenario ?? null,
    returnOverride: true,
  }
}

export function patchAccountReturnScenario(
  inputs: CalculatorInputs,
  bucket: AccountScenarioBucketId,
  next: AccountReturnScenario | null,
): CalculatorInputs['accountReturnScenarios'] {
  const prev = { ...(inputs.accountReturnScenarios ?? {}) }
  if (next == null) {
    delete prev[bucket]
  } else {
    prev[bucket] = next
  }
  return Object.keys(prev).length ? prev : {}
}

/**
 * Effective annual return (decimal) for display — does not mutate stored holding models.
 * Projection wiring should use the same precedence: holding custom → account → global.
 */
export function effectiveHoldingFlatRate(
  model: PositionReturnModel,
  accountScenario: AccountReturnScenario | undefined,
  blended: number,
): number {
  const source = holdingReturnRateSource(model, accountScenario, blended)
  if (source === 'custom') {
    return model.returnMode === 'flat' ? model.flatRate : model.yearlyReturns[0] ?? blended
  }
  if (source === 'account' && accountScenario) return accountScenario.flatRate
  return blended
}

/**
 * Ephemeral model for FV projection — does not mutate stored holding or account state.
 *
 * Override precedence: holding custom → bucket/account → global market scenario → global slider.
 */
export function projectionModelForHolding(
  model: PositionReturnModel,
  accountScenario: AccountReturnScenario | undefined,
  blended: number,
  horizon: number,
  marketScenario?: MarketScenarioId,
): PositionReturnModel {
  const h = horizonClamp(horizon)
  const source = holdingReturnRateSource(model, accountScenario, blended)
  if (source === 'custom') return model
  if (source === 'account' && accountScenario) {
    const flat = effectiveHoldingFlatRate(model, accountScenario, blended)
    return {
      ...model,
      yearlyReturns: padYearlyReturns(accountScenario.yearlyReturns, h, flat),
      returnMode: accountScenario.returnMode,
      flatRate: flat,
      scenario: accountScenario.scenario ?? null,
    }
  }
  const rates = resolveGlobalMarketScenarioRates(marketScenario, blended, h)
  const flat = annualizedReturnFromYearlyPath(rates)
  const usePerYear =
    marketScenario != null &&
    marketScenario !== 'base' &&
    rates.some((r, i) => i > 0 && Math.abs(r - (rates[0] ?? r)) > 1e-6)
  return {
    ...model,
    returnMode: usePerYear ? 'peryear' : 'flat',
    flatRate: flat,
    scenario: null,
    yearlyReturns: rates,
  }
}
