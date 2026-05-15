import {
  mapRowToBucket,
  normalizeFidelityImportSymbol,
  positionsForBrokerage,
  positionsForRetirementBucket,
  type FidelityPositionRow,
} from './fidelityCsv'

/** Default discrete annual steps in the UI (expanded to actual horizon). */
export const POSITION_RETURN_HORIZON = 7 as const

export type PositionReturnMode = 'flat' | 'peryear' | 'scenario'

export type PositionScenarioId = 'bear' | 'base' | 'bull'

/** Treat flat rate as matching blended when within this (decimal return). */
export const POSITION_FLAT_VS_BLENDED_EPS = 5e-5

/** True when the user chose a non-default return path (per-year, scenario, or flat ≠ blended). */
export function positionUsesCustomReturnMode(pos: PositionReturnModel, blendedRate: number): boolean {
  if (pos.returnMode === 'peryear' || pos.returnMode === 'scenario') return true
  return Math.abs(pos.flatRate - blendedRate) > POSITION_FLAT_VS_BLENDED_EPS
}

/**
 * Use `projectPositionAtRetirement` instead of lumping into `fv(..., blendedRate, years)` when the user
 * chose a non-blended return path (per-year, scenario, or flat ≠ blended).
 */
export function positionNeedsIndividualRetirementProjection(
  pos: PositionReturnModel,
  blendedRate: number,
): boolean {
  return positionUsesCustomReturnMode(pos, blendedRate)
}

/** Per-position return modeling (dashboard sliders). Values / import stay in config. */
export type PositionReturnModel = {
  id: string
  ticker: string
  label: string
  currentValue: number
  accountId: string
  /** One rate per modeled year, decimal (e.g. 0.07 = 7%). */
  yearlyReturns: number[]
  returnMode: PositionReturnMode
  flatRate: number
  scenario?: PositionScenarioId | null
}

/** Scenario presets as **percent** points (−5 = −5%). Base length 7; expanded for longer horizons. */
export const SCENARIO_PRESETS: Record<PositionScenarioId, readonly number[]> = {
  bear: [-5, -3, 2, 4, 5, 5, 5],
  base: [6, 7, 7, 8, 7, 7, 6],
  bull: [15, 20, 18, 12, 10, 8, 7],
}

export function modelingCalendarYears(retirementCalendarYear: number, horizon: number): number[] {
  const h = Math.max(1, Math.round(horizon))
  const start = retirementCalendarYear - (h - 1)
  return Array.from({ length: h }, (_, i) => start + i)
}

/** Calendar year you reach `targetRetirementAge` from `currentAge` (same-year approximation). */
export function calendarRetirementYear(
  currentAge: number,
  targetRetirementAge: number,
  currentCalendarYear: number = new Date().getFullYear(),
): number {
  return currentCalendarYear + Math.max(0, Math.round(targetRetirementAge - currentAge))
}

export function calcPositionFV(currentValue: number, yearlyReturns: number[]): number {
  return yearlyReturns.reduce((value, rate) => value * (1 + rate), currentValue)
}

/**
 * Single constant per-year return `r` with the same compounded outcome as `rates`
 * over `rates.length` steps: `(Π(1 + rᵢ))^(1/n) − 1`.
 * Use when collapsing Per-year / Scenario into Flat so projected value stays aligned with the strip.
 */
export function annualizedReturnFromYearlyPath(rates: number[]): number {
  const n = rates.length
  if (n === 0) return 0
  let prod = 1
  for (const r of rates) {
    prod *= 1 + r
  }
  if (!Number.isFinite(prod) || prod <= 0) {
    const sum = rates.reduce((a, b) => a + b, 0)
    return sum / n
  }
  const g = Math.pow(prod, 1 / n) - 1
  return Number.isFinite(g) ? g : rates.reduce((a, b) => a + b, 0) / n
}

export function padYearlyReturns(rates: number[], horizon: number, fill: number): number[] {
  const a = rates.slice(0, horizon)
  while (a.length < horizon) a.push(fill)
  return a
}

export function scenarioRatesDecimal(scenario: PositionScenarioId, horizon: number): number[] {
  const preset = SCENARIO_PRESETS[scenario]
  const dec = preset.map((p) => p / 100)
  if (horizon <= dec.length) return dec.slice(0, horizon)
  const last = dec[dec.length - 1] ?? 0.06
  return dec.concat(Array.from({ length: horizon - dec.length }, () => last))
}

export function ratesMatchScenario(scenario: PositionScenarioId, rates: number[], horizon: number): boolean {
  const target = scenarioRatesDecimal(scenario, horizon)
  for (let i = 0; i < horizon; i++) {
    if (Math.abs((rates[i] ?? 0) - (target[i] ?? 0)) > 1e-4) return false
  }
  return true
}

export function projectPositionAtRetirement(
  pos: PositionReturnModel,
  _retirementCalendarYear: number,
  horizon: number,
): number {
  const rates = padYearlyReturns(pos.yearlyReturns, horizon, pos.flatRate)
  let v = pos.currentValue
  for (let i = 0; i < rates.length; i++) {
    v *= 1 + rates[i]
  }
  return v
}

export function blendedBaselineFV(currentValue: number, blendedRate: number, horizon: number): number {
  return calcPositionFV(currentValue, Array.from({ length: horizon }, () => blendedRate))
}

export function pctToDecimal(pct: number): number {
  return pct / 100
}

export function decimalToPct(dec: number): number {
  return Math.round(dec * 1000) / 10
}

export function defaultPositionReturns(
  id: string,
  partial: Pick<PositionReturnModel, 'ticker' | 'label' | 'currentValue' | 'accountId'>,
  blendedRate: number,
  horizon: number,
  _retirementCalendarYear: number,
): PositionReturnModel {
  const yearlyReturns = Array.from({ length: horizon }, () => blendedRate)
  return {
    id,
    ticker: partial.ticker,
    label: partial.label,
    currentValue: partial.currentValue,
    accountId: partial.accountId,
    yearlyReturns,
    returnMode: 'flat',
    flatRate: blendedRate,
    scenario: null,
  }
}

function positionIdForRow(keyPrefix: string, accountName: string, symbol: string, index: number): string {
  const sym = normalizeFidelityImportSymbol(symbol).replace(/\s+/g, '-')
  const acct = accountName.replace(/\s+/g, '-')
  return `fid-${keyPrefix}-${acct}-${sym}-${index}`
}

export function makeFidelityPositionReturnId(keyPrefix: string, accountName: string, symbol: string, index: number): string {
  return positionIdForRow(keyPrefix, accountName, symbol, index)
}

/** Stable `positionReturnModels` id for a retirement import row (uses index within that bucket's rows). */
export function fidelityRowToRetirementPositionReturnId(row: FidelityPositionRow, allRows: FidelityPositionRow[]): string | null {
  const bucket = mapRowToBucket(row)
  if (bucket === 'brokerage' || bucket === 'unknown') return null
  const keyPrefix =
    bucket === 'trad401k' ? 'ret401k' : bucket === 'se401k' ? 'se401k' : bucket === 'roth' ? 'roth' : 'hsa'
  const bucketRows = positionsForRetirementBucket(allRows, bucket)
  const idx = bucketRows.indexOf(row)
  if (idx < 0) return null
  return makeFidelityPositionReturnId(keyPrefix, row.accountName, row.symbol, idx)
}

/** Stable `positionReturnModels` id for a brokerage import row (index within brokerage rows). */
export function fidelityRowToBrokeragePositionReturnId(row: FidelityPositionRow, allRows: FidelityPositionRow[]): string | null {
  const bucket = mapRowToBucket(row)
  if (bucket !== 'brokerage') return null
  const bucketRows = positionsForBrokerage(allRows)
  const idx = bucketRows.indexOf(row)
  if (idx < 0) return null
  return makeFidelityPositionReturnId('brk', row.accountName, row.symbol, idx)
}

export function fidelityRowToDashboardPositionReturnId(row: FidelityPositionRow, allRows: FidelityPositionRow[]): string | null {
  return fidelityRowToRetirementPositionReturnId(row, allRows) ?? fidelityRowToBrokeragePositionReturnId(row, allRows)
}

/**
 * Merge CSV rows into `positionReturnModels`: keep existing ids, update `currentValue`,
 * append new rows with defaults. Drops models whose id no longer appears in rows.
 */
export function mergePositionModelsForHoldings(
  existing: PositionReturnModel[],
  rows: FidelityPositionRow[],
  keyPrefix: string,
  blendedRate: number,
  horizon: number,
  retirementCalendarYear: number,
): PositionReturnModel[] {
  const byId = new Map(existing.map((p) => [p.id, p]))
  const next: PositionReturnModel[] = []
  rows.forEach((r, index) => {
    const id = positionIdForRow(keyPrefix, r.accountName, r.symbol, index)
    const prev = byId.get(id)
    if (prev) {
      next.push({
        ...prev,
        currentValue: r.currentValue,
        ticker: normalizeFidelityImportSymbol(r.symbol) || prev.ticker,
        label: prev.label || r.description,
        accountId: r.accountName,
        yearlyReturns: padYearlyReturns(prev.yearlyReturns, horizon, prev.flatRate),
      })
    } else {
      next.push(
        defaultPositionReturns(
          id,
          {
            ticker: normalizeFidelityImportSymbol(r.symbol) || '—',
            label: r.description || r.symbol,
            currentValue: r.currentValue,
            accountId: r.accountName,
          },
          blendedRate,
          horizon,
          retirementCalendarYear,
        ),
      )
    }
  })
  return next
}

/** Replace models for `fid-${keyPrefix}-*` with merged bucket rows; keep other buckets. */
export function mergeBucketIntoAllModels(
  all: PositionReturnModel[],
  bucketRows: FidelityPositionRow[],
  keyPrefix: string,
  blendedRate: number,
  horizon: number,
  retirementCalendarYear: number,
): PositionReturnModel[] {
  const prefix = `fid-${keyPrefix}-`
  const existingForBucket = all.filter((p) => p.id.startsWith(prefix))
  const mergedBucket = mergePositionModelsForHoldings(
    existingForBucket,
    bucketRows,
    keyPrefix,
    blendedRate,
    horizon,
    retirementCalendarYear,
  )
  const others = all.filter((p) => !p.id.startsWith(prefix))
  return [...others, ...mergedBucket]
}

export function normalizePositionReturnModels(
  raw: unknown,
  horizon: number,
  blendedFill: number,
  _retirementCalendarYear: number,
): PositionReturnModel[] {
  if (!Array.isArray(raw)) return []
  const h = Math.max(1, Math.round(horizon))
  const out: PositionReturnModel[] = []
  for (const x of raw) {
    if (!x || typeof x !== 'object') continue
    const o = x as Record<string, unknown>
    const id = typeof o.id === 'string' && o.id ? o.id : `pos-${out.length}`
    const ticker = typeof o.ticker === 'string' ? o.ticker : '—'
    const label = typeof o.label === 'string' ? o.label : ticker
    const currentValue = typeof o.currentValue === 'number' && Number.isFinite(o.currentValue) ? o.currentValue : 0
    const accountId = typeof o.accountId === 'string' ? o.accountId : ''
    const flatRate =
      typeof o.flatRate === 'number' && Number.isFinite(o.flatRate) ? o.flatRate : blendedFill
    const returnMode =
      o.returnMode === 'flat' || o.returnMode === 'peryear' || o.returnMode === 'scenario' ? o.returnMode : 'flat'
    const scenario =
      o.scenario === 'bear' || o.scenario === 'base' || o.scenario === 'bull' ? o.scenario : o.scenario === null ? null : null
    let yearlyReturns: number[] = []
    if (Array.isArray(o.yearlyReturns)) {
      yearlyReturns = o.yearlyReturns.map((v) => (typeof v === 'number' && Number.isFinite(v) ? v : blendedFill))
    }
    yearlyReturns = padYearlyReturns(yearlyReturns, h, flatRate)
    out.push({
      id,
      ticker,
      label,
      currentValue,
      accountId,
      yearlyReturns,
      returnMode,
      flatRate,
      scenario,
    })
  }
  return out
}
