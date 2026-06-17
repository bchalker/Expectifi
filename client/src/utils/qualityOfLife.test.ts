import { describe, expect, it } from 'vitest'
import {
  formatQoLDisplayScore,
  getUsQoLNormalizedBenchmark,
  getUsQualityOfLifeData,
  isQoLUsBaselineComparable,
  QOL_METRIC_BAND_CONFIGS,
  QOL_SCORE_BAND_RANGES,
  qolMetricBandSegments,
  qolMetricMarkerPercent,
  resolveQoLMetricBand,
  resolveQoLScoreBand,
  type QoLMetricKey,
} from './qualityOfLife'

const QOL_BAND_METRICS: QoLMetricKey[] = [
  'overall',
  'healthcare',
  'safety',
  'climate',
  'pollution',
  'purchasing',
  'traffic',
]

const BOUNDARY_SCORES = [0, 24, 25, 26, 49, 50, 51, 74, 75, 76, 100]

function expectedBandIndex(score: number): number {
  if (score <= 24) return 0
  if (score <= 49) return 1
  if (score <= 74) return 2
  return 3
}

describe('QoL score band configs', () => {
  it('uses shared quartile ranges for all six factors', () => {
    for (const metric of QOL_BAND_METRICS) {
      const { bands } = QOL_METRIC_BAND_CONFIGS[metric]
      expect(bands).toHaveLength(4)
      bands.forEach((band, index) => {
        expect(band.min).toBe(QOL_SCORE_BAND_RANGES[index]!.min)
        expect(band.max).toBe(QOL_SCORE_BAND_RANGES[index]!.max)
      })
    }
  })
})

describe('resolveQoLScoreBand', () => {
  it('maps boundary scores to the expected quartile index', () => {
    const safetyBands = QOL_METRIC_BAND_CONFIGS.safety.bands
    expect(resolveQoLScoreBand(0, safetyBands).label).toBe('High risk')
    expect(resolveQoLScoreBand(24, safetyBands).label).toBe('High risk')
    expect(resolveQoLScoreBand(25, safetyBands).label).toBe('Caution')
    expect(resolveQoLScoreBand(26, safetyBands).label).toBe('Caution')
    expect(resolveQoLScoreBand(50, safetyBands).label).toBe('Reasonable')
    expect(resolveQoLScoreBand(74, safetyBands).label).toBe('Reasonable')
    expect(resolveQoLScoreBand(75, safetyBands).label).toBe('Very safe')
    expect(resolveQoLScoreBand(100, safetyBands).label).toBe('Very safe')
  })
})

describe('resolveQoLMetricBand', () => {
  for (const metric of QOL_BAND_METRICS) {
    describe(metric, () => {
      const segments = qolMetricBandSegments(metric)

      it('maps the lowest score to the first band label', () => {
        expect(resolveQoLMetricBand(metric, 0).label).toBe(segments[0]!.label)
        expect(resolveQoLMetricBand(metric, 0).bandIndex).toBe(0)
      })

      it('maps the highest score to the last band label', () => {
        expect(resolveQoLMetricBand(metric, 100).label).toBe(segments[3]!.label)
        expect(resolveQoLMetricBand(metric, 100).bandIndex).toBe(3)
      })

      for (const score of BOUNDARY_SCORES) {
        it(`score ${score} aligns marker position with the bolded band label`, () => {
          const resolved = resolveQoLMetricBand(metric, score)
          const markerPct = qolMetricMarkerPercent(metric, score)
          const index = expectedBandIndex(score)

          expect(resolved.bandIndex).toBe(index)
          expect(resolved.label).toBe(segments[index]!.label)
          expect(markerPct).toBe(Math.round(score))
          expect(Math.min(3, Math.floor(markerPct / 25))).toBe(index)
        })
      }
    })
  }

  it('matches Costa Rica (Alajuela) country-level regression scores', () => {
    expect(resolveQoLMetricBand('pollution', 18).label).toBe('High pollution')
    expect(resolveQoLMetricBand('traffic', 55).label).toBe('Moderate')
    expect(resolveQoLMetricBand('safety', 52).label).toBe('Reasonable')
    expect(resolveQoLMetricBand('climate', 82).label).toBe('Excellent')
    expect(resolveQoLMetricBand('purchasing', 58).label).toBe('Moderate')
    expect(resolveQoLMetricBand('healthcare', 72).label).toBe('Good')
  })

  it('rounds fractional scores before band lookup', () => {
    expect(resolveQoLMetricBand('safety', 53.5).label).toBe('Reasonable')
    expect(resolveQoLMetricBand('traffic', 33.9).label).toBe('Heavy')
    expect(formatQoLDisplayScore(57.6)).toBe('58')
  })
})

describe('US QoL baseline helpers', () => {
  it('exposes Numbeo-sourced US benchmark from the dataset', () => {
    const us = getUsQualityOfLifeData()
    expect(us?.source).toBe('numbeo_2024')
    expect(us?.quality_of_life_index).toBe(185.1)
    expect(getUsQoLNormalizedBenchmark()).toBe(84)
  })

  it('only treats numbeo_2024 destinations as US-baseline comparable', () => {
    expect(isQoLUsBaselineComparable('numbeo_2024')).toBe(true)
    expect(isQoLUsBaselineComparable('world_bank_proxy')).toBe(false)
    expect(isQoLUsBaselineComparable(undefined)).toBe(false)
  })
})
