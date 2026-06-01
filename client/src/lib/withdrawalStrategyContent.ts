import type { TaxConfig } from '../config/taxConfig'
import {
  accountLabelForWithdrawalBucket,
  formatMarginalRatesSummary,
  taxFreeWithdrawalLabels,
} from '../config/taxConfig'
import type { OnboardingRegionId } from './onboardingRegions'
import type { ComputedSnapshot } from './computeResults'
import { filingStatusDisplayLabel } from './filingStatus'
import { fmt, fmtK, fmtMon } from '../utils/format'
import { pensionConfigForLocale } from './localePensionConfig'
import { standardDeductionForFilingStatus, type FilingStatusId } from 'shared'

export type StrategyStep = {
  title: string
  tag: string
  tagColor: string
  body: string
}

export function withdrawalExplainerBody(_locale: OnboardingRegionId, taxConfig: TaxConfig): string {
  return taxConfig.withdrawalOrderNote
}

export function withdrawalExplainerDisclaimer(taxConfig: TaxConfig): string {
  return taxConfig.taxDisclaimer
}

export function buildWithdrawalStrategySteps(
  locale: OnboardingRegionId,
  taxConfig: TaxConfig,
  c: ComputedSnapshot,
  filingStatus: FilingStatusId,
): StrategyStep[] {
  const s = c.strategy
  const pension = pensionConfigForLocale(locale)
  const brokerageLabel = accountLabelForWithdrawalBucket(taxConfig, 'brokerage') ?? 'Taxable account'
  const pretaxLabel = accountLabelForWithdrawalBucket(taxConfig, 'pretax') ?? 'Pre-tax retirement'
  const taxFreeLabels = taxFreeWithdrawalLabels(taxConfig)
  const stdDed = standardDeductionForFilingStatus(filingStatus)
  const stdDedFmt = fmt(stdDed)
  const filingLabel = filingStatusDisplayLabel(filingStatus)
  const ratesSummary = formatMarginalRatesSummary(taxConfig)
  const room12 = s.rothConvRoom

  if (locale === 'us') {
    const steps: StrategyStep[] = [
      {
        title: `Cover fixed expenses with ${pension.stepTitle} + ${brokerageLabel}`,
        tag: 'Year 1 priority',
        tagColor: '#0F6E56',
        body: `Your combined ${pension.stepTitle.toLowerCase()} (${fmtMon(s.totalSS)}) plus ${brokerageLabel.toLowerCase()} withdrawals (${fmtMon(s.brkWdAnn / 12)}) covers the base. Use ${brokerageLabel.toLowerCase()} first for discretionary spending — ${taxConfig.capitalGainsNote.toLowerCase()}, and drawing from it first lets retirement accounts continue compounding.`,
      },
      {
        title: 'Draw HSA for all medical expenses',
        tag: 'Always first for medical',
        tagColor: '#EF9F27',
        body: `Before paying medical bills out of pocket, use the HSA. At ${fmtMon(s.hsaWdAnn / 12)}/mo projected, qualified expenses stay tax-free.`,
      },
      {
        title: `Pull ${taxFreeLabels.primary} for large one-time needs`,
        tag: 'Tax-free flexibility',
        tagColor: '#0F6E56',
        body: `${taxFreeLabels.primary} withdrawals (${fmtMon(s.rothWdAnn / 12)}/mo) are tax-free and do not affect ${pension.stepTitle} provisional income. Use them for lump-sum needs rather than larger ${pretaxLabel} withdrawals.`,
      },
      {
        title: `${pretaxLabel}: stay inside lower brackets`,
        tag: 'Tax-managed',
        tagColor: '#BA7517',
        body: `${pretaxLabel} withdrawals (${fmtMon(s.tradWdAnn / 12)}/mo) are ordinary income. After ${filingLabel.toLowerCase()} ${taxConfig.standardDeductionLabel?.toLowerCase() ?? 'standard deduction'} of ${stdDedFmt}, you have about ${fmt(room12)} of room before higher brackets. Marginal rates: ${ratesSummary}.`,
      },
    ]
    if (s.rothConvRoom > 500) {
      steps.push({
        title: `Convert up to ${fmt(s.rothConvRoom)}/yr from ${pretaxLabel} → ${taxFreeLabels.primary}`,
        tag: `Years ${c.targetRetirementAge}–72`,
        tagColor: '#2B6CB0',
        body: `Between age ${c.targetRetirementAge} and your first RMD at 73 is a common Roth conversion window. Converting within lower brackets moves money to tax-free growth and can reduce future RMDs.`,
      })
    }
    steps.push({
      title: `After 70: reassess ${pretaxLabel} drawdown`,
      tag: 'RMD planning',
      tagColor: '#BA7517',
      body: `At 73, RMDs apply to ${pretaxLabel} balances (~${fmtK(s.tradFvK)} projected). Drawing down strategically before RMDs can keep taxable income lower. Marginal rates: ${ratesSummary}.`,
    })
    return steps
  }

  if (locale === 'ca') {
    return [
      {
        title: `Cover essentials with ${pension.stepTitle} + ${brokerageLabel}`,
        tag: 'Year 1 priority',
        tagColor: '#0F6E56',
        body: `Combine ${pension.stepTitle} (${fmtMon(s.totalSS)}) with ${brokerageLabel} (${fmtMon(s.brkWdAnn / 12)}/mo). ${taxConfig.capitalGainsNote}. Draw non-registered assets before registered plans when possible.`,
      },
      {
        title: `Use ${pretaxLabel} / RRIF within your bracket`,
        tag: 'Tax-managed',
        tagColor: '#BA7517',
        body: `${pretaxLabel} and RRIF withdrawals (${fmtMon(s.tradWdAnn / 12)}/mo) are fully taxable. ${taxConfig.pensionTaxNote}. Federal marginal rates: ${ratesSummary} (provincial tax additional).`,
      },
      {
        title: `Preserve ${taxFreeLabels.primary} until last`,
        tag: 'Tax-free last',
        tagColor: '#0F6E56',
        body: `${taxConfig.taxFreeNote}. TFSA withdrawals (${fmtMon(s.rothWdAnn / 12)}/mo projected) do not affect GIS clawbacks the way RRSP withdrawals can.`,
      },
      {
        title: 'Plan for RRIF minimums',
        tag: taxConfig.mandatoryWithdrawalLabel ?? 'Mandatory withdrawals',
        tagColor: '#BA7517',
        body: `After converting an RRSP to an RRIF, minimum withdrawals begin at 71. Factor required amounts into your taxable income plan.`,
      },
    ]
  }

  return []
}
