import {
  accountLabelForWithdrawalBucket,
  localeSupportsWithdrawalBucket,
  type TaxConfig,
} from '../config/taxConfig'
import type { CalculatorInputs, ComputedSnapshot } from './computeResults'
import { filingStatusDisplayLabel } from './filingStatus'
import type { OnboardingRegionId } from './onboardingRegions'
import { normalizeOnboardingRegionId } from './onboardingRegions'
import { fmt, fmtMon } from '../utils/format'
import type { WithdrawalDisplayBucket } from './withdrawalDisplayOrder'
import type { TaxPictureNarrative } from './taxBreakdownTaxPicture'

/** Share of brokerage balance treated as taxable distributions/gains per year during accumulation. */
const BROKERAGE_TAXABLE_YIELD_RATE = 0.02
/** Blended federal rate on taxable brokerage yield (dividends + realized gains). */
const BROKERAGE_DRAG_EFFECTIVE_RATE = 0.18

export const FORECAST_TAX_EMPTY_GUIDANCE =
  'Add account balances and monthly savings to see how taxes affect your growth phase.'

export type ForecastTaxRawInputs = {
  phase: 'growth'
  monthlySave: number
  annualSave: number
  tradBal: number
  rothBal: number
  hsaBal: number
  brkBal: number
  retBal: number
  retRate: number
  brkRate: number
  yearsToRetirement: number
  projectedRetFV: number
  projectedBrkFV: number
  wdRate: number
  /** Values from retirement-withdrawal tax path — not used for growth display. */
  retirementPathAnnWd: number
  retirementPathTotalSSMonthly: number
  retirementPathTradWd: number
  retirementPathSsTaxable: number
  retirementPathTotalTax: number
  retirementPathOrdTax: number
  incomeModeFlag: boolean
}

export type ForecastGrowthTaxDetail = {
  annualContributions: number
  brokerageTaxDragAnnual: number
  taxShelteredBalance: number
  taxableBrokerageBalance: number
}

export type ForecastContributionOrderItem = {
  bucket: WithdrawalDisplayBucket
  label: string
  explanation: string
}

export type ForecastTaxCallout = {
  id: string
  label: string
  body: string
}

const CONTRIBUTION_REASON_BY_BUCKET: Record<WithdrawalDisplayBucket, string> = {
  hsa: 'Fund first when eligible — contributions are deductible, growth is tax-free, and qualified medical withdrawals avoid tax entirely.',
  pretax: 'Pre-tax 401(k) / IRA dollars lower taxable income now and compound tax-deferred while you are still working.',
  roth: 'After-tax Roth contributions buy tax-free growth — especially valuable if you expect higher brackets in retirement.',
  brokerage: 'Use for overflow savings — flexible, but dividends and realized gains create annual tax drag during accumulation.',
}

function contributionBucketOrder(locale: OnboardingRegionId): WithdrawalDisplayBucket[] {
  if (locale === 'ca') return ['roth', 'pretax', 'brokerage']
  return ['hsa', 'pretax', 'roth', 'brokerage']
}

export function buildForecastTaxRawInputs(
  c: ComputedSnapshot,
  inputs: CalculatorInputs,
  incomeModeFlag: boolean,
): ForecastTaxRawInputs {
  return {
    phase: 'growth',
    monthlySave: c.save,
    annualSave: c.save * 12,
    tradBal: c.tradBal,
    rothBal: c.rothBal,
    hsaBal: c.hsaBal,
    brkBal: c.brkBal,
    retBal: c.retBal,
    retRate: inputs.retRate,
    brkRate: inputs.brkRate,
    yearsToRetirement: c.yearsToRetirement,
    projectedRetFV: c.retFV,
    projectedBrkFV: c.brkFV,
    wdRate: inputs.wdRate,
    retirementPathAnnWd: c.annWd,
    retirementPathTotalSSMonthly: c.totalSS,
    retirementPathTradWd: c.taxDetail.tradWd,
    retirementPathSsTaxable: c.taxDetail.ssTaxable,
    retirementPathTotalTax: c.taxDetail.totalTax,
    retirementPathOrdTax: c.taxDetail.ordTax,
    incomeModeFlag,
  }
}

/** Dev-only: log inputs before growth tax breakdown is rendered. */
export function logForecastTaxBreakdownRawInputs(raw: ForecastTaxRawInputs): void {
  if (!import.meta.env.DEV) return
  console.info('[Forecast Tax Breakdown] raw values before growth tax model', raw)
  console.info(
    '[Forecast Tax Breakdown] retirement-path taxDetail is NOT used for growth display',
    {
      ssTaxable: raw.retirementPathSsTaxable,
      totalTax: raw.retirementPathTotalTax,
      tradWd: raw.retirementPathTradWd,
      note:
        'These come from projected retirement withdrawals × wdRate and guaranteed income — wrong for accumulation.',
    },
  )
}

export function calcForecastGrowthTaxDetail(
  c: ComputedSnapshot,
  inputs: CalculatorInputs,
): ForecastGrowthTaxDetail {
  const brokerageTaxDragAnnual =
    c.brkBal > 0
      ? c.brkBal * inputs.brkRate * BROKERAGE_TAXABLE_YIELD_RATE * BROKERAGE_DRAG_EFFECTIVE_RATE
      : 0

  return {
    annualContributions: c.save * 12,
    brokerageTaxDragAnnual,
    taxShelteredBalance: c.tradBal + c.rothBal + c.hsaBal,
    taxableBrokerageBalance: c.brkBal,
  }
}

export function forecastTaxGrowthReady(c: ComputedSnapshot): boolean {
  return c.hasPortfolioBalances && (c.save > 0 || c.retBal > 0 || c.brkBal > 0)
}

export function buildForecastTaxPictureNarrative(
  c: ComputedSnapshot,
  inputs: CalculatorInputs,
  taxConfig: TaxConfig,
): TaxPictureNarrative | null {
  if (!forecastTaxGrowthReady(c)) return null

  const detail = calcForecastGrowthTaxDetail(c, inputs)
  const filingLabel = filingStatusDisplayLabel(c.filingStatus).toLowerCase()
  const brokerageLabel =
    accountLabelForWithdrawalBucket(taxConfig, 'brokerage')?.toLowerCase() ??
    'taxable brokerage'
  const sentences: TaxPictureNarrative = []

  sentences.push([
    'While you are still accumulating, this forecast focuses on contribution tax treatment and taxable-account drag — not retirement withdrawal taxes.',
  ])

  if (detail.annualContributions > 0) {
    sentences.push([
      'You are saving about ',
      { em: `${fmtMon(c.save)}/month` },
      ' (',
      { em: `${fmt(detail.annualContributions)}/year` },
      ') into tax-advantaged retirement accounts that compound without annual federal tax on growth.',
    ])
  } else {
    sentences.push([
      'You have not entered monthly retirement contributions yet — add savings to see how tax-advantaged compounding affects your plan.',
    ])
  }

  if (detail.taxableBrokerageBalance > 0) {
    if (detail.brokerageTaxDragAnnual > 0) {
      sentences.push([
        'Your ',
        { em: brokerageLabel },
        ' balance of ',
        { em: fmt(detail.taxableBrokerageBalance) },
        ' may create roughly ',
        { em: `${fmt(detail.brokerageTaxDragAnnual)}/year` },
        ' in estimated federal tax drag at your growth assumptions — sheltered accounts avoid that annual bite.',
      ])
    } else {
      sentences.push([
        'Your taxable brokerage balance is modest in the model, so annual tax drag during accumulation is minimal.',
      ])
    }
  } else if (detail.taxShelteredBalance > 0) {
    sentences.push([
      'Your portfolio is entirely in tax-sheltered accounts as modeled — growth compounds without annual federal tax drag while you work.',
    ])
  }

  if (sentences.length < 3 && detail.taxShelteredBalance > 0) {
    sentences.push([
      'As a ',
      { em: filingLabel },
      ' filer, prioritizing tax-advantaged space before taxable investing can reduce lifetime taxes.',
    ])
  }

  return sentences.slice(0, 3)
}

export function buildForecastContributionOrder(
  _c: ComputedSnapshot,
  taxConfig: TaxConfig,
  locale?: OnboardingRegionId | string | null,
): ForecastContributionOrderItem[] {
  const region = normalizeOnboardingRegionId(locale) ?? 'us'
  const order = contributionBucketOrder(region).filter((bucket) =>
    localeSupportsWithdrawalBucket(region, bucket),
  )

  return order.map((bucket) => ({
    bucket,
    label: accountLabelForWithdrawalBucket(taxConfig, bucket) ?? bucket,
    explanation: CONTRIBUTION_REASON_BY_BUCKET[bucket],
  }))
}

export function buildForecastTaxCallouts(
  c: ComputedSnapshot,
  inputs: CalculatorInputs,
  taxConfig: TaxConfig,
): ForecastTaxCallout[] {
  const callouts: ForecastTaxCallout[] = []
  const detail = calcForecastGrowthTaxDetail(c, inputs)
  const brokerageLabel =
    accountLabelForWithdrawalBucket(taxConfig, 'brokerage') ?? 'Brokerage'

  if (c.save <= 0 && c.hasPortfolioBalances) {
    callouts.push({
      id: 'no-contributions',
      label: 'No monthly savings entered',
      body: 'Contributions to tax-advantaged accounts during your working years are the main lever for reducing lifetime taxes.',
    })
  }

  if (
    detail.taxableBrokerageBalance > 0 &&
    detail.taxShelteredBalance > 0 &&
    detail.taxableBrokerageBalance > detail.taxShelteredBalance
  ) {
    callouts.push({
      id: 'taxable-heavy',
      label: 'Heavy taxable concentration',
      body: `More wealth sits in ${brokerageLabel.toLowerCase()} than in sheltered accounts — consider shifting new savings tax-advantaged first.`,
    })
  }

  if (detail.brokerageTaxDragAnnual >= 500) {
    callouts.push({
      id: 'brokerage-drag',
      label: 'Taxable account drag',
      body: `Estimated ${fmt(detail.brokerageTaxDragAnnual)}/year in federal tax drag on taxable growth — sheltered accounts avoid this while you accumulate.`,
    })
  }

  if (c.tradBal > 0 && c.rothBal <= 0 && localeSupportsWithdrawalBucket('us', 'roth')) {
    callouts.push({
      id: 'no-roth',
      label: 'No Roth balance yet',
      body: 'Adding Roth contributions diversifies future tax flexibility and can reduce reliance on taxable withdrawals later.',
    })
  }

  return callouts.slice(0, 3)
}
