import { SCENARIOS, SP_SS_67, DEFAULT_HSA_RATIO, DEFAULT_ROTH_RATIO, DEFAULT_TRAD_RATIO } from 'shared'
import {
  calcIncomePhase,
  calcPortfolioAtRetirement,
  calcTax,
  calcTaxDetailed,
  fv,
  fvAnnuity,
  rothConversionRoom,
  ssFromAge,
  ssProvisionalThresholds,
  type FilingStatusId,
} from 'shared'
import { clampedAgeFromDob } from './ageFromDob'
import { normalizeCalculatorFilingStatus } from './filingStatus'
import { calcTaxDetailedForAccountStrategies } from './accountIncomeTax'
import { monthlyPortfolioIncomeFromAccountStrategies } from './accountIncomeMonthly'
import { computePortfolioGuidanceMetrics, type PortfolioGuidanceMetrics } from './portfolioGuidance'
import type { AccountIncomeStrategy } from './accountIncomeStrategy'
import { retirementFvForAccountBucket } from './accountBucketRetirementBalance'
import { resolveOnboardingAccountLocale } from './onboardingAccountTypesByLocale'
import { buildSurvivorCallout, computeHouseholdSs, isSsConfigured } from './socialSecurity'
import { flattenBatches, loadStoredPositionsImport } from './positionsImportStorage'
import { positionsForBrokerage, positionsForRetirementBucket, type ImportedPositionRow } from './positionsCsv'
import type { BrokerageBalanceMode } from './brokerageBalanceMode'
import type { BalanceInputMode } from './retirementBalanceMode'
import {
  accountScenarioBucketForPositionId,
  getAccountReturnScenario,
  holdingReturnRateSource,
  projectAccountBucketBalanceAtRetirement,
  projectionModelForHolding,
} from './accountReturnScenario'
import {
  calendarRetirementYear,
  mergeBucketIntoAllModels,
  normalizePositionReturnModels,
  positionNeedsIndividualRetirementProjection,
  positionUsesCustomReturnMode,
  projectPositionAtRetirement,
  type PositionReturnModel,
} from './positionReturnModel'
import {
  computeAllRetireRegionComparisons,
  normalizeRetireRegions,
  type RetireRegionPick,
} from './calc/retireRegions'

export type { RetireRegionComparison, RetireRegionPick } from './calc/retireRegions'
export { MAX_RETIRE_REGIONS, listRetireRegions, getRetireRegion, isRetireRegionId } from './calc/retireRegions'

export type DrawerName =
  | 'scenarios'
  | 'sstiming'
  | 'taxfree'
  | 'strategy'
  | 'config'

import type { AccountReturnScenario, AccountScenarioBucketId } from './accountReturnScenario'
import type { IncomeYieldPreset } from './incomePresets'
import type { MarketScenarioId } from './marketScenario'
import {
  fvAnnuityWithYearlyRates,
  fvWithYearlyRates,
  effectiveMarketScenarioId,
  marketScenarioIsBase,
  resolveGlobalMarketScenarioRates,
} from './marketScenario'

export type { IncomeYieldPreset } from './incomePresets'
export { DEFAULT_INCOME_PRESETS, normalizeIncomePresets } from './incomePresets'

export type CalculatorInputs = {
  base401k: number
  baseSE401k: number
  /** Traditional IRA (manual entry); rolled into pre-tax totals with 401(k) buckets. */
  baseTradIRA: number
  baseRoth: number
  baseHsa: number
  brkBal: number
  retRate: number
  brkRate: number
  save: number
  wdRate: number
  /** Annual inflation uplift applied to withdrawal income (decimal, e.g. 0.025 = 2.5%). */
  wdInflation: number
  incYield: number
  incGrowth: number
  /** Selected claiming age (62, 67, or 70). */
  ssAge: number
  spouseClaimAge: number
  ssBenefit62: number
  ssBenefit67: number
  ssBenefit70: number
  married: boolean
  spouseDateOfBirth: string
  spouseHasOwnEarnings: boolean
  spouseBenefit62: number
  spouseBenefit67: number
  spouseBenefit70: number
  other: number
  /** Up to 5 destinations to compare (COL, inflation, simplified local tax). */
  retireRegions: RetireRegionPick[]
  /** @deprecated Migrated into `retireRegions` on load. */
  italyCost?: number
  ssInvestPct: number
  /** ISO `YYYY-MM-DD`; current age is derived from this date for projections. */
  dateOfBirth: string
  /** Planned age when you stop accumulating and model reaches portfolio FV. */
  targetRetirementAge: number
  /** Target portfolio at retirement for growth-phase goal bar (0 = hide). */
  growthGoal: number
  /** Target after-tax monthly income at retirement (0 = hide income goal gauge). */
  monthlyIncomeGoal: number
  /** User-defined dividend / NAV presets for the income phase. */
  incomePresets: IncomeYieldPreset[]
  /** Per-import-line return models (Fidelity dashboard sliders); merged with CSV at compute time. */
  positionReturnModels: PositionReturnModel[]
  /** Account-bucket return overrides (brokerage, pre-tax, Roth, HSA); below holding, above global market scenario. */
  accountReturnScenarios?: Partial<Record<AccountScenarioBucketId, AccountReturnScenario>>
  /** Macro market scenario applied to all buckets/holdings unless overridden. */
  marketScenario?: MarketScenarioId
  /** When false, projections use Base while `marketScenario` selection is kept. */
  marketScenarioActive?: boolean
  /** Welcome/settings residence — drives USD / GBP / EUR display. */
  residenceCountry: string
  /** US federal filing status for tax, SS provisional income, and Roth conversion room. */
  filingStatus: FilingStatusId
}

export type { FilingStatusId } from 'shared'

export type { PositionReturnModel } from './positionReturnModel'

export type CalculatorUi = {
  incomeMode: boolean
  ssIncluded: boolean
  /** Selected income security ticker; null = custom yield entry. */
  incomeSecurityTicker: string | null
  /** Per-account dividend fund in income phase (`bucket:*` or `manual:*` keys). */
  accountIncomeFunds: Record<string, string>
  /** Per-account income strategy in income phase. */
  accountIncomeStrategies: Record<string, AccountIncomeStrategy>
  /** Per-account withdrawal rate when strategy is withdraw or both. */
  accountWithdrawRates: Record<string, number>
  /** Incremented from the strip to open the income preset editor on the Income page. */
  incomePresetEditorFocusSeq?: number
}

/** When retirement/brokerage input is `manual`, growth uses account totals only — not stored CSV line items. */
export type ComputeBalanceModes = {
  retirement: BalanceInputMode
  brokerage: BrokerageBalanceMode
}

function accountDisplayBalances(bases: CalculatorInputs) {
  return {
    bal401k: bases.base401k,
    balSE401k: bases.baseSE401k,
    balTradIRA: bases.baseTradIRA,
    balRoth: bases.baseRoth,
    balHsa: bases.baseHsa,
  }
}

const RETIREMENT_FIDELITY_BUCKET_DEFS = [
  { bucket: 'trad401k' as const, keyPrefix: 'ret401k' },
  { bucket: 'se401k' as const, keyPrefix: 'se401k' },
  { bucket: 'roth' as const, keyPrefix: 'roth' },
  { bucket: 'hsa' as const, keyPrefix: 'hsa' },
] as const

/** Merge CSV retirement buckets into `positionReturnModels` (same as growth FV path). */
/** True when manual bases or imported positions exist — projections require a starting portfolio. */
export function hasPortfolioBalanceInputs(
  retBal: number,
  brkBal: number,
  importedPositionRows: ImportedPositionRow[],
): boolean {
  if (retBal > 0 || brkBal > 0) return true
  for (const bucket of ['trad401k', 'se401k', 'roth', 'hsa'] as const) {
    if (positionsForRetirementBucket(importedPositionRows, bucket).length > 0) return true
  }
  return positionsForBrokerage(importedPositionRows).length > 0
}

/** Balances that count toward projections — respects manual vs import mode (no phantom prototype totals). */
export function activePortfolioBalances(
  inputs: CalculatorInputs,
  balanceModes: ComputeBalanceModes | undefined,
  importedPositionRows: ImportedPositionRow[],
): { retBal: number; brkBal: number } {
  const bal = accountDisplayBalances(inputs)
  let retBal = bal.bal401k + bal.balSE401k + bal.balTradIRA + bal.balRoth + bal.balHsa
  let brkBal = inputs.brkBal
  const retirementMode = balanceModes?.retirement ?? 'imported'
  const brokerageMode = balanceModes?.brokerage ?? 'imported'
  const hasImportedRetirement = ['trad401k', 'se401k', 'roth', 'hsa'].some(
    (bucket) => positionsForRetirementBucket(importedPositionRows, bucket as 'trad401k' | 'se401k' | 'roth' | 'hsa').length > 0,
  )
  const hasImportedBrokerage = positionsForBrokerage(importedPositionRows).length > 0
  if (retirementMode === 'imported' && !hasImportedRetirement) retBal = 0
  if (brokerageMode === 'imported' && !hasImportedBrokerage) brkBal = 0
  return { retBal, brkBal }
}

export function mergeAllRetirementImportedBuckets(
  inputs: CalculatorInputs,
  importedPositionRows: ImportedPositionRow[],
  yearsToRetirement: number,
  retirementCalendarYear: number,
  retRate: number,
): { working: PositionReturnModel[]; mergedInHoldings: PositionReturnModel[] } {
  let working = normalizePositionReturnModels(
    inputs.positionReturnModels ?? [],
    yearsToRetirement,
    retRate,
    retirementCalendarYear,
  )
  const mergedInHoldings: PositionReturnModel[] = []
  for (const def of RETIREMENT_FIDELITY_BUCKET_DEFS) {
    const pos = positionsForRetirementBucket(importedPositionRows, def.bucket)
    working = mergeBucketIntoAllModels(working, pos, def.keyPrefix, retRate, yearsToRetirement, retirementCalendarYear)
    if (pos.length === 0) continue
    const prefix = `fid-${def.keyPrefix}-`
    for (const m of working) {
      if (m.id.startsWith(prefix)) mergedInHoldings.push(m)
    }
  }
  return { working, mergedInHoldings }
}

export function computeResults(
  inputs: CalculatorInputs,
  ui: CalculatorUi,
  balanceModes?: ComputeBalanceModes,
) {
  const retirementInputMode = balanceModes?.retirement ?? 'imported'
  const brokerageInputMode = balanceModes?.brokerage ?? 'imported'
  const {
    retRate,
    brkRate,
    save,
    wdRate,
    wdInflation,
    incYield,
    incGrowth,
    ssAge,
    other,
    retireRegions: retireRegionsRaw,
    italyCost: legacyItalyCost,
    dateOfBirth,
    targetRetirementAge,
    growthGoal,
    monthlyIncomeGoal,
    filingStatus: filingStatusRaw,
  } = inputs

  const filingStatus = normalizeCalculatorFilingStatus(filingStatusRaw)
  const retireRegions = normalizeRetireRegions(retireRegionsRaw, legacyItalyCost)

  const currentAge = clampedAgeFromDob(dateOfBirth)
  const yearsToRetirement = Math.max(1, Math.min(50, Math.round(targetRetirementAge - currentAge)))
  const retirementCalendarYear = calendarRetirementYear(currentAge, targetRetirementAge)

  const bal = accountDisplayBalances(inputs)

  let importedPositionRows: ImportedPositionRow[] = []
  const fidelityImp = loadStoredPositionsImport()
  if (fidelityImp?.batches?.length) importedPositionRows = flattenBatches(fidelityImp.batches)

  const { retBal, brkBal } = activePortfolioBalances(inputs, balanceModes, importedPositionRows)
  const tradBal = retBal > 0 ? bal.bal401k + bal.balSE401k + bal.balTradIRA : 0
  const rothBal = retBal > 0 ? bal.balRoth : 0
  const hsaBal = retBal > 0 ? bal.balHsa : 0

  const tradRatio = retBal > 0 ? tradBal / retBal : DEFAULT_TRAD_RATIO
  const rothRatio = retBal > 0 ? rothBal / retBal : DEFAULT_ROTH_RATIO
  const hsaRatio = retBal > 0 ? hsaBal / retBal : DEFAULT_HSA_RATIO

  const marketScenario = effectiveMarketScenarioId(inputs)
  const useMarketScenario = !marketScenarioIsBase(marketScenario)

  const retirementBuckets = ['trad401k', 'se401k', 'roth', 'hsa'] as const
  const hasImportedRetirementModeling = retirementBuckets.some((b) => positionsForRetirementBucket(importedPositionRows, b).length > 0)
  const brokerageRows = positionsForBrokerage(importedPositionRows)
  const hasImportedBrokerageModeling = brokerageRows.length > 0

  const legacyGrowth = calcPortfolioAtRetirement({
    retBal,
    save,
    retRate,
    brkBal,
    brkRate,
    years: yearsToRetirement,
  })
  let savingsFV = legacyGrowth.savingsFV
  if (useMarketScenario) {
    const retGlobalRates = resolveGlobalMarketScenarioRates(marketScenario, retRate, yearsToRetirement)
    savingsFV = fvAnnuityWithYearlyRates(save, retGlobalRates)
  }
  let brkFV = legacyGrowth.brkFV
  const growthRetFvLegacy = legacyGrowth.retFV
  let retFV = growthRetFvLegacy
  if (useMarketScenario) {
    retFV = growthRetFvLegacy - legacyGrowth.savingsFV + savingsFV
  }
  let growthRetFvCompareDelta = 0
  let customPositionReturnCount = 0
  let retirementGrowthSliderShowsFallback = false
  let mergedRetirementPositionModels: PositionReturnModel[] = []
  let mergedBrokeragePositionModels: PositionReturnModel[] = []

  const retirementUsesLumpBalances =
    !(retirementInputMode === 'imported' && hasImportedRetirementModeling)
  const brokerageUsesLumpBalance =
    !(brokerageInputMode === 'imported' && hasImportedBrokerageModeling)

  if (retirementInputMode === 'imported' && hasImportedRetirementModeling) {
    const { working, mergedInHoldings } = mergeAllRetirementImportedBuckets(
      inputs,
      importedPositionRows,
      yearsToRetirement,
      retirementCalendarYear,
      retRate,
    )
    mergedRetirementPositionModels = mergedInHoldings

    let individualFvSum = 0
    let individualCv = 0
    for (const def of RETIREMENT_FIDELITY_BUCKET_DEFS) {
      const pos = positionsForRetirementBucket(importedPositionRows, def.bucket)
      if (pos.length === 0) continue
      const prefix = `fid-${def.keyPrefix}-`
      const mergedBucket = working.filter((p) => p.id.startsWith(prefix))
      for (const m of mergedBucket) {
        const accountBucket = accountScenarioBucketForPositionId(m.id)
        const accountScenario = accountBucket ? getAccountReturnScenario(inputs, accountBucket) : undefined
        if (positionUsesCustomReturnMode(m, retRate)) customPositionReturnCount += 1
        if (
          positionNeedsIndividualRetirementProjection(m, retRate) ||
          holdingReturnRateSource(m, accountScenario, retRate) === 'account'
        ) {
          individualCv += m.currentValue
          const projectionModel = projectionModelForHolding(
            m,
            accountScenario,
            retRate,
            yearsToRetirement,
            marketScenario,
          )
          individualFvSum += projectPositionAtRetirement(
            projectionModel,
            retirementCalendarYear,
            yearsToRetirement,
          )
        }
      }
    }

    retirementGrowthSliderShowsFallback = customPositionReturnCount > 0
    const lumpPrincipal = Math.max(0, retBal - individualCv)
    const lumpFv = useMarketScenario
      ? fvWithYearlyRates(
          lumpPrincipal,
          resolveGlobalMarketScenarioRates(marketScenario, retRate, yearsToRetirement),
        )
      : fv(lumpPrincipal, retRate, yearsToRetirement)
    retFV = individualFvSum + lumpFv + savingsFV
    growthRetFvCompareDelta = retFV - growthRetFvLegacy
  }

  if (brokerageInputMode === 'imported' && hasImportedBrokerageModeling) {
    let workingBrk = normalizePositionReturnModels(
      inputs.positionReturnModels ?? [],
      yearsToRetirement,
      retRate,
      retirementCalendarYear,
    )
    workingBrk = mergeBucketIntoAllModels(workingBrk, brokerageRows, 'brk', brkRate, yearsToRetirement, retirementCalendarYear)
    const mergedBrk = workingBrk.filter((m) => m.id.startsWith('fid-brk-'))
    mergedBrokeragePositionModels = mergedBrk
    let brkIndividualCv = 0
    let brkIndividualFv = 0
    const brokerageAccountScenario = getAccountReturnScenario(inputs, 'brokerage')
    for (const m of mergedBrk) {
      if (
        positionNeedsIndividualRetirementProjection(m, brkRate) ||
        holdingReturnRateSource(m, brokerageAccountScenario, brkRate) === 'account'
      ) {
        brkIndividualCv += m.currentValue
        const projectionModel = projectionModelForHolding(
          m,
          brokerageAccountScenario,
          brkRate,
          yearsToRetirement,
          marketScenario,
        )
        brkIndividualFv += projectPositionAtRetirement(
          projectionModel,
          retirementCalendarYear,
          yearsToRetirement,
        )
      }
    }
    const brkLumpBal = Math.max(0, brkBal - brkIndividualCv)
    const brkLumpFv = useMarketScenario
      ? fvWithYearlyRates(
          brkLumpBal,
          resolveGlobalMarketScenarioRates(marketScenario, brkRate, yearsToRetirement),
        )
      : fv(brkLumpBal, brkRate, yearsToRetirement)
    brkFV = brkIndividualFv + brkLumpFv
  }

  if (retirementUsesLumpBalances && retBal > 0) {
    const retirementBucketBalances: { bucket: AccountScenarioBucketId; balance: number }[] = [
      { bucket: 'pretax', balance: tradBal },
      { bucket: 'roth', balance: rothBal },
      { bucket: 'hsa', balance: hsaBal },
    ]
    let bucketFvSum = 0
    let accountScenarioBucketCount = 0
    for (const { bucket, balance } of retirementBucketBalances) {
      if (!(balance > 0)) continue
      const accountScenario = getAccountReturnScenario(inputs, bucket)
      if (accountScenario) accountScenarioBucketCount += 1
      bucketFvSum += projectAccountBucketBalanceAtRetirement(
        balance,
        accountScenario,
        retRate,
        yearsToRetirement,
        retirementCalendarYear,
        marketScenario,
      )
    }
    retFV = bucketFvSum + savingsFV
    if (accountScenarioBucketCount > 0) {
      growthRetFvCompareDelta = retFV - growthRetFvLegacy
      retirementGrowthSliderShowsFallback = true
    }
  }

  if (brokerageUsesLumpBalance && brkBal > 0) {
    brkFV = projectAccountBucketBalanceAtRetirement(
      brkBal,
      getAccountReturnScenario(inputs, 'brokerage'),
      brkRate,
      yearsToRetirement,
      retirementCalendarYear,
      marketScenario,
    )
  }

  let totalFV = retFV + brkFV
  const hasPortfolioBalances = hasPortfolioBalanceInputs(retBal, brkBal, importedPositionRows)
  if (!hasPortfolioBalances) {
    retFV = 0
    brkFV = 0
    totalFV = 0
  }

  const portfolioFvSum = retFV + brkFV
  const fallbackAnnWd = portfolioFvSum * wdRate * (1 + wdInflation)
  const fallbackRetWdAnn = portfolioFvSum > 0 ? fallbackAnnWd * (retFV / portfolioFvSum) : 0
  const hsaAtRetirement = retirementFvForAccountBucket('hsa', {
    hasPortfolioBalances,
    retFV,
    brkFV,
    tradRatio,
    rothRatio,
    hsaRatio,
  })
  const hsaMedicalAnnualDraw = Math.min(fallbackRetWdAnn * hsaRatio, hsaAtRetirement)

  const incomeMonthlyCtx = {
    inputs,
    accountIncomeFunds: ui.accountIncomeFunds ?? {},
    accountIncomeStrategies: ui.accountIncomeStrategies ?? {},
    accountWithdrawRates: ui.accountWithdrawRates ?? {},
    wdInflation,
    hsaMedicalAnnualDraw,
    hasPortfolioBalances,
    retFV,
    brkFV,
    tradRatio,
    rothRatio,
    hsaRatio,
    tradBal,
    rothBal,
    hsaBal,
    brkBal,
    retirementAge: targetRetirementAge,
    locale: resolveOnboardingAccountLocale(),
    retirementBalanceMode: retirementInputMode,
  }

  const annWd = ui.incomeMode
    ? hasPortfolioBalances
      ? monthlyPortfolioIncomeFromAccountStrategies(incomeMonthlyCtx) * 12
      : 0
    : totalFV * wdRate * (1 + wdInflation)
  const monPort = annWd / 12

  const ssBreakdown = computeHouseholdSs(inputs)
  const ss = ssBreakdown.userMonthly
  const spouseSS = ssBreakdown.spouseMonthly
  const spouseEligible = inputs.married
  const spouseAge = spouseEligible ? ssBreakdown.spouseClaimAge : 0
  const survivorCallout = buildSurvivorCallout(monPort, ssBreakdown)

  const totalSS = ui.ssIncluded ? ssBreakdown.totalMonthly : 0
  const grossMon = monPort + totalSS

  const portSum = retFV + brkFV
  const retWdAnn = portSum > 0 ? annWd * (retFV / portSum) : 0
  const brkWdAnn = portSum > 0 ? annWd * (brkFV / portSum) : 0

  /*
   * AUDIT — Expectifinsights Tax Breakdown (growth / non–account-strategy path)
   * -------------------------------------------------------------------------
   * When ui.incomeMode is false (typical growth phase on the dashboard), withdrawal
   * dollars passed to calcTaxDetailed are NOT current-balance × wdRate.
   *
   * annWd (line ~465): totalFV * wdRate * (1 + wdInflation)
   *   - totalFV = retFV + brkFV (projected portfolio at targetRetirementAge; see
   *     retFV/brkFV computation above ~301–416)
   *
   * taxDetail.tradWd = retWdAnn * tradRatio
   *   = annWd * (retFV / portSum) * tradRatio
   *   ≈ (retFV * tradRatio) * wdRate * (1 + wdInflation)
   *   i.e. projected pre-tax bucket FV at retirement × withdrawal rate (same basis as
   *   retirementFvForAccountBucket('pretax') in accountBucketRetirementBalance.ts).
   *
   * tradRatio / rothRatio / hsaRatio (lines ~271–277): split uses TODAY's tradBal/rothBal/
   * hsaBal ÷ retBal — current mix applied to projected retirement totals, not per-bucket FV
   * grown separately. If bucket growth rates diverge, pretax share at retirement may differ.
   *
   * Income-mode path (ui.incomeMode true): calcTaxDetailedForAccountStrategies uses
   * accountRetirementBalance() → projected per-account FV; see accountIncomeTax.ts.
   *
   * WRONG basis (not used on growth path): tradBal * wdRate, retBal * wdRate.
   */
  const taxDetail =
    ui.incomeMode && hasPortfolioBalances
      ? calcTaxDetailedForAccountStrategies(incomeMonthlyCtx, totalSS, filingStatus)
      : calcTaxDetailed(
          retWdAnn * tradRatio,
          retWdAnn * rothRatio,
          retWdAnn * hsaRatio,
          brkWdAnn,
          totalSS,
          filingStatus,
        )

  if (import.meta.env.DEV && hasPortfolioBalances) {
    const growthTaxPath = !(ui.incomeMode && hasPortfolioBalances)
    console.info('[Expectifinsights Tax Breakdown audit]', {
      path: growthTaxPath ? 'growth (portfolio wdRate × projected FV)' : 'income (per-account strategies)',
      balanceBasisForWithdrawalEstimates: growthTaxPath
        ? 'PROJECTED at retirement (retFV/brkFV), not current retBal/brkBal'
        : 'PROJECTED per account via accountRetirementBalance()',
      current_retBal: retBal,
      current_tradBal: tradBal,
      projected_retFV: retFV,
      projected_brkFV: brkFV,
      projected_totalFV: totalFV,
      projected_pretaxBucketFV: retFV * tradRatio,
      tradRatio_sourcedFrom: 'current tradBal / retBal (computeResults ~275)',
      wdRate,
      wdInflation,
      annWd_annualWithdrawal: annWd,
      taxDetail_tradWd_pretax: taxDetail.tradWd,
      taxDetail_brkWd: taxDetail.brkWd,
      counterfactual_if_current_pretax_used: tradBal * wdRate * (1 + wdInflation),
    })
  }

  const annTax = taxDetail.totalTax
  const afterTaxMon = (annWd + totalSS * 12 - annTax) / 12
  const incomeGoalProgressPct =
    monthlyIncomeGoal > 0 ? Math.min(100, Math.round((afterTaxMon / monthlyIncomeGoal) * 1000) / 10) : null

  const growthGoalProgressPct =
    growthGoal > 0 && hasPortfolioBalances
      ? Math.min(100, Math.round((totalFV / growthGoal) * 1000) / 10)
      : null

  const incomePhase = ui.incomeMode
    ? calcIncomePhase({
        totalFV,
        incYield,
        incGrowth,
        wdRate,
        wdInflation,
        totalSSMonthly: totalSS,
        ssIncluded: ui.ssIncluded,
        retirementStartAge: targetRetirementAge,
      })
    : null

  const scenarios = SCENARIOS.map((rate) => {
    const r = rate / 100
    const rSav = hasPortfolioBalances ? fvAnnuity(save, r, yearsToRetirement) : 0
    const rRet = hasPortfolioBalances ? fv(retBal, r, yearsToRetirement) + rSav : 0
    const tFV = hasPortfolioBalances ? rRet + brkFV : 0
    const infl = ui.incomeMode ? 1 : 1 + wdInflation
    const aWd = tFV * wdRate * infl
    const mPort = aWd / 12
    const gross = mPort + totalSS
    const tax = calcTax(aWd, totalSS, rRet, brkFV, tradRatio, rothRatio, hsaRatio, filingStatus)
    const after = (aWd + totalSS * 12 - tax) / 12
    return { rate, rFV: rRet, bFV: brkFV, tFV, mPort, gross, after }
  })

  const rothMon = (retFV * 0.16 * 0.04) / 12
  const hsaMon = (retFV * 0.1 * 0.04) / 12
  const halfSS = (totalSS * 12) / 2
  const combinedInc = halfSS + other
  const ssThresh = ssProvisionalThresholds(filingStatus)
  const headroom0 = ssThresh.always85
    ? 0
    : Math.max(0, ssThresh.half50 - combinedInc)
  const ssZone = ssThresh.always85
    ? 'taxed'
    : combinedInc < ssThresh.half50
      ? 'free'
      : combinedInc < ssThresh.full85
        ? 'partial'
        : 'taxed'
  const ssLabel =
    ssZone === 'free' ? '0% of SS taxable' : ssZone === 'partial' ? 'up to 50% taxable' : 'up to 85% taxable'
  const barDenom = ssThresh.always85 ? 1 : Math.max(1, ssThresh.full85)
  const barPct = Math.min(100, Math.round((combinedInc / barDenom) * 100))
  const barColor = ssZone === 'free' ? '#16DB65' : ssZone === 'partial' ? '#F9A03F' : '#C03221'

  const grossAnnualUsd = annWd + totalSS * 12
  const usTax = calcTax(annWd, totalSS, retFV, brkFV, tradRatio, rothRatio, hsaRatio, filingStatus)
  const retireRegionComparisons = computeAllRetireRegionComparisons(retireRegions, grossAnnualUsd, usTax)
  const primaryRegion = retireRegionComparisons[0]
  const itAnn = grossAnnualUsd
  const itTax = primaryRegion ? primaryRegion.localTaxMonthlyUsd * 12 : 0
  const itAfter = primaryRegion?.afterTaxMonthlyUsd ?? 0
  const itSurplus = primaryRegion?.surplusMonthlyUsd ?? 0

  const ssTiming = computeSSTiming(inputs.ssInvestPct / 100)

  const strategy = computeStrategyBlock({
    i: {
      tradBal,
      retRate,
      ss,
      tradRatio,
      rothRatio,
      hsaRatio,
    },
    retFV,
    brkFV,
    totalSS,
    annWd,
    taxDetail,
    hasPortfolioBalances,
    filingStatus,
  })

  const portfolioGuidance: PortfolioGuidanceMetrics | null =
    ui.incomeMode && hasPortfolioBalances
      ? computePortfolioGuidanceMetrics(
          {
            totalFV,
            monPort,
            annWd,
            monthlyIncomeGoal,
            targetRetirementAge,
            taxDetail,
            strategy,
            filingStatus,
            tradRatio,
            retFV,
          },
          incomeMonthlyCtx,
        )
      : null

  return {
    currentAge,
    targetRetirementAge,
    yearsToRetirement,
    growthGoal,
    monthlyIncomeGoal,
    growthGoalProgressPct,
    incomeGoalProgressPct,
    ssAge,
    wdRate,
    incYield,
    save,
    bal,
    tradBal,
    rothBal,
    hsaBal,
    retBal,
    brkBal,
    tradRatio,
    rothRatio,
    hsaRatio,
    filingStatus,
    savingsFV,
    retFV,
    brkFV,
    totalFV,
    ss,
    spouseSS,
    spouseAge,
    spouseEligible,
    annWd,
    monPort,
    totalSS,
    grossMon,
    taxDetail,
    annTax,
    afterTaxMon,
    incomePhase,
    scenarios,
    rothMon,
    hsaMon,
    halfSS,
    combinedInc,
    headroom0,
    ssZone,
    ssLabel,
    barPct,
    barColor,
    itAnn,
    itTax,
    itAfter,
    itSurplus,
    usTax,
    retireRegions,
    retireRegionComparisons,
    ssTiming,
    ssBreakdown,
    survivorCallout,
    ssConfigured: isSsConfigured(inputs),
    strategy,
    portfolioGuidance,
    growthRetFvLegacy,
    growthRetFvCompareDelta,
    hasImportedRetirementModeling,
    retirementCalendarYear,
    customPositionReturnCount,
    retirementGrowthSliderShowsFallback,
    mergedRetirementPositionModels,
    mergedBrokeragePositionModels,
    hasPortfolioBalances,
  }
}

function computeSSTiming(r: number) {
  const SS_62 = ssFromAge(62)
  const SS_67 = ssFromAge(67)
  const SS_70 = ssFromAge(70)
  const startYear = 2033
  function cumulative(drawAge: number, ssMonthly: number, toAge: number) {
    let total = 0
    const drawStart = startYear + (drawAge - 62)
    const toYear = startYear + (toAge - 62)
    for (let yr = drawStart; yr < toYear; yr++) {
      total += ssMonthly * 12 * Math.pow(1 + r, toYear - yr - 1)
    }
    return total
  }
  const ages = [65, 67, 70, 72, 75, 78, 80, 82, 85, 88, 90]
  const rows = ages.map((age) => {
    const c62 = cumulative(62, SS_62, age)
    const c67 = cumulative(67, SS_67, age)
    const c70 = cumulative(70, SS_70, age)
    const best = c62 >= c67 && c62 >= c70 ? '62' : c67 >= c70 ? '67' : '70'
    return { age, c62, c67, c70, best }
  })
  function breakevenAge(ageA: number, ssA: number, ageB: number, ssB: number) {
    for (let age = Math.max(ageA, ageB); age <= 95; age++) {
      if (cumulative(ageA, ssA, age) < cumulative(ageB, ssB, age)) return age
    }
    return null
  }
  return {
    rows,
    be6267: breakevenAge(62, SS_62, 67, SS_67),
    be6270: breakevenAge(62, SS_62, 70, SS_70),
    be6770: breakevenAge(67, SS_67, 70, SS_70),
  }
}

function computeStrategyBlock({
  i,
  retFV,
  brkFV,
  totalSS,
  annWd,
  taxDetail,
  hasPortfolioBalances,
  filingStatus,
}: {
  i: { tradBal: number; retRate: number; ss: number; tradRatio: number; rothRatio: number; hsaRatio: number }
  retFV: number
  brkFV: number
  totalSS: number
  annWd: number
  taxDetail: ReturnType<typeof calcTaxDetailed>
  hasPortfolioBalances: boolean
  filingStatus: FilingStatusId
}) {
  if (!hasPortfolioBalances) {
    return {
      retWdAnn: 0,
      brkWdAnn: 0,
      tradWdAnn: 0,
      rothWdAnn: 0,
      hsaWdAnn: 0,
      rothConvRoom: 0,
      tradBalK: 0,
      retRatePct: (i.retRate * 100).toFixed(1),
      tradFvK: 0,
      combinedSS67: 0,
      taxDetail,
      totalSS: 0,
    }
  }

  const sum = retFV + brkFV
  const denom = sum > 0 ? sum : 1
  const retWdAnn = annWd * (retFV / denom)
  const brkWdAnn = annWd * (brkFV / denom)
  const tradWdAnn = retWdAnn * i.tradRatio
  const rothWdAnn = retWdAnn * i.rothRatio
  const hsaWdAnn = retWdAnn * i.hsaRatio
  const rothConvRoomAmt = rothConversionRoom(tradWdAnn, filingStatus)
  return {
    retWdAnn,
    brkWdAnn,
    tradWdAnn,
    rothWdAnn,
    hsaWdAnn,
    rothConvRoom: rothConvRoomAmt,
    tradBalK: Math.round(i.tradBal / 1000),
    retRatePct: (i.retRate * 100).toFixed(1),
    tradFvK: retFV * i.tradRatio,
    combinedSS67: i.ss + SP_SS_67,
    taxDetail,
    totalSS,
  }
}

export type ComputedSnapshot = ReturnType<typeof computeResults>

export function applyPortfolioDeltaAtRetirement(
  snapshot: ComputedSnapshot,
  params: {
    portfolioDelta: number
    incomeMode: boolean
    incYield: number
    incGrowth: number
    wdRate: number
    wdInflation: number
    monthlyIncomeGoal: number
    targetRetirementAge: number
    ssIncluded: boolean
    retireRegions: RetireRegionPick[]
    filingStatus: FilingStatusId
  },
): ComputedSnapshot {
  const {
    portfolioDelta,
    incomeMode,
    incYield,
    incGrowth,
    wdRate,
    wdInflation,
    monthlyIncomeGoal,
    targetRetirementAge,
    ssIncluded,
    retireRegions,
    filingStatus,
  } = params

  if (portfolioDelta === 0 || !snapshot.hasPortfolioBalances) return snapshot

  const adjustedTotalFV = Math.max(0, snapshot.totalFV + portfolioDelta)
  const scale = snapshot.totalFV > 0 ? adjustedTotalFV / snapshot.totalFV : 0
  const adjustedRetFV = snapshot.retFV * scale
  const adjustedBrkFV = snapshot.brkFV * scale

  const monPort = incomeMode
    ? snapshot.monPort * scale
    : (adjustedTotalFV * wdRate * (1 + wdInflation)) / 12
  const annWd = monPort * 12
  const totalSS = snapshot.totalSS
  const grossMon = monPort + totalSS

  const portSum = adjustedRetFV + adjustedBrkFV
  const retWdAnn = portSum > 0 ? annWd * (adjustedRetFV / portSum) : 0
  const brkWdAnn = portSum > 0 ? annWd * (adjustedBrkFV / portSum) : 0
  const taxDetail = incomeMode
    ? calcTaxDetailed(
        snapshot.taxDetail.tradWd * scale,
        snapshot.taxDetail.rothWd * scale,
        snapshot.taxDetail.hsaWd * scale,
        snapshot.taxDetail.brkWd * scale,
        totalSS,
        filingStatus,
      )
    : calcTaxDetailed(
        retWdAnn * snapshot.tradRatio,
        retWdAnn * snapshot.rothRatio,
        retWdAnn * snapshot.hsaRatio,
        brkWdAnn,
        totalSS,
        filingStatus,
      )
  const annTax = taxDetail.totalTax
  const afterTaxMon = (annWd + totalSS * 12 - annTax) / 12
  const incomeGoalProgressPct =
    monthlyIncomeGoal > 0
      ? Math.min(100, Math.round((afterTaxMon / monthlyIncomeGoal) * 1000) / 10)
      : null

  const growthGoalProgressPct =
    snapshot.growthGoal > 0
      ? Math.min(100, Math.round((adjustedTotalFV / snapshot.growthGoal) * 1000) / 10)
      : snapshot.growthGoalProgressPct

  const tradWdAnn = retWdAnn * snapshot.tradRatio
  const rothConvRoomAmt = rothConversionRoom(tradWdAnn, filingStatus)

  const incomePhase = incomeMode
    ? calcIncomePhase({
        totalFV: adjustedTotalFV,
        incYield,
        incGrowth,
        wdRate,
        wdInflation,
        totalSSMonthly: totalSS,
        ssIncluded,
        retirementStartAge: targetRetirementAge,
      })
    : snapshot.incomePhase

  const grossAnnualUsd = annWd + totalSS * 12
  const usTax = calcTax(
    annWd,
    totalSS,
    adjustedRetFV,
    adjustedBrkFV,
    snapshot.tradRatio,
    snapshot.rothRatio,
    snapshot.hsaRatio,
    filingStatus,
  )
  const retireRegionComparisons = computeAllRetireRegionComparisons(
    retireRegions,
    grossAnnualUsd,
    usTax,
  )
  const primaryRegion = retireRegionComparisons[0]

  return {
    ...snapshot,
    filingStatus,
    retFV: adjustedRetFV,
    brkFV: adjustedBrkFV,
    totalFV: adjustedTotalFV,
    annWd,
    monPort,
    grossMon,
    taxDetail,
    annTax,
    afterTaxMon,
    incomeGoalProgressPct,
    growthGoalProgressPct,
    incomePhase,
    strategy: {
      ...snapshot.strategy,
      rothConvRoom: rothConvRoomAmt,
      taxDetail,
    },
    survivorCallout: buildSurvivorCallout(monPort, snapshot.ssBreakdown),
    usTax,
    retireRegionComparisons,
    itAnn: grossAnnualUsd,
    itTax: primaryRegion ? primaryRegion.localTaxMonthlyUsd * 12 : 0,
    itAfter: primaryRegion?.afterTaxMonthlyUsd ?? 0,
    itSurplus: primaryRegion?.surplusMonthlyUsd ?? 0,
  }
}
