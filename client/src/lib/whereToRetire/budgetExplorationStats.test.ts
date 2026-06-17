import { describe, expect, it } from 'vitest'
import {
  BUDGET_SLIDER_MAX_MULTIPLIER,
  BUDGET_SLIDER_MIN_MULTIPLIER,
  clampExplorationIncome,
  explorationIncomeMax,
  explorationIncomeMin,
  incomeSliderPct,
} from './budgetExplorationStats'

describe('explorationIncomeMin', () => {
  it('scales with projected income at the min multiplier', () => {
    expect(explorationIncomeMin(1_261)).toBe(750)
    expect(explorationIncomeMin(6_000)).toBe(3_600)
  })

  it('rounds down to the nearest $50 step', () => {
    expect(explorationIncomeMin(1_261)).toBe(
      Math.floor((1_261 * BUDGET_SLIDER_MIN_MULTIPLIER) / 50) * 50,
    )
  })
})

describe('explorationIncomeMax', () => {
  it('scales with projected income at the max multiplier', () => {
    expect(explorationIncomeMax(1_261)).toBe(1_800)
    expect(explorationIncomeMax(6_000)).toBe(8_400)
  })

  it('rounds up to the nearest $50 step', () => {
    expect(explorationIncomeMax(1_261)).toBe(
      Math.ceil((1_261 * BUDGET_SLIDER_MAX_MULTIPLIER) / 50) * 50,
    )
  })
})

describe('clampExplorationIncome', () => {
  it('clamps to income-relative bounds', () => {
    expect(clampExplorationIncome(500, 1_261)).toBe(750)
    expect(clampExplorationIncome(9_000, 1_261)).toBe(1_800)
    expect(clampExplorationIncome(5_000, 6_000)).toBe(5_000)
  })
})

describe('incomeSliderPct', () => {
  it('maps values across the income-relative range', () => {
    const min = explorationIncomeMin(1_261)
    const max = explorationIncomeMax(1_261)
    expect(incomeSliderPct(min, min, max)).toBe(0)
    expect(incomeSliderPct(max, min, max)).toBe(100)
    expect(incomeSliderPct(1_261, min, max)).toBeCloseTo(
      ((1_261 - min) / (max - min)) * 100,
      5,
    )
  })
})
