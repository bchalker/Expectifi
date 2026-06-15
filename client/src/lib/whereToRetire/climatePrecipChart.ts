import type { MonthlyClimate } from '../../lib/api/openMeteo'

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

export function monthlyPrecipTotalsMm(monthly: MonthlyClimate[]): number[] {
  return monthly.map((m, i) => (m.avgPrecipMm ?? 0) * DAYS_IN_MONTH[i])
}

export function hasMonthlyPrecipData(monthly: MonthlyClimate[]): boolean {
  return monthly.length === 12 && monthly.every((m) => m.avgPrecipMm != null && Number.isFinite(m.avgPrecipMm))
}

export type WetSeasonRun = {
  startIndex: number
  endIndex: number
  monthIndices: number[]
  totalMm: number
}

/**
 * Longest circular contiguous run of months whose total precip exceeds the
 * annual monthly average. Returns null when no month exceeds average.
 */
export function findWetSeasonRun(monthlyTotals: number[]): WetSeasonRun | null {
  if (monthlyTotals.length !== 12) return null
  const annualMonthlyAvg = monthlyTotals.reduce((sum, v) => sum + v, 0) / 12
  const wet = monthlyTotals.map((total) => total > annualMonthlyAvg)
  if (!wet.some(Boolean)) return null

  let bestStart = 0
  let bestLen = 0

  for (let start = 0; start < 12; start += 1) {
    let len = 0
    for (let offset = 0; offset < 12; offset += 1) {
      if (wet[(start + offset) % 12]) len += 1
      else break
    }
    if (len > bestLen) {
      bestLen = len
      bestStart = start
    }
  }

  if (bestLen === 0) return null

  const monthIndices = Array.from({ length: bestLen }, (_, i) => (bestStart + i) % 12)
  const totalMm = monthIndices.reduce((sum, idx) => sum + monthlyTotals[idx], 0)
  return {
    startIndex: monthIndices[0],
    endIndex: monthIndices[monthIndices.length - 1],
    monthIndices,
    totalMm,
  }
}

export function wetSeasonLinearSegments(monthIndices: number[]): { start: number; end: number }[] {
  if (!monthIndices.length) return []
  const sorted = [...monthIndices].sort((a, b) => a - b)
  const isWrap =
    sorted.length > 1 && sorted[0] === 0 && sorted[sorted.length - 1] === 11 && sorted.length < 12

  if (!isWrap) {
    return [{ start: sorted[0], end: sorted[sorted.length - 1] }]
  }

  let gapAt = 0
  for (let i = 0; i < sorted.length - 1; i += 1) {
    if (sorted[i + 1] - sorted[i] > 1) {
      gapAt = i
      break
    }
  }

  const lowRun = sorted.slice(0, gapAt + 1)
  const highRun = sorted.slice(gapAt + 1)
  return [
    { start: highRun[0], end: highRun[highRun.length - 1] },
    { start: lowRun[0], end: lowRun[lowRun.length - 1] },
  ]
}

export function roundPrecipAxisMax(maxMm: number): number {
  if (maxMm <= 50) return 50
  if (maxMm <= 100) return 100
  return Math.ceil(maxMm / 50) * 50
}
