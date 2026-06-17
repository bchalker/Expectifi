import { describe, expect, it } from 'vitest'
import { qolComparisonParts } from './cityDetailTabUtils'

describe('qolComparisonParts', () => {
  it('describes point differences against the US Average', () => {
    expect(qolComparisonParts(76, 84)).toEqual({
      pillLabel: '8 points below',
      suffixBeforeBenchmark: 'the ',
      benchmarkPhrase: 'US Average',
    })
    expect(qolComparisonParts(96, 84)).toEqual({
      pillLabel: '12 points above',
      suffixBeforeBenchmark: 'the ',
      benchmarkPhrase: 'US Average',
    })
    expect(qolComparisonParts(84, 84)).toEqual({
      pillLabel: 'Same as',
      suffixBeforeBenchmark: 'the ',
      benchmarkPhrase: 'US Average',
    })
    expect(qolComparisonParts(85, 84)).toEqual({
      pillLabel: '1 point above',
      suffixBeforeBenchmark: 'the ',
      benchmarkPhrase: 'US Average',
    })
  })
})
