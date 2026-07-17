import { describe, expect, it, vi } from 'vitest'
import { dataLastUpdatedMessage } from '../components/ui/DataFreshnessNote'
import { formatYearMonthLabel } from './formatYearMonth'

describe('dataLastUpdatedMessage', () => {
  it('formats YYYY-MM via the shared year-month helper', () => {
    expect(dataLastUpdatedMessage('2026-05')).toBe('Data last updated May 2026.')
    expect(dataLastUpdatedMessage('2024-11')).toBe(
      `Data last updated ${formatYearMonthLabel('2024-11')}.`,
    )
  })
})

describe('dataset last_updated getters', () => {
  it('QoL last_updated comes from quality-of-life.json metadata', async () => {
    vi.resetModules()
    vi.doMock('../data/quality-of-life.json', () => ({
      default: {
        metadata: { last_updated: '2023-08' },
        countries: {},
      },
    }))
    const { getQualityOfLifeLastUpdated } = await import('./qualityOfLife')
    expect(getQualityOfLifeLastUpdated()).toBe('2023-08')
    expect(dataLastUpdatedMessage(getQualityOfLifeLastUpdated())).toBe(
      'Data last updated August 2023.',
    )
    vi.doUnmock('../data/quality-of-life.json')
    vi.resetModules()
  })

  it('tax-visa last_updated comes from retirement-tax-visa.json metadata', async () => {
    vi.resetModules()
    vi.doMock('../data/retirement-tax-visa.json', () => ({
      default: {
        metadata: { last_updated: '2024-02', disclaimer: '', sources: [] },
        countries: {},
      },
    }))
    const { getTaxVisaLastUpdated } = await import('./taxVisa')
    expect(getTaxVisaLastUpdated()).toBe('2024-02')
    expect(dataLastUpdatedMessage(getTaxVisaLastUpdated())).toBe(
      'Data last updated February 2024.',
    )
    vi.doUnmock('../data/retirement-tax-visa.json')
    vi.resetModules()
  })

  it('English proficiency last_updated comes from english-proficiency.json metadata', async () => {
    vi.resetModules()
    vi.doMock('../data/english-proficiency.json', () => ({
      default: {
        metadata: {
          last_updated: '2025-09',
          scale: '',
          source: '',
          filter_threshold: '',
        },
        countries: {},
      },
    }))
    const { getEnglishProficiencyLastUpdated } = await import('./englishProficiency')
    expect(getEnglishProficiencyLastUpdated()).toBe('2025-09')
    expect(dataLastUpdatedMessage(getEnglishProficiencyLastUpdated())).toBe(
      'Data last updated September 2025.',
    )
    vi.doUnmock('../data/english-proficiency.json')
    vi.resetModules()
  })

  it('live getters match each file’s own metadata.last_updated', async () => {
    const qolJson = await import('../data/quality-of-life.json')
    const taxJson = await import('../data/retirement-tax-visa.json')
    const engJson = await import('../data/english-proficiency.json')
    const { getQualityOfLifeLastUpdated } = await import('./qualityOfLife')
    const { getTaxVisaLastUpdated } = await import('./taxVisa')
    const { getEnglishProficiencyLastUpdated } = await import('./englishProficiency')

    expect(getQualityOfLifeLastUpdated()).toBe(qolJson.default.metadata.last_updated)
    expect(getTaxVisaLastUpdated()).toBe(taxJson.default.metadata.last_updated)
    expect(getEnglishProficiencyLastUpdated()).toBe(
      engJson.default.metadata.last_updated,
    )
  })
})
