import { ltcgTaxRate, normalizeFilingStatus, type FilingStatusId } from 'shared'

/** Top of 15% LTCG bracket — taxable income (2024, simplified). */
const LTCG_20_PCT_THRESHOLD_2024: Record<FilingStatusId, number> = {
  single: 518_900,
  marriedFilingJointly: 583_750,
  marriedFilingSeparately: 291_850,
  headOfHousehold: 551_350,
}

const LTCG_0_PCT_THRESHOLD_2024: Record<FilingStatusId, number> = {
  single: 47_025,
  marriedFilingJointly: 94_050,
  marriedFilingSeparately: 47_025,
  headOfHousehold: 63_000,
}

/** Marginal LTCG bracket label from projected retirement ordinary income + brokerage gains. */
export function ltcgMarginalBracketLabel(
  ordinaryIncome: number,
  brkGain: number,
  filingStatus: FilingStatusId,
): '0%' | '15%' | '20%' {
  const id = normalizeFilingStatus(filingStatus)
  const total = Math.max(0, ordinaryIncome) + Math.max(0, brkGain)
  if (total <= LTCG_0_PCT_THRESHOLD_2024[id]) return '0%'
  if (total > LTCG_20_PCT_THRESHOLD_2024[id]) return '20%'
  const rate = ltcgTaxRate(ordinaryIncome, brkGain, filingStatus)
  return rate <= 0 ? '0%' : '15%'
}
