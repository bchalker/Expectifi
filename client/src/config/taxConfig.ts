import type { OnboardingRegionId } from '../lib/onboardingRegions'
import { normalizeOnboardingRegionId } from '../lib/onboardingRegions'
import type { WithdrawalDisplayBucket } from '../lib/withdrawalDisplayOrder'

export type TaxTreatment = 'pretax' | 'roth' | 'taxable' | 'taxfree' | 'pension'

export type TaxConfigAccountType = {
  key: string
  label: string
  taxTreatment: TaxTreatment
  withdrawalNote: string
}

export type TaxConfig = {
  currencyCode: string
  filingStatuses: string[]
  defaultFilingStatus: string
  accountTypes: TaxConfigAccountType[]
  pensionLabel: string
  pensionTaxNote: string
  capitalGainsNote: string
  taxFreeNote: string
  standardDeduction: number | null
  standardDeductionLabel: string | null
  /** US only — deduction by filing status label. */
  standardDeductionByStatus?: Record<string, number>
  marginalRates: { upTo: number; rate: number }[]
  withdrawalOrderNote: string
  taxDisclaimer: string
  /** Age when mandatory registered withdrawals apply (US RMD, CA RRIF), or null. */
  mandatoryWithdrawalAge: number | null
  mandatoryWithdrawalLabel: string | null
}

const US_MARGINAL: TaxConfig['marginalRates'] = [
  { upTo: 23_200, rate: 0.1 },
  { upTo: 94_300, rate: 0.12 },
  { upTo: 201_050, rate: 0.22 },
  { upTo: 383_900, rate: 0.24 },
  { upTo: 487_450, rate: 0.32 },
  { upTo: 731_200, rate: 0.35 },
  { upTo: Infinity, rate: 0.37 },
]

const CA_MARGINAL: TaxConfig['marginalRates'] = [
  { upTo: 55_867, rate: 0.15 },
  { upTo: 111_733, rate: 0.205 },
  { upTo: 173_205, rate: 0.26 },
  { upTo: 246_752, rate: 0.29 },
  { upTo: Infinity, rate: 0.33 },
]

export const TAX_CONFIG_BY_LOCALE: Record<OnboardingRegionId, TaxConfig> = {
  us: {
    currencyCode: 'USD',
    filingStatuses: ['Single', 'Married Filing Jointly', 'Married Filing Separately', 'Head of Household'],
    defaultFilingStatus: 'Married Filing Jointly',
    accountTypes: [
      {
        key: 'brokerage',
        label: 'Brokerage',
        taxTreatment: 'taxable',
        withdrawalNote: 'Taxable account — draw first; LTCG rates often lower than ordinary income',
      },
      {
        key: 'pretax_401k_ira',
        label: 'Pre-tax 401k/IRA',
        taxTreatment: 'pretax',
        withdrawalNote: 'Taxed as ordinary income on withdrawal',
      },
      {
        key: 'roth_ira',
        label: 'Roth IRA',
        taxTreatment: 'roth',
        withdrawalNote: 'Qualified withdrawals are tax-free',
      },
      {
        key: 'hsa',
        label: 'HSA',
        taxTreatment: 'taxfree',
        withdrawalNote: 'Tax-free for qualified medical expenses',
      },
    ],
    pensionLabel: 'Social Security',
    pensionTaxNote: 'Taxable up to 85% depending on combined income',
    capitalGainsNote: 'Long-term rate 0%, 15%, or 20% depending on income',
    taxFreeNote: 'Roth IRA and HSA withdrawals can be tax-free when qualified',
    standardDeduction: 29_200,
    standardDeductionLabel: 'Standard deduction',
    standardDeductionByStatus: {
      Single: 14_600,
      'Married Filing Jointly': 29_200,
      'Married Filing Separately': 14_600,
      'Head of Household': 21_900,
    },
    marginalRates: US_MARGINAL,
    withdrawalOrderNote: 'Brokerage first, then pre-tax retirement accounts, then Roth. Use HSA for qualified medical expenses.',
    taxDisclaimer: 'This is an estimate. Consult a US tax professional.',
    mandatoryWithdrawalAge: 73,
    mandatoryWithdrawalLabel: 'Required minimum distributions (RMDs)',
  },
  ca: {
    currencyCode: 'CAD',
    filingStatuses: ['Single', 'Married/Common-law'],
    defaultFilingStatus: 'Single',
    accountTypes: [
      {
        key: 'brokerage',
        label: 'Non-registered',
        taxTreatment: 'taxable',
        withdrawalNote: 'Non-registered account — draw first; 50% of capital gains included in income',
      },
      {
        key: 'pretax_401k_ira',
        label: 'RRSP',
        taxTreatment: 'pretax',
        withdrawalNote: 'Fully taxable as ordinary income on withdrawal',
      },
      {
        key: 'ca_rrif',
        label: 'RRIF',
        taxTreatment: 'pretax',
        withdrawalNote: 'Minimum withdrawals required after conversion from RRSP',
      },
      {
        key: 'roth_ira',
        label: 'TFSA',
        taxTreatment: 'taxfree',
        withdrawalNote: 'Tax-free withdrawals — preserve until last when possible',
      },
      {
        key: 'pension',
        label: 'Workplace pension',
        taxTreatment: 'pension',
        withdrawalNote: 'Employer pension — taxed per plan rules on withdrawal',
      },
    ],
    pensionLabel: 'CPP / OAS',
    pensionTaxNote: 'CPP and OAS are fully taxable as ordinary income',
    capitalGainsNote: '50% of capital gains included in taxable income (inclusion rate)',
    taxFreeNote: 'TFSA withdrawals are tax-free and do not affect benefit clawbacks',
    standardDeduction: 15_705,
    standardDeductionLabel: 'Basic personal amount',
    marginalRates: CA_MARGINAL,
    withdrawalOrderNote: 'Non-registered first, then RRSP/RRIF, then TFSA last',
    taxDisclaimer: 'Federal rates only. Provincial tax varies. Consult a Canadian tax advisor.',
    mandatoryWithdrawalAge: 71,
    mandatoryWithdrawalLabel: 'RRIF minimum withdrawals',
  },
}

export function taxConfigForLocale(locale: OnboardingRegionId | string | null | undefined): TaxConfig {
  const id = normalizeOnboardingRegionId(locale) ?? 'us'
  return TAX_CONFIG_BY_LOCALE[id]
}

export function standardDeductionForFilingStatus(config: TaxConfig, filingStatus: string): number | null {
  if (config.standardDeductionByStatus?.[filingStatus] != null) {
    return config.standardDeductionByStatus[filingStatus]
  }
  return config.standardDeduction
}

export function formatMarginalRatesSummary(config: TaxConfig): string {
  const pct = config.marginalRates.map((b) => `${Math.round(b.rate * 100)}%`)
  return [...new Set(pct)].join(' / ')
}

/** Map internal portfolio buckets to locale account labels (first match by treatment). */
/** Short tax line under account name on portfolio bucket rows (e.g. "Taxed as ordinary income"). */
export function accountTaxSubtextForWithdrawalBucket(
  config: TaxConfig,
  bucket: WithdrawalDisplayBucket,
): string | null {
  const treatment: TaxTreatment | null =
    bucket === 'brokerage'
      ? 'taxable'
      : bucket === 'pretax'
        ? 'pretax'
        : bucket === 'roth'
          ? 'roth'
          : bucket === 'hsa'
            ? 'taxfree'
            : null
  if (!treatment) return null
  if (bucket === 'hsa' && config.currencyCode !== 'USD') return null

  const match =
    bucket === 'roth'
      ? config.accountTypes.find((a) => a.taxTreatment === 'roth') ??
        config.accountTypes.find((a) => a.taxTreatment === 'taxfree')
      : config.accountTypes.find((a) => a.taxTreatment === treatment)
  if (treatment === 'taxable') {
    return 'Taxed as capital gains'
  }

  const note = match?.withdrawalNote?.trim()
  if (!note) return null

  const dash = note.indexOf('—')
  if (dash > 0) return note.slice(0, dash).trim()
  const onWithdrawal = note.indexOf(' on withdrawal')
  if (onWithdrawal > 0) return note.slice(0, onWithdrawal).trim()
  if (note.length > 36) return `${note.slice(0, 33).trim()}…`
  return note
}

export function accountLabelForWithdrawalBucket(
  config: TaxConfig,
  bucket: WithdrawalDisplayBucket,
): string | null {
  const treatment: TaxTreatment | null =
    bucket === 'brokerage'
      ? 'taxable'
      : bucket === 'pretax'
        ? 'pretax'
        : bucket === 'roth'
          ? 'roth'
          : bucket === 'hsa'
            ? 'taxfree'
            : null
  if (!treatment) return null
  if (bucket === 'hsa' && config.currencyCode !== 'USD') return null
  if (bucket === 'roth') {
    const roth = config.accountTypes.find((a) => a.taxTreatment === 'roth')
    const taxfree = config.accountTypes.find((a) => a.taxTreatment === 'taxfree')
    return roth?.label ?? taxfree?.label ?? null
  }
  const match = config.accountTypes.find((a) => a.taxTreatment === treatment)
  return match?.label ?? null
}

export function localeSupportsWithdrawalBucket(
  locale: OnboardingRegionId,
  bucket: WithdrawalDisplayBucket,
): boolean {
  const config = taxConfigForLocale(locale)
  const treatments = new Set(config.accountTypes.map((a) => a.taxTreatment))
  switch (bucket) {
    case 'brokerage':
      return treatments.has('taxable')
    case 'pretax':
      return treatments.has('pretax') || treatments.has('pension')
    case 'roth':
      return treatments.has('roth') || (treatments.has('taxfree') && locale !== 'us')
    case 'hsa':
      return locale === 'us' && treatments.has('taxfree')
    default:
      return false
  }
}

export function taxFreeWithdrawalLabels(config: TaxConfig): { primary: string; secondary: string | null } {
  const roth = config.accountTypes.find((a) => a.taxTreatment === 'roth')
  const taxfree = config.accountTypes.find((a) => a.taxTreatment === 'taxfree')
  if (config.currencyCode === 'USD' && taxfree) {
    return {
      primary: roth?.label ?? 'Tax-advantaged',
      secondary: taxfree.label,
    }
  }
  if (taxfree) return { primary: taxfree.label, secondary: roth?.label ?? null }
  if (roth) return { primary: roth.label, secondary: null }
  return { primary: 'Tax-advantaged accounts', secondary: null }
}
