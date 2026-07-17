import { describe, expect, it, vi } from 'vitest'
import { formatYearMonthLabel } from './formatYearMonth'
import { taxRatesLastVerifiedMessage } from '../data/retirementTaxDetail'

describe('formatYearMonthLabel (shared)', () => {
  it('is reused by tax verification copy', () => {
    expect(taxRatesLastVerifiedMessage('2025-01')).toBe(
      'Tax rates last verified January 2025.',
    )
  })
})

describe('getGettingThereTabSourceFooter', () => {
  it('reads last_updated from getting-there.json metadata', async () => {
    vi.resetModules()
    vi.doMock('../data/getting-there.json', () => ({
      default: {
        metadata: {
          last_updated: '2024-11',
          disclaimer: 'test',
          us_hub_note: 'test',
        },
        countries: {},
      },
    }))
    const { getGettingThereTabSourceFooter } = await import('./gettingThere')
    expect(getGettingThereTabSourceFooter()).toContain(
      `last updated ${formatYearMonthLabel('2024-11')}`,
    )
    expect(getGettingThereTabSourceFooter()).toContain('last updated November 2024')
    vi.doUnmock('../data/getting-there.json')
    vi.resetModules()
  })

  it('matches the live JSON metadata stamp', async () => {
    const data = await import('../data/getting-there.json')
    const metaUpdated = data.default.metadata.last_updated
    const { getGettingThereTabSourceFooter } = await import('./gettingThere')
    expect(getGettingThereTabSourceFooter()).toContain(
      `last updated ${formatYearMonthLabel(metaUpdated)}`,
    )
  })
})
