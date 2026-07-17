/**
 * Portugal personal income tax (IRS) — Art. 68 / 68-A CIRS, 2026 brackets.
 *
 * Implemented: Cat. H pension specific deduction (8.54 × IAS), progressive IRS,
 * and solidarity surcharge on rendimento coletável after that deduction.
 * Deferred: municipal IRS participation credit (Lei 73/2013 — up to 5% of IRS
 * returned when the municipality retains less than 5%). The corporate
 * "derrama municipal" (0–1.5% on profits) does NOT apply to individual IRS;
 * do not model it as an add-on surcharge on personal tax due.
 *
 * Not modeled: itemized deductions (health, education, PPR contributions),
 * family quotient, regional (Azores/Madeira) tables, and IFICI/NHR legacy.
 *
 * Educational planning estimate only — not tax advice.
 */

/** 8.54 × IAS (EUR 537.13), 2026 — Cat. H pension specific deduction. */
export const PT_PENSION_SPECIFIC_DEDUCTION_2026 = 4587.09

/** Tooltip / badge hover — Portugal effective rate after the standard pension deduction. */
export const PORTUGAL_TAX_DISCLOSURE_SHORT =
  'Estimated after Portugal’s standard pension deduction. Other itemized deductions (health, education, PPR) are not modeled, so your actual rate may still be a bit lower.'

/** Tax panel / detail — honesty about remaining unmodeled deductions. */
export const PORTUGAL_TAX_DISCLOSURE_LONG =
  "This estimate applies Portugal's 2026 progressive tax brackets after the standard Cat. H pension deduction (8.54 × IAS). Itemized deductions such as health, education, and PPR contributions are not modeled, so real filers may owe a bit less. Treat this as a planning estimate, not a final number. Not tax advice — consult a Portuguese tax professional for your actual liability."

/** 2026 mainland IRS brackets (Art. 68 CIRS) — cumulative upper bounds in EUR. */
export const PT_IRS_BRACKETS_2026 = [
  { upTo: 8342, rate: 0.125 },
  { upTo: 12587, rate: 0.157 },
  { upTo: 17838, rate: 0.212 },
  { upTo: 23089, rate: 0.241 },
  { upTo: 29397, rate: 0.311 },
  { upTo: 43090, rate: 0.349 },
  { upTo: 46566, rate: 0.431 },
  { upTo: 86634, rate: 0.446 },
  { upTo: Infinity, rate: 0.48 },
] as const

/** Solidarity surcharge (Art. 68-A CIRS) on the same taxable base. */
export const PT_SOLIDARITY_SURCHARGE = [
  { from: 80000, to: 250000, rate: 0.025 },
  { from: 250000, to: Infinity, rate: 0.05 },
] as const

/**
 * Reference taxable EUR income for displays when caller has no income context.
 * ~€50k is a mid retiree planning level cited in destination tax copy.
 */
export const PT_REFERENCE_TAXABLE_EUR = 50_000

export type PortugalTaxResult = {
  irsAmount: number
  solidarityAmount: number
  /** Always 0 — municipal individual credit deferred (see file header). */
  municipalAmount: number
  totalTax: number
  /** Effective rate vs gross taxable income (before the pension deduction). */
  effectiveRate: number
}

function progressiveIrs(taxableIncomeEUR: number): number {
  if (taxableIncomeEUR <= 0) return 0
  let tax = 0
  let prev = 0
  for (const bracket of PT_IRS_BRACKETS_2026) {
    const slice = Math.min(taxableIncomeEUR, bracket.upTo) - prev
    if (slice <= 0) break
    tax += slice * bracket.rate
    prev = bracket.upTo
    if (taxableIncomeEUR <= bracket.upTo) break
  }
  return tax
}

function solidaritySurcharge(taxableIncomeEUR: number): number {
  if (taxableIncomeEUR <= 0) return 0
  let amount = 0
  for (const band of PT_SOLIDARITY_SURCHARGE) {
    if (taxableIncomeEUR <= band.from) break
    const upper = Math.min(taxableIncomeEUR, band.to)
    amount += (upper - band.from) * band.rate
  }
  return amount
}

/**
 * Portugal IRS + solidarity on taxable pension income in EUR.
 * Applies the Cat. H pension specific deduction before bracket math.
 */
export function calcPortugalTax(taxableIncomeEUR: number): PortugalTaxResult {
  const gross = Number.isFinite(taxableIncomeEUR) ? Math.max(0, taxableIncomeEUR) : 0
  const income = Math.max(0, gross - PT_PENSION_SPECIFIC_DEDUCTION_2026)
  const irsAmount = progressiveIrs(income)
  const solidarityAmount = solidaritySurcharge(income)
  const municipalAmount = 0
  const totalTax = irsAmount + solidarityAmount + municipalAmount
  return {
    irsAmount,
    solidarityAmount,
    municipalAmount,
    totalTax,
    effectiveRate: gross > 0 ? totalTax / gross : 0,
  }
}
