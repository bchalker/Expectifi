import { describe, expect, it } from 'vitest'
import {
  formatTravelAdvisoriesAsOfDate,
  travelAdvisoriesAsOfMessage,
  getTravelAdvisoriesFetchedAt,
} from '../lib/travelAdvisories'
import {
  getHealthcareRatingsLastReviewed,
  healthcareRatingsLastReviewedMessage,
} from '../data/destinationHealthcare'
import {
  getTeleportFallbacksLastReviewed,
  teleportFallbacksLastReviewedMessage,
} from '../data/teleportFallbacks'
import {
  climateNormalsFreshnessMessage,
  getClimateNormalsGenerated,
  getClimateNormalsSourcePeriod,
} from './climateNormals'

describe('travel advisories freshness', () => {
  it('formats metadata.fetchedAt for chip copy', () => {
    const fetchedAt = getTravelAdvisoriesFetchedAt()
    expect(fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(formatTravelAdvisoriesAsOfDate(fetchedAt)).toMatch(/\d{4}/)
    expect(travelAdvisoriesAsOfMessage(fetchedAt)).toMatch(
      /^Advisory data as of .+.$/,
    )
  })
})

describe('healthcare / teleport lastReviewed', () => {
  it('exposes structured 2025-01 stamps', () => {
    expect(getHealthcareRatingsLastReviewed()).toBe('2025-01')
    expect(healthcareRatingsLastReviewedMessage()).toBe(
      'Healthcare ratings last reviewed January 2025.',
    )
    expect(getTeleportFallbacksLastReviewed()).toBe('2025-01')
    expect(teleportFallbacksLastReviewedMessage()).toBe(
      'Cost-of-living / QoL fallback scores last reviewed January 2025.',
    )
  })
})

describe('climate normals dual stamp', () => {
  it('keeps baseline period and regen date distinct', () => {
    expect(getClimateNormalsSourcePeriod()).toBe('2011-2020')
    expect(getClimateNormalsGenerated()).toBe('2026-06')
    expect(climateNormalsFreshnessMessage()).toBe(
      'Climate normals based on 2011-2020 averages, refreshed June 2026.',
    )
  })
})
