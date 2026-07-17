import { describe, expect, it } from 'vitest'
import {
  calcPortugalTax,
  PT_PENSION_SPECIFIC_DEDUCTION_2026,
} from './portugalTax'

describe('calcPortugalTax', () => {
  it('applies the Cat. H pension deduction before brackets at €50,000', () => {
    const gross = 50_000
    const afterDeduction = gross - PT_PENSION_SPECIFIC_DEDUCTION_2026
    expect(afterDeduction).toBeCloseTo(45_412.91, 2)

    const result = calcPortugalTax(gross)
    // Effective vs gross — should land in the ~22–25% reference band.
    expect(result.effectiveRate).toBeGreaterThanOrEqual(0.22)
    expect(result.effectiveRate).toBeLessThanOrEqual(0.25)
    expect(result.solidarityAmount).toBe(0)
  })

  it('floors taxable income at zero when gross is below the deduction', () => {
    expect(calcPortugalTax(1_000)).toEqual({
      irsAmount: 0,
      solidarityAmount: 0,
      municipalAmount: 0,
      totalTax: 0,
      effectiveRate: 0,
    })
  })

  it('returns zero for non-positive or invalid income', () => {
    expect(calcPortugalTax(0).totalTax).toBe(0)
    expect(calcPortugalTax(Number.NaN).totalTax).toBe(0)
  })
})
