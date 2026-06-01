import type { CalculatorInputs, ComputedSnapshot } from '../lib/computeResults'
import {
  accountScenarioIsActive,
  blendedRateForAccountBucket,
  getAccountReturnScenario,
  inferAccountScenarioUiChoice,
  type AccountScenarioBucketId,
} from '../lib/accountReturnScenario'
import type { OnboardingAccountType } from '../lib/manualAccountEntries'
import type { OnboardingRegionId } from '../lib/onboardingRegions'
import { horizonClamp, scenarioColumnShortLabel } from '../lib/holdingScenarioApply'
import { isSsConfigured } from '../lib/socialSecurity'
import type { WithdrawalDisplayBucket } from '../lib/withdrawalDisplayOrder'
import { onboardingRegionToHintLocale, resolveAccountHint } from './hint-engine'
import type { HintContext, HintMode, HintSegment } from './types'

export type BuildAccountHintParams = {
  bucket: AccountScenarioBucketId
  balance: number
  totalPortfolio: number
  locale: OnboardingRegionId
  mode: HintMode
  c: ComputedSnapshot
  inputs?: CalculatorInputs
  uiSsIncluded: boolean
  userAccountTypes: OnboardingAccountType[]
  presentBuckets: WithdrawalDisplayBucket[]
}

function bucketBalance(c: ComputedSnapshot, bucket: AccountScenarioBucketId, brkBal: number): number {
  switch (bucket) {
    case 'brokerage':
      return brkBal
    case 'pretax':
      return c.bal.bal401k + c.bal.balSE401k + c.bal.balTradIRA
    case 'roth':
      return c.bal.balRoth
    case 'hsa':
      return c.bal.balHsa
  }
}

function globalRateForBucket(
  bucket: AccountScenarioBucketId,
  inputs: CalculatorInputs | undefined,
): number {
  if (!inputs) return 0
  const blended = blendedRateForAccountBucket(bucket, inputs.retRate, inputs.brkRate)
  return blended * 100
}

function scenarioLabelForBucket(
  bucket: AccountScenarioBucketId,
  inputs: CalculatorInputs | undefined,
  yearsToRetirement: number,
): { label: string | null; active: boolean } {
  if (!inputs) return { label: null, active: false }
  const blended = blendedRateForAccountBucket(bucket, inputs.retRate, inputs.brkRate)
  const stored = getAccountReturnScenario(inputs, bucket)
  const h = horizonClamp(yearsToRetirement)
  const choice = stored ? inferAccountScenarioUiChoice(stored, blended, h) : 'default'
  const customDec = choice === 'custom' && stored ? stored.flatRate : undefined
  const active = accountScenarioIsActive(inputs, bucket)
  if (!active) return { label: null, active: false }
  return {
    label: scenarioColumnShortLabel(choice, customDec),
    active: true,
  }
}

export function buildAccountHintContext(params: BuildAccountHintParams & { brkBal: number }): HintContext {
  const {
    bucket,
    balance,
    totalPortfolio,
    locale,
    mode,
    c,
    inputs,
    uiSsIncluded,
    userAccountTypes,
    presentBuckets,
    brkBal,
  } = params

  const hintLocale = onboardingRegionToHintLocale(locale)
  const pensionConfigured = isSsConfigured(inputs ?? ({} as CalculatorInputs))
  const ssMonthly = c.totalSS ?? 0
  const hasPension = Boolean(uiSsIncluded && pensionConfigured && ssMonthly > 0)
  const { label: scenarioLabel, active: scenarioActive } = scenarioLabelForBucket(
    bucket,
    inputs,
    c.yearsToRetirement,
  )

  const balances = presentBuckets.map((b) => ({
    bucket: b as AccountScenarioBucketId,
    balance: bucketBalance(c, b as AccountScenarioBucketId, brkBal),
  }))
  const maxBalance = Math.max(...balances.map((x) => x.balance), 0)

  const projectedMedicalMonthly = c.strategy.hsaWdAnn > 0 ? c.strategy.hsaWdAnn / 12 : 0
  const hasMedical = projectedMedicalMonthly > 0

  return {
    accountType: bucket,
    accountBalance: balance,
    totalPortfolio,
    isLargestAccount: balance > 0 && balance >= maxBalance,
    globalRate: globalRateForBucket(bucket, inputs),
    accountScenario: scenarioLabel,
    accountScenarioActive: scenarioActive,
    hasSSConfigured: hintLocale === 'US' && hasPension,
    ssMonthlyAmount: ssMonthly,
    hasCPPConfigured: hintLocale === 'CA' && hasPension,
    hasOASConfigured: hintLocale === 'CA' && hasPension,
    hasMedicalExpensesConfigured: hasMedical,
    projectedMedicalMonthly,
    conversionRoom: c.strategy.rothConvRoom,
    userAccounts: userAccountTypes,
    retirementYear: c.retirementCalendarYear,
    locale: hintLocale,
    mode,
    userHasBrokerage: presentBuckets.includes('brokerage'),
    userHasPretax: presentBuckets.includes('pretax'),
    userHasRoth: presentBuckets.includes('roth'),
    userHasHsa: presentBuckets.includes('hsa'),
  }
}

export function resolveBucketRowHint(
  params: BuildAccountHintParams & { brkBal: number },
): HintSegment[] | null {
  const ctx = buildAccountHintContext(params)
  return resolveAccountHint(ctx)
}
