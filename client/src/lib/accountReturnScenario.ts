import type { CalculatorInputs } from './computeResults'
import {
  applyScenarioUiChoice,
  formatOutlookScenarioRateRange,
  horizonClamp,
  inferScenarioUiChoice,
  isOutlookScenarioChoice,
  scenarioColumnShortLabel,
  type ScenarioUiChoice,
} from './holdingScenarioApply'
import type { MarketScenarioId } from './marketScenario'
import { getMarketScenarioDefinition, resolveGlobalMarketScenarioRates } from './marketScenario'
import {
  annualizedReturnFromYearlyPath,
  decimalToPct,
  defaultPositionReturns,
  padYearlyReturns,
  positionUsesCustomReturnMode,
  projectPositionAtRetirement,
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

/** Current balance for a tax bucket from manual bases / inputs (not CSV line items). */
export function currentBalanceForScenarioBucket(
  bucket: AccountScenarioBucketId,
  inputs: CalculatorInputs,
): number {
  switch (bucket) {
    case 'brokerage':
      return Math.max(0, inputs.brkBal ?? 0)
    case 'pretax':
      return Math.max(
        0,
        (inputs.base401k ?? 0) + (inputs.baseSE401k ?? 0) + (inputs.baseTradIRA ?? 0),
      )
    case 'roth':
      return Math.max(0, inputs.baseRoth ?? 0)
    case 'hsa':
      return Math.max(0, inputs.baseHsa ?? 0)
  }
}

/**
 * Project a lump account balance at retirement using bucket scenario → global market → slider.
 * Used when growth is driven by account totals (manual entry), not per-import holdings.
 */
export function projectAccountBucketBalanceAtRetirement(
  balance: number,
  accountScenario: AccountReturnScenario | undefined,
  blended: number,
  yearsToRetirement: number,
  retirementCalendarYear: number,
  marketScenario?: MarketScenarioId,
): number {
  if (!(balance > 0)) return 0
  const h = horizonClamp(yearsToRetirement)
  const stub = defaultPositionReturns(
    'manual-account-bucket',
    { ticker: '', label: '', currentValue: balance, accountId: '' },
    blended,
    h,
    retirementCalendarYear,
  )
  const projection = projectionModelForHolding(
    stub,
    accountScenario,
    blended,
    h,
    marketScenario,
  )
  return projectPositionAtRetirement(projection, retirementCalendarYear, h)
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

function effectiveRateRangeLabel(
  choice: ScenarioUiChoice,
  model: PositionReturnModel,
  blended: number,
  horizon: number,
): string {
  const h = horizonClamp(horizon)
  if (isOutlookScenarioChoice(choice)) {
    return formatOutlookScenarioRateRange(choice, h)
  }
  if (choice === 'custom') {
    return `${decimalToPct(model.flatRate).toFixed(1)}%`
  }
  if (choice === 'peryear') {
    const rates = padYearlyReturns(model.yearlyReturns, h, model.flatRate).map((d) => decimalToPct(d))
    const min = Math.min(...rates)
    const max = Math.max(...rates)
    if (Math.abs(max - min) < 0.05) return `${min.toFixed(1)}%`
    return `${min.toFixed(1)}% … ${max.toFixed(1)}%`
  }
  return `${decimalToPct(blended).toFixed(1)}%`
}

/** True when a holding-level scenario is active and differs from the account scenario. */
export function holdingScenarioOverridesAccount(
  model: PositionReturnModel,
  accountScenario: AccountReturnScenario | undefined,
  blended: number,
  horizon: number,
): boolean {
  if (!accountScenario) return false
  if (holdingReturnRateSource(model, accountScenario, blended) !== 'custom') return false
  const holdingChoice = inferScenarioUiChoice(model, blended, horizon)
  const accountChoice = inferAccountScenarioUiChoice(accountScenario, blended, horizon)
  if (holdingChoice === 'default' || accountChoice === 'default') return false
  return holdingChoice !== accountChoice
}

/** Dev/audit log line for growth-mode scenario precedence (holding → account → global). */
export function formatScenarioCascadeLogLine(
  model: PositionReturnModel,
  accountScenario: AccountReturnScenario | undefined,
  blended: number,
  horizon: number,
  marketScenario?: MarketScenarioId,
): string {
  const ticker = model.ticker || '—'
  const h = horizonClamp(horizon)
  const source = holdingReturnRateSource(model, accountScenario, blended)

  if (source === 'custom') {
    const holdingChoice = inferScenarioUiChoice(model, blended, h)
    const range = effectiveRateRangeLabel(holdingChoice, model, blended, h)
    let suffix = ''
    if (accountScenario) {
      const accountChoice = inferAccountScenarioUiChoice(accountScenario, blended, h)
      if (accountChoice !== 'default' && holdingChoice !== accountChoice) {
        suffix = ` | account: ${scenarioColumnShortLabel(accountChoice)} ignored for this holding`
      }
    }
    return `[Scenario Cascade] ${ticker}: holding-override → ${scenarioColumnShortLabel(holdingChoice)} (${range})${suffix}`
  }

  if (source === 'account' && accountScenario) {
    const accountChoice = inferAccountScenarioUiChoice(accountScenario, blended, h)
    const range = effectiveRateRangeLabel(accountChoice, accountScenarioAsModel(accountScenario), blended, h)
    return `[Scenario Cascade] ${ticker}: account-level → ${scenarioColumnShortLabel(accountChoice)} (${range}) | no holding override`
  }

  const projection = projectionModelForHolding(model, accountScenario, blended, h, marketScenario)
  const globalChoice = inferScenarioUiChoice(projection, blended, h)
  const range = effectiveRateRangeLabel(globalChoice, projection, blended, h)
  const marketLabel =
    marketScenario != null && marketScenario !== 'base'
      ? getMarketScenarioDefinition(marketScenario).label
      : 'global rate'
  return `[Scenario Cascade] ${ticker}: global → ${scenarioColumnShortLabel(globalChoice)} (${range}) via ${marketLabel} | no holding override`
}

/** Temporary audit helper — logs cascade resolution for each holding. */
export function logScenarioCascadeAudit(
  models: PositionReturnModel[],
  inputs: CalculatorInputs,
  retRate: number,
  brkRate: number,
  horizon: number,
  marketScenario?: MarketScenarioId,
): void {
  for (const model of models) {
    const bucket = accountScenarioBucketForPositionId(model.id)
    const accountScenario = bucket ? getAccountReturnScenario(inputs, bucket) : undefined
    const blended = bucket ? blendedRateForAccountBucket(bucket, retRate, brkRate) : retRate
    console.log(formatScenarioCascadeLogLine(model, accountScenario, blended, horizon, marketScenario))
  }
}
