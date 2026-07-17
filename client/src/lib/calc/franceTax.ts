/**
 * France personal income tax (impôt sur le revenu) — 2026 barème for US Social Security.
 *
 * Treaty Art. 20: US Social Security is taxable by France (not the US) at ordinary
 * progressive rates. Brackets are the official 2026 scale (revenus 2025), per one part
 * of quotient familial — we model a single filer (1 part). Family quotient is deferred.
 *
 * Source: Service-Public / LOI n° 2026-103 (Finance Act 2026), +0.9% inflation revaluation.
 *
 * ---------------------------------------------------------------------------
 * FRANCE_PENSION_TYPE_FOLLOWUP (blocked on product decision, not research)
 * ---------------------------------------------------------------------------
 * Private pensions (Art. 18) use these same brackets; US government pensions (Art. 19)
 * are often reserved to US taxation. Expectifi has no government-vs-private pension
 * field yet — do not silently assume private treatment for non-SS income. Non-SS uses
 * a labeled stub + caveat until that product decision lands.
 *
 * Deferred this pass: CSM (~6.5%), prélèvements sociaux on capital income (~18.6%).
 */

/** 2026 IR brackets per part (cumulative upper bounds in EUR). */
export const FR_IR_BRACKETS_2026 = [
  { upTo: 11600, rate: 0 },
  { upTo: 29579, rate: 0.11 },
  { upTo: 84577, rate: 0.3 },
  { upTo: 181917, rate: 0.41 },
  { upTo: Infinity, rate: 0.45 },
] as const

/**
 * Conservative stub rate on non-SS retirement income when pension type is unknown.
 * Display copy must not present this as a resolved French rate.
 */
export const FR_NON_SS_STUB_RATE = 0.25

/** Reference SS annual EUR when income context is missing (mid retiree planning). */
export const FR_REFERENCE_SS_EUR = 20_000

export type FranceSSTaxResult = {
  irsAmount: number
  totalTax: number
  effectiveRate: number
}

function progressiveIr(taxableIncomeEUR: number): number {
  if (taxableIncomeEUR <= 0) return 0
  let tax = 0
  let prev = 0
  for (const bracket of FR_IR_BRACKETS_2026) {
    const slice = Math.min(taxableIncomeEUR, bracket.upTo) - prev
    if (slice <= 0) break
    tax += slice * bracket.rate
    prev = bracket.upTo
    if (taxableIncomeEUR <= bracket.upTo) break
  }
  return tax
}

/**
 * French IR on US Social Security (Art. 20) — progressive brackets, single filer (1 part).
 * Treats `ssIncomeEUR` as net taxable for the barème (no abatement/deduction step yet).
 */
export function calcFranceSSTax(ssIncomeEUR: number): FranceSSTaxResult {
  const income = Number.isFinite(ssIncomeEUR) ? Math.max(0, ssIncomeEUR) : 0
  const irsAmount = progressiveIr(income)
  return {
    irsAmount,
    totalTax: irsAmount,
    effectiveRate: income > 0 ? irsAmount / income : 0,
  }
}

/**
 * Blended France effective rate: real Art. 20 tax on SS + stub on remaining income.
 * `annualSsUsd` is clamped to `annualGrossUsd`. When SS is omitted, falls back to the
 * non-SS stub on the full gross (same honesty as the prior flat placeholder).
 */
export function franceBlendedEffectiveRate(
  annualGrossUsd: number,
  annualSsUsd: number | undefined,
  usdToEurFn: (usd: number) => number,
  eurToUsdFn: (eur: number) => number,
): number {
  const gross = Number.isFinite(annualGrossUsd) ? Math.max(0, annualGrossUsd) : 0
  if (gross <= 0) return 0

  const ssUsd =
    annualSsUsd != null && Number.isFinite(annualSsUsd)
      ? Math.min(Math.max(0, annualSsUsd), gross)
      : 0
  const nonSsUsd = gross - ssUsd

  const ssTaxUsd = ssUsd > 0 ? eurToUsdFn(calcFranceSSTax(usdToEurFn(ssUsd)).totalTax) : 0
  const nonSsTaxUsd = nonSsUsd * FR_NON_SS_STUB_RATE

  return (ssTaxUsd + nonSsTaxUsd) / gross
}

/** Short badge / tooltip — SS is calculated; pension type is not. */
export const FRANCE_TAX_DISCLOSURE_SHORT =
  'Social Security taxed by France under progressive brackets. Pension/investment portion uses a planning stub — government vs private pensions are not distinguished yet.'

/** Longer panel copy. */
export const FRANCE_TAX_DISCLOSURE_LONG =
  "US Social Security is taxed by France under the treaty (Art. 20) using 2026 progressive brackets. Other retirement income is 0–45% depending on amount and pension type; US government pensions may be reserved to US taxation (Art. 19). CSM and prélèvements sociaux can apply on top and are not modeled here. Not tax advice."
