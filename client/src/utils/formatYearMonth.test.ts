import { describe, expect, it } from 'vitest'
import { formatYearMonthLabel } from './formatYearMonth'

describe('formatYearMonthLabel', () => {
  it('formats YYYY-MM as Month YYYY', () => {
    expect(formatYearMonthLabel('2026-05')).toBe('May 2026')
    expect(formatYearMonthLabel('2025-01')).toBe('January 2025')
    expect(formatYearMonthLabel('2025-12')).toBe('December 2025')
  })

  it('returns the input unchanged when not YYYY-MM', () => {
    expect(formatYearMonthLabel('May 2026')).toBe('May 2026')
    expect(formatYearMonthLabel('2026-13')).toBe('2026-13')
    expect(formatYearMonthLabel('')).toBe('')
  })
})
