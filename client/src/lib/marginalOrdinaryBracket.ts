import { normalizeFilingStatus, type FilingStatusId } from 'shared'

const ORDINARY_BRACKETS_2024: Record<FilingStatusId, { upTo: number; rate: number }[]> = {
  single: [
    { upTo: 11_600, rate: 0.1 },
    { upTo: 47_150, rate: 0.12 },
    { upTo: 100_525, rate: 0.22 },
    { upTo: 191_950, rate: 0.24 },
    { upTo: 243_725, rate: 0.32 },
    { upTo: 609_350, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
  marriedFilingJointly: [
    { upTo: 23_200, rate: 0.1 },
    { upTo: 94_300, rate: 0.12 },
    { upTo: 201_050, rate: 0.22 },
    { upTo: 383_900, rate: 0.24 },
    { upTo: 487_450, rate: 0.32 },
    { upTo: 731_200, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
  marriedFilingSeparately: [
    { upTo: 11_600, rate: 0.1 },
    { upTo: 47_150, rate: 0.12 },
    { upTo: 100_525, rate: 0.22 },
    { upTo: 191_950, rate: 0.24 },
    { upTo: 243_725, rate: 0.32 },
    { upTo: 365_600, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
  headOfHousehold: [
    { upTo: 16_550, rate: 0.1 },
    { upTo: 63_100, rate: 0.12 },
    { upTo: 100_500, rate: 0.22 },
    { upTo: 191_950, rate: 0.24 },
    { upTo: 243_700, rate: 0.32 },
    { upTo: 609_350, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
}

/** Marginal federal ordinary-income bracket label from taxable ordinary income. */
export function marginalOrdinaryBracketLabel(
  taxableIncome: number,
  filingStatus: FilingStatusId,
): string {
  const id = normalizeFilingStatus(filingStatus)
  const income = Math.max(0, taxableIncome)
  const brackets = ORDINARY_BRACKETS_2024[id]

  for (const { upTo, rate } of brackets) {
    if (income <= upTo) {
      return `${Math.round(rate * 100)}%`
    }
  }

  return '37%'
}
