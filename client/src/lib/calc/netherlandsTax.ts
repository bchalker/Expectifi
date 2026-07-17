/**
 * Netherlands Box 1 income tax — 2026 brackets + algemene heffingskorting.
 *
 * Pension withdrawals are modeled as taxable Box 1 income. The first bracket is
 * lower at Dutch state pension age (AOW) because the AOW premium no longer applies.
 * This uses the common post-1946 AOW schedule and a planning threshold of age 67.
 *
 * Credits: applies algemene heffingskorting (general tax credit) after bracket tax.
 * Intentionally does NOT apply arbeidskorting (labour tax credit) — that credit
 * only applies to employment / self-employment income; retirees on pension income
 * do not qualify. Excluding it is correct for this model, not a gap.
 *
 * Educational planning estimate only — not tax advice.
 */

export const NL_AOW_AGE = 67

export const NL_BOX1_BELOW_AOW_2026 = [
  { upTo: 38_883, rate: 0.3575 },
  { upTo: 78_426, rate: 0.3756 },
  { upTo: Infinity, rate: 0.495 },
] as const

export const NL_BOX1_AT_AOW_2026 = [
  { upTo: 38_883, rate: 0.1785 },
  { upTo: 78_426, rate: 0.3756 },
  { upTo: Infinity, rate: 0.495 },
] as const

/** Algemene heffingskorting — below AOW age, 2026. Reaches EUR 0 at EUR 78,426. */
export const NL_GENERAL_CREDIT_BELOW_AOW_2026 = {
  max: 3115,
  phaseOutStart: 29736,
  phaseOutRate: 0.06398,
} as const

/** Algemene heffingskorting — at/above AOW age, 2026. Reaches EUR 0 at EUR 78,426. */
export const NL_GENERAL_CREDIT_AT_AOW_2026 = {
  max: 1556,
  phaseOutStart: 29736,
  phaseOutRate: 0.03195,
} as const

export const NL_REFERENCE_TAXABLE_EUR = 50_000

export type NetherlandsTaxResult = {
  totalTax: number
  effectiveRate: number
}

/**
 * Algemene heffingskorting — subtracted from tax owed (not from taxable income).
 * Arbeidskorting is intentionally excluded for retiree / pension modeling.
 */
export function generalTaxCredit(
  taxableIncomeEUR: number,
  isAtStatePensionAge: boolean,
): number {
  const cfg = isAtStatePensionAge
    ? NL_GENERAL_CREDIT_AT_AOW_2026
    : NL_GENERAL_CREDIT_BELOW_AOW_2026
  if (taxableIncomeEUR <= cfg.phaseOutStart) return cfg.max
  const reduction = (taxableIncomeEUR - cfg.phaseOutStart) * cfg.phaseOutRate
  return Math.max(0, cfg.max - reduction)
}

function box1BracketTax(
  taxableIncomeEUR: number,
  isAtStatePensionAge: boolean,
): number {
  const brackets = isAtStatePensionAge
    ? NL_BOX1_AT_AOW_2026
    : NL_BOX1_BELOW_AOW_2026

  let totalTax = 0
  let previousUpperBound = 0

  for (const bracket of brackets) {
    const taxableInBracket =
      Math.min(taxableIncomeEUR, bracket.upTo) - previousUpperBound
    if (taxableInBracket <= 0) break

    totalTax += taxableInBracket * bracket.rate
    previousUpperBound = bracket.upTo
    if (taxableIncomeEUR <= bracket.upTo) break
  }

  return totalTax
}

export function calcNetherlandsTax(
  taxableIncomeEUR: number,
  isAtStatePensionAge: boolean,
): NetherlandsTaxResult {
  const income = Number.isFinite(taxableIncomeEUR)
    ? Math.max(0, taxableIncomeEUR)
    : 0
  const bracketTax = box1BracketTax(income, isAtStatePensionAge)
  const credit = generalTaxCredit(income, isAtStatePensionAge)
  const totalTax = Math.max(0, bracketTax - credit)

  return {
    totalTax,
    effectiveRate: income > 0 ? totalTax / income : 0,
  }
}

export function isAtNetherlandsAowAge(modeledAge?: number): boolean {
  return modeledAge != null && Number.isFinite(modeledAge)
    ? modeledAge >= NL_AOW_AGE
    : false
}

export const NETHERLANDS_TAX_DISCLOSURE_SHORT =
  'Estimated after the general Dutch tax credit (algemene heffingskorting). The labour credit does not apply to pension income and is not included.'

export const NETHERLANDS_TAX_DISCLOSURE_LONG =
  'This estimate applies the Netherlands’ 2026 Box 1 brackets and subtracts algemene heffingskorting (general tax credit), using the reduced first bracket at age 67 or older. Arbeidskorting (labour tax credit) is intentionally excluded — it applies to employment income, not pension income for retirees. The uncommon pre-1946 threshold variant is not modeled. Not tax advice.'
