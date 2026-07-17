/** Layered retirement tax explanation for Where to Retire comparison grid. */

import { formatYearMonthLabel } from '../utils/formatYearMonth'

export type RetirementIncomeBreakdown = {
  socialSecurity: string
  retirement401k: string
  pension: string
  investmentIncome: string
}

export type RetirementTaxDetail = {
  /** Full local rate description (expanded detail). */
  localRateLabel: string
  /** Collapsed hero line (rate %, short phrase). */
  localRateHeadline: string
  /** e.g. "state tax" under the rate for US states. */
  localRateSubtitle?: string
  usFederalApplies: boolean
  taxTreatyWithUS: boolean
  foreignTaxCreditApplies: boolean
  territorialSystem: boolean
  effectiveCombinedNote: string
  retirementIncomeBreakdown: RetirementIncomeBreakdown
  plainLanguageSummary: string
  lastVerified: string
  sourceUrl: string
}

export const TAX_DETAIL_DISCLAIMER =
  'Tax rules are complex and change frequently. This is an estimate for general planning only. Consult a qualified cross-border tax professional before making any decisions.'

export const US_FEDERAL_NOTE = 'US federal tax applies on worldwide income for US citizens'

/** DataConfidenceNote message for a tax detail / state entry verification stamp. */
export function taxRatesLastVerifiedMessage(lastVerified: string): string {
  return `Tax rates last verified ${formatYearMonthLabel(lastVerified)}.`
}
