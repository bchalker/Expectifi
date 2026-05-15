import { SCENARIOS, HOME_EQUITY, SP_SS_67, DEFAULT_HSA_RATIO, DEFAULT_ROTH_RATIO, DEFAULT_TRAD_RATIO } from 'shared'
import {
  calcIncomePhase,
  calcPortfolioAtRetirement,
  calcTax,
  calcTaxDetailed,
  fv,
  fvAnnuity,
  ssFromAge,
} from 'shared'
import { clampedAgeFromDob } from './ageFromDob'
import { buildSurvivorCallout, computeHouseholdSs, isSsConfigured } from './socialSecurity'
import { flattenBatches, loadStoredFidelityImport } from './fidelityStorage'
import { positionsForBrokerage, positionsForRetirementBucket, type FidelityPositionRow } from './fidelityCsv'
import {
  calendarRetirementYear,
  mergeBucketIntoAllModels,
  normalizePositionReturnModels,
  positionNeedsIndividualRetirementProjection,
  positionUsesCustomReturnMode,
  projectPositionAtRetirement,
  type PositionReturnModel,
} from './positionReturnModel'

export type DrawerName =
  | 'scenarios'
  | 'sstiming'
  | 'taxfree'
  | 'strategy'
  | 'italy'
  | 'config'

/** Dividend yield preset (y = yield %, g = NAV drift %). */
export type IncomeYieldPreset = {
  id: string
  label: string
  y: number
  g: number
}

export const DEFAULT_INCOME_PRESETS: IncomeYieldPreset[] = [
  { id: 'p1', y: 6, g: 1, label: 'JEPI/JEPQ · 6% / +1%' },
  { id: 'p2', y: 9, g: -2, label: 'BDC (ARCC) · 9% / −2%' },
  { id: 'p3', y: 6, g: 4, label: 'CEF hybrid · 6% / +4%' },
  { id: 'p4', y: 12, g: -8, label: 'YieldMax · 12% / −8%' },
  { id: 'p5', y: 5, g: 3, label: 'Div growth · 5% / +3%' },
]

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n))
}

/** Coerce saved or partial data into a usable preset list. */
export function normalizeIncomePresets(raw: unknown): IncomeYieldPreset[] {
  if (!Array.isArray(raw) || raw.length === 0) return [...DEFAULT_INCOME_PRESETS]
  const out: IncomeYieldPreset[] = []
  for (const x of raw) {
    if (!x || typeof x !== 'object') continue
    const o = x as Record<string, unknown>
    const id = typeof o.id === 'string' && o.id.trim() ? o.id.trim() : `p-${out.length}`
    const label = typeof o.label === 'string' && o.label.trim() ? o.label.trim() : 'Preset'
    const yNum = typeof o.y === 'number' ? o.y : Number(o.y)
    const gNum = typeof o.g === 'number' ? o.g : Number(o.g)
    const y = Number.isFinite(yNum) ? clamp(yNum, 2, 20) : 6
    const g = Number.isFinite(gNum) ? clamp(gNum, -10, 10) : 0
    out.push({ id, label, y, g })
  }
  return out.length > 0 ? out : [...DEFAULT_INCOME_PRESETS]
}

export type CalculatorInputs = {
  base401k: number
  baseSE401k: number
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
  italyCost: number
  ssInvestPct: number
  /** ISO `YYYY-MM-DD`; current age is derived from this date for projections. */
  dateOfBirth: string
  /** Planned age when you stop accumulating and model reaches portfolio FV. */
  targetRetirementAge: number
  /** Target after-tax monthly income at retirement (0 = hide goal gauge). */
  monthlyIncomeGoal: number
  /** User-defined dividend / NAV presets for the income phase. */
  incomePresets: IncomeYieldPreset[]
  /** Per-import-line return models (Fidelity dashboard sliders); merged with CSV at compute time. */
  positionReturnModels: PositionReturnModel[]
}

export type { PositionReturnModel } from './positionReturnModel'

export type CalculatorUi = {
  incomeMode: boolean
  ssIncluded: boolean
  /** Incremented from the strip to open the income preset editor on the Income page. */
  incomePresetEditorFocusSeq?: number
}

function accountDisplayBalances(bases: CalculatorInputs) {
  return {
    bal401k: bases.base401k,
    balSE401k: bases.baseSE401k,
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
  fidelityRows: FidelityPositionRow[],
): boolean {
  if (retBal > 0 || brkBal > 0) return true
  for (const bucket of ['trad401k', 'se401k', 'roth', 'hsa'] as const) {
    if (positionsForRetirementBucket(fidelityRows, bucket).length > 0) return true
  }
  return positionsForBrokerage(fidelityRows).length > 0
}

export function mergeAllRetirementFidelityBuckets(
  inputs: CalculatorInputs,
  fidelityRows: FidelityPositionRow[],
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
    const pos = positionsForRetirementBucket(fidelityRows, def.bucket)
    working = mergeBucketIntoAllModels(working, pos, def.keyPrefix, retRate, yearsToRetirement, retirementCalendarYear)
    if (pos.length === 0) continue
    const prefix = `fid-${def.keyPrefix}-`
    for (const m of working) {
      if (m.id.startsWith(prefix)) mergedInHoldings.push(m)
    }
  }
  return { working, mergedInHoldings }
}

export function computeResults(inputs: CalculatorInputs, ui: CalculatorUi) {
  const {
    retRate,
    brkRate,
    save,
    brkBal,
    wdRate,
    wdInflation,
    incYield,
    incGrowth,
    ssAge,
    other,
    italyCost,
    dateOfBirth,
    targetRetirementAge,
    monthlyIncomeGoal,
  } = inputs

  const currentAge = clampedAgeFromDob(dateOfBirth)
  const yearsToRetirement = Math.max(1, Math.min(50, Math.round(targetRetirementAge - currentAge)))

  const bal = accountDisplayBalances(inputs)
  const tradBal = bal.bal401k + bal.balSE401k
  const rothBal = bal.balRoth
  const hsaBal = bal.balHsa
  const retBal = tradBal + rothBal + hsaBal

  const tradRatio = retBal > 0 ? tradBal / retBal : DEFAULT_TRAD_RATIO
  const rothRatio = retBal > 0 ? rothBal / retBal : DEFAULT_ROTH_RATIO
  const hsaRatio = retBal > 0 ? hsaBal / retBal : DEFAULT_HSA_RATIO

  const legacyGrowth = calcPortfolioAtRetirement({
    retBal,
    save,
    retRate,
    brkBal,
    brkRate,
    years: yearsToRetirement,
  })
  const { savingsFV, brkFV: legacyBrkFV } = legacyGrowth
  let brkFV = legacyBrkFV
  const growthRetFvLegacy = legacyGrowth.retFV
  let retFV = growthRetFvLegacy
  let growthRetFvCompareDelta = 0
  let customPositionReturnCount = 0
  let retirementGrowthSliderShowsFallback = false
  let mergedRetirementPositionModels: PositionReturnModel[] = []
  let mergedBrokeragePositionModels: PositionReturnModel[] = []

  let fidelityRows: FidelityPositionRow[] = []
  const fidelityImp = loadStoredFidelityImport()
  if (fidelityImp?.batches?.length) fidelityRows = flattenBatches(fidelityImp.batches)

  const retirementBuckets = ['trad401k', 'se401k', 'roth', 'hsa'] as const
  const hasFidelityRetirementModeling = retirementBuckets.some((b) => positionsForRetirementBucket(fidelityRows, b).length > 0)

  const retirementCalendarYear = calendarRetirementYear(currentAge, targetRetirementAge)

  if (hasFidelityRetirementModeling) {
    const { working, mergedInHoldings } = mergeAllRetirementFidelityBuckets(
      inputs,
      fidelityRows,
      yearsToRetirement,
      retirementCalendarYear,
      retRate,
    )
    mergedRetirementPositionModels = mergedInHoldings

    let individualFvSum = 0
    let individualCv = 0
    for (const def of RETIREMENT_FIDELITY_BUCKET_DEFS) {
      const pos = positionsForRetirementBucket(fidelityRows, def.bucket)
      if (pos.length === 0) continue
      const prefix = `fid-${def.keyPrefix}-`
      const mergedBucket = working.filter((p) => p.id.startsWith(prefix))
      for (const m of mergedBucket) {
        if (positionUsesCustomReturnMode(m, retRate)) customPositionReturnCount += 1
        if (positionNeedsIndividualRetirementProjection(m, retRate)) {
          individualCv += m.currentValue
          individualFvSum += projectPositionAtRetirement(m, retirementCalendarYear, yearsToRetirement)
        }
      }
    }

    retirementGrowthSliderShowsFallback = customPositionReturnCount > 0
    const lumpPrincipal = Math.max(0, retBal - individualCv)
    retFV = individualFvSum + fv(lumpPrincipal, retRate, yearsToRetirement) + savingsFV
    growthRetFvCompareDelta = retFV - growthRetFvLegacy
  }

  const brokerageRows = positionsForBrokerage(fidelityRows)
  if (brokerageRows.length > 0) {
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
    for (const m of mergedBrk) {
      if (positionNeedsIndividualRetirementProjection(m, brkRate)) {
        brkIndividualCv += m.currentValue
        brkIndividualFv += projectPositionAtRetirement(m, retirementCalendarYear, yearsToRetirement)
      }
    }
    const brkLumpBal = Math.max(0, brkBal - brkIndividualCv)
    brkFV = brkIndividualFv + fv(brkLumpBal, brkRate, yearsToRetirement)
  }

  let totalFV = retFV + brkFV
  const hasPortfolioBalances = hasPortfolioBalanceInputs(retBal, brkBal, fidelityRows)
  if (!hasPortfolioBalances) {
    retFV = 0
    brkFV = 0
    totalFV = 0
  }

  const annWd = ui.incomeMode
    ? totalFV * incYield
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
  const taxDetail = calcTaxDetailed(
    retWdAnn * tradRatio,
    retWdAnn * rothRatio,
    retWdAnn * hsaRatio,
    brkWdAnn,
    totalSS,
  )
  const annTax = taxDetail.totalTax
  const afterTaxMon = (annWd + totalSS * 12 - annTax) / 12
  const equityMon = (HOME_EQUITY * wdRate) / 12

  const goalProgressPct =
    monthlyIncomeGoal > 0 ? Math.min(150, Math.round((afterTaxMon / monthlyIncomeGoal) * 1000) / 10) : null

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
    const tax = calcTax(aWd, totalSS, rRet, brkFV, tradRatio, rothRatio, hsaRatio)
    const after = (aWd + totalSS * 12 - tax) / 12
    return { rate, rFV: rRet, bFV: brkFV, tFV, mPort, gross, after }
  })

  const rothMon = (retFV * 0.16 * 0.04) / 12
  const hsaMon = (retFV * 0.1 * 0.04) / 12
  const halfSS = (totalSS * 12) / 2
  const combinedInc = halfSS + other
  const headroom0 = Math.max(0, 25000 - combinedInc)
  const ssZone = combinedInc < 25000 ? 'free' : combinedInc < 34000 ? 'partial' : 'taxed'
  const ssLabel =
    ssZone === 'free' ? '0% of SS taxable' : ssZone === 'partial' ? 'up to 50% taxable' : 'up to 85% taxable'
  const barPct = Math.min(100, Math.round((combinedInc / 34000) * 100))
  const barColor = ssZone === 'free' ? '#0F6E56' : ssZone === 'partial' ? '#BA7517' : '#A32D2D'

  const itAnn = annWd + totalSS * 12
  const itTax = itAnn * 0.07
  const itAfter = (itAnn - itTax) / 12
  const itSurplus = itAfter - italyCost
  const usTax = calcTax(annWd, totalSS, retFV, brkFV, tradRatio, rothRatio, hsaRatio)

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
  })

  return {
    currentAge,
    targetRetirementAge,
    yearsToRetirement,
    monthlyIncomeGoal,
    goalProgressPct,
    ssAge,
    wdRate,
    incYield,
    save,
    bal,
    tradBal,
    rothBal,
    hsaBal,
    retBal,
    tradRatio,
    rothRatio,
    hsaRatio,
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
    equityMon,
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
    ssTiming,
    ssBreakdown,
    survivorCallout,
    ssConfigured: isSsConfigured(inputs),
    strategy,
    growthRetFvLegacy,
    growthRetFvCompareDelta,
    hasFidelityRetirementModeling,
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
}: {
  i: { tradBal: number; retRate: number; ss: number; tradRatio: number; rothRatio: number; hsaRatio: number }
  retFV: number
  brkFV: number
  totalSS: number
  annWd: number
  taxDetail: ReturnType<typeof calcTaxDetailed>
}) {
  const sum = retFV + brkFV
  const denom = sum > 0 ? sum : 1
  const retWdAnn = annWd * (retFV / denom)
  const brkWdAnn = annWd * (brkFV / denom)
  const tradWdAnn = retWdAnn * i.tradRatio
  const rothWdAnn = retWdAnn * i.rothRatio
  const hsaWdAnn = retWdAnn * i.hsaRatio
  const stdDed = 29200
  const bracket12top = 89075
  const rothConvRoom = Math.max(0, bracket12top - (tradWdAnn - stdDed))
  return {
    retWdAnn,
    brkWdAnn,
    tradWdAnn,
    rothWdAnn,
    hsaWdAnn,
    rothConvRoom,
    tradBalK: Math.round(i.tradBal / 1000),
    retRatePct: (i.retRate * 100).toFixed(1),
    tradFvK: retFV * i.tradRatio,
    combinedSS67: i.ss + SP_SS_67,
    taxDetail,
    totalSS,
  }
}

export type ComputedSnapshot = ReturnType<typeof computeResults>
