import {
  accountLabelForWithdrawalBucket,
  localeSupportsWithdrawalBucket,
  type TaxConfig,
} from '../config/taxConfig'
import type { AccountBucketBalanceSnapshot } from './accountIncomeMonthly'
import type { ComputedSnapshot } from './computeResults'
import { filingStatusDisplayLabel } from './filingStatus'
import { fmt, fmtMon } from '../utils/format'
import {
  withdrawalBucketOrder,
  type WithdrawalDisplayBucket,
} from './withdrawalDisplayOrder'
import type { OnboardingRegionId } from './onboardingRegions'
import { normalizeOnboardingRegionId } from './onboardingRegions'
import type { TaxPictureNarrative } from './taxBreakdownTaxPicture'

export const TAX_BREAKDOWN_EMPTY_GUIDANCE =
  'Your tax estimate will update as you add income sources and account strategies below.'

export const ROTH_CONVERSION_CALLOUT_TOOLTIP =
  'A Roth conversion moves money from a pre-tax account like a 401k or IRA into a Roth IRA. You pay income tax on the amount converted now, but future growth and withdrawals are tax-free. Converting in lower-income years before retirement can reduce your tax burden later.'

const WITHDRAWAL_REASON_BY_BUCKET: Record<WithdrawalDisplayBucket, string> = {
  brokerage:
    'Drawing taxable accounts first reduces long-term tax drag on your portfolio.',
  pretax:
    'Strategic withdrawals before age 73 keep you in lower brackets and reduce future RMD pressure.',
  roth: 'Tax-free forever — draw this last or leave it to grow for heirs.',
  hsa: 'Triple tax advantage — use for qualified medical expenses first to preserve the tax benefit.',
}

export type HarvestWithdrawalOrderItem = {
  bucket: WithdrawalDisplayBucket
  label: string
  explanation: string
}

export type HarvestTaxCallout = {
  id: string
  label: string
  body: string
}

function presentBuckets(
  balances: AccountBucketBalanceSnapshot,
  locale: OnboardingRegionId,
): Set<WithdrawalDisplayBucket> {
  const present = new Set<WithdrawalDisplayBucket>()
  if (balances.brokerage > 0 && localeSupportsWithdrawalBucket(locale, 'brokerage')) {
    present.add('brokerage')
  }
  if (balances.pretax > 0 && localeSupportsWithdrawalBucket(locale, 'pretax')) {
    present.add('pretax')
  }
  if (balances.roth > 0 && localeSupportsWithdrawalBucket(locale, 'roth')) {
    present.add('roth')
  }
  if (balances.hsa > 0 && localeSupportsWithdrawalBucket(locale, 'hsa')) {
    present.add('hsa')
  }
  return present
}

export function harvestTaxIncomeReady(c: ComputedSnapshot): boolean {
  return c.grossMon > 0
}

export function buildHarvestTaxPictureNarrative(
  c: ComputedSnapshot,
  taxConfig: TaxConfig,
): TaxPictureNarrative | null {
  if (!harvestTaxIncomeReady(c)) return null

  const td = c.taxDetail
  const filingLabel = filingStatusDisplayLabel(c.filingStatus).toLowerCase()
  const effectivePct = (td.effectiveRate * 100).toFixed(1)
  const sentences: TaxPictureNarrative = []

  sentences.push([
    'As a ',
    { em: filingLabel },
    ' household, your model projects about ',
    { em: fmtMon(c.grossMon) },
    ' in total monthly retirement income.',
  ])

  if (c.annTax > 0) {
    sentences.push([
      "After taxes, you'd keep roughly ",
      { em: fmtMon(c.afterTaxMon) },
      ' per month — about ',
      { em: `${effectivePct}%` },
      ' of gross income going to federal taxes (',
      { em: `${fmt(c.annTax)} annually` },
      ').',
    ])
  } else {
    sentences.push([
      'At this income level, federal taxes are minimal in the model — your estimate may change as you add more taxable withdrawals or benefits.',
    ])
  }

  const drivers = describeTaxDrivers(td, taxConfig)
  if (drivers) sentences.push(drivers)

  return sentences.slice(0, 3)
}

function describeTaxDrivers(
  td: ComputedSnapshot['taxDetail'],
  taxConfig: TaxConfig,
): TaxPictureNarrative[number] | null {
  const pretaxLabel =
    accountLabelForWithdrawalBucket(taxConfig, 'pretax') ?? 'Pre-tax retirement'
  const brokerageLabel =
    accountLabelForWithdrawalBucket(taxConfig, 'brokerage') ?? 'Brokerage'
  const parts: string[] = []

  if (td.tradWd > 0) parts.push(`${pretaxLabel.toLowerCase()} withdrawals`)
  if (td.brkWd > 0) parts.push(`${brokerageLabel.toLowerCase()} draws`)
  if (td.ssTaxable > 0) parts.push(`taxable ${taxConfig.pensionLabel.toLowerCase()}`)
  if (td.ltcgTax > 0 && td.brkWd > 0) parts.push('taxable investment gains')

  if (parts.length === 0) return null
  if (parts.length === 1) {
    return ['Your tax estimate is driven mainly by ', { em: parts[0] }, '.']
  }
  const last = parts[parts.length - 1]
  const rest = parts.slice(0, -1).join(', ')
  return ['Your tax estimate reflects ', { em: rest }, ', and ', { em: last }, '.']
}

export function buildHarvestWithdrawalOrder(
  c: ComputedSnapshot,
  balances: AccountBucketBalanceSnapshot,
  taxConfig: TaxConfig,
  locale?: OnboardingRegionId | string | null,
): HarvestWithdrawalOrderItem[] {
  const region = normalizeOnboardingRegionId(locale) ?? 'us'
  const present = presentBuckets(balances, region)
  if (present.size === 0) return []

  return withdrawalBucketOrder(c.targetRetirementAge, true, region)
    .filter((bucket) => present.has(bucket))
    .map((bucket) => ({
      bucket,
      label: accountLabelForWithdrawalBucket(taxConfig, bucket) ?? bucket,
      explanation: WITHDRAWAL_REASON_BY_BUCKET[bucket],
    }))
}

export function buildHarvestTaxCallouts(
  c: ComputedSnapshot,
  balances: AccountBucketBalanceSnapshot,
): HarvestTaxCallout[] {
  const callouts: HarvestTaxCallout[] = []

  if (!c.ssConfigured) {
    callouts.push({
      id: 'ss-not-modeled',
      label: 'Social Security not added yet.',
      body: 'Up to 85% of your Social Security benefit may be taxable depending on your combined income. Adding it takes 30 seconds and will update your full tax estimate.',
    })
  }

  const showRothWarning = !balances.hasRothAccount || balances.roth <= 0
  if (showRothWarning) {
    callouts.push({
      id: 'roth-low',
      label: 'No Roth balance detected',
      body: 'A Roth conversion strategy before age 73 could meaningfully reduce your future RMDs.',
    })
  }

  const showPretaxHeavy =
    balances.pretax > 0 && balances.roth > 0 && balances.pretax > balances.roth * 3
  if (showPretaxHeavy) {
    callouts.push({
      id: 'pretax-heavy',
      label: 'Heavy pre-tax concentration',
      body: 'Consider gradual Roth conversions in lower-income years before retirement.',
    })
  }

  return callouts.slice(0, 3)
}
