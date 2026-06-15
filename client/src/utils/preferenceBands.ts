import type { PreferenceLevelCopy } from './preferenceFactors'

export interface PriorityBand {
  min: number
  max: number
  title: string
  description: string
}

/** Map a 0–10 slider value to the legacy 0–5 band index (for styling and copy). */
export function valueToBandIndex(value: number): 0 | 1 | 2 | 3 | 4 | 5 {
  const v = Math.max(0, Math.min(10, Math.round(value)))
  if (v === 0) return 0
  if (v <= 2) return 1
  if (v <= 4) return 2
  if (v <= 6) return 3
  if (v <= 9) return 4
  return 5
}

/** Default band widths for six labeled options: 0 | 1-2 | 3-4 | 5-6 | 7-9 | 10 */
const SIX_OPTION_BAND_RANGES: Array<{ min: number; max: number }> = [
  { min: 0, max: 0 },
  { min: 1, max: 2 },
  { min: 3, max: 4 },
  { min: 5, max: 6 },
  { min: 7, max: 9 },
  { min: 10, max: 10 },
]

export function bandsFromLevels(levels: PreferenceLevelCopy[]): PriorityBand[] {
  const count = levels.length
  if (count === 6) {
    return levels.map((level, index) => ({
      ...SIX_OPTION_BAND_RANGES[index],
      title: level.badge,
      description: level.sub,
    }))
  }

  const ranges = distributeBandRanges(count)
  return levels.map((level, index) => ({
    ...ranges[index],
    title: level.badge,
    description: level.sub,
  }))
}

function distributeBandRanges(optionCount: number): Array<{ min: number; max: number }> {
  if (optionCount <= 1) return [{ min: 0, max: 10 }]
  if (optionCount === 2) return [{ min: 0, max: 4 }, { min: 5, max: 10 }]

  const ranges: Array<{ min: number; max: number }> = []
  let position = 0

  for (let index = 0; index < optionCount; index += 1) {
    const isFirst = index === 0
    const isLast = index === optionCount - 1
    const isExtraBand = index === optionCount - 2

    let width = 2
    if (isFirst || isLast) width = 1
    if (isExtraBand) {
      const used = ranges.reduce((sum, range) => sum + (range.max - range.min + 1), 0)
      width = Math.max(1, 11 - used)
    }

    const min = position
    const max = Math.min(10, position + width - 1)
    ranges.push({ min, max })
    position = max + 1
  }

  return ranges
}

export function bandForValue(bands: PriorityBand[], value: number): PriorityBand {
  const v = Math.max(0, Math.min(10, Math.round(value)))
  return (
    bands.find((band) => v >= band.min && v <= band.max) ??
    bands[bands.length - 1] ??
    bands[0]
  )
}

/** Convert legacy 0–5 step storage to 0–10 slider value (preserves scoring weight). */
export function legacyStepToValue(step: number): number {
  const clamped = Math.max(0, Math.min(5, Math.round(step)))
  return clamped * 2
}

export function isPreferenceDealbreaker(value: number): boolean {
  return value >= 10
}

export function isPreferenceHighPriority(value: number): boolean {
  return value >= 7 && value < 10
}

export function isPreferenceImportant(value: number): boolean {
  return value >= 5 && value < 7
}

export function isPreferenceMinor(value: number): boolean {
  return value >= 1 && value < 5
}
