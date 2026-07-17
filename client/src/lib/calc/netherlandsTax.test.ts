import { describe, expect, it } from 'vitest'
import {
  calcNetherlandsTax,
  generalTaxCredit,
  isAtNetherlandsAowAge,
} from './netherlandsTax'

describe('generalTaxCredit', () => {
  it('returns full credit below the phase-out start', () => {
    expect(generalTaxCredit(20_000, false)).toBe(3115)
    expect(generalTaxCredit(20_000, true)).toBe(1556)
  })

  it('phases out at €65,000 below AOW', () => {
    // 3115 − ((65000 − 29736) × 0.06398) = 858.80928…
    expect(generalTaxCredit(65_000, false)).toBeCloseTo(
      3115 - (65_000 - 29736) * 0.06398,
      8,
    )
  })

  it('is exhausted by the top of the second Box 1 bracket', () => {
    // Published endpoint ≈ €78,426 (same as second-bracket ceiling); residual cents OK.
    expect(generalTaxCredit(78_426, false)).toBeLessThan(1)
    expect(generalTaxCredit(78_426, true)).toBeLessThan(1)
    expect(generalTaxCredit(78_500, false)).toBe(0)
    expect(generalTaxCredit(78_500, true)).toBe(0)
  })
})

describe('calcNetherlandsTax', () => {
  it('uses the full first-bracket rate below AOW age, then subtracts general credit', () => {
    const result = calcNetherlandsTax(35_000, false)
    const bracketTax = 12_512.5
    const credit = generalTaxCredit(35_000, false)
    expect(result.totalTax).toBeCloseTo(Math.max(0, bracketTax - credit), 8)
    expect(result.effectiveRate).toBeCloseTo(result.totalTax / 35_000, 8)
  })

  it('uses the reduced first-bracket rate at AOW age, then subtracts general credit', () => {
    const result = calcNetherlandsTax(35_000, true)
    const bracketTax = 6_247.5
    const credit = generalTaxCredit(35_000, true)
    expect(result.totalTax).toBeCloseTo(Math.max(0, bracketTax - credit), 8)
    expect(result.effectiveRate).toBeCloseTo(result.totalTax / 35_000, 8)
  })

  it('applies bracket math plus general credit at €65,000 below AOW', () => {
    const belowAow = calcNetherlandsTax(65_000, false)
    const atAow = calcNetherlandsTax(65_000, true)

    const bracketBelow =
      38_883 * 0.3575 + (65_000 - 38_883) * 0.3756
    const creditBelow = generalTaxCredit(65_000, false)
    expect(creditBelow).toBeCloseTo(3115 - (65_000 - 29736) * 0.06398, 8)
    expect(belowAow.totalTax).toBeCloseTo(bracketBelow - creditBelow, 8)
    expect(belowAow.effectiveRate).toBeCloseTo(belowAow.totalTax / 65_000, 8)

    const bracketAtAow =
      38_883 * 0.1785 + (65_000 - 38_883) * 0.3756
    expect(atAow.totalTax).toBeCloseTo(
      Math.max(0, bracketAtAow - generalTaxCredit(65_000, true)),
      8,
    )
    expect(atAow.totalTax).toBeLessThan(belowAow.totalTax)
  })

  it('returns zero for non-positive or invalid income', () => {
    expect(calcNetherlandsTax(0, false)).toEqual({
      totalTax: 0,
      effectiveRate: 0,
    })
    expect(calcNetherlandsTax(Number.NaN, true)).toEqual({
      totalTax: 0,
      effectiveRate: 0,
    })
  })
})

describe('isAtNetherlandsAowAge', () => {
  it('switches to the AOW schedule at modeled age 67', () => {
    expect(isAtNetherlandsAowAge(66)).toBe(false)
    expect(isAtNetherlandsAowAge(67)).toBe(true)
  })
})
