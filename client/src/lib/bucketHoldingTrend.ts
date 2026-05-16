import {
  isFidelityPendingActivityRow,
  normalizeFidelityImportSymbol,
  type FidelityPositionRow,
} from './fidelityCsv'
import type { HoldingQuote } from './holdingQuotes'

export type BucketTrendDisplay = {
  changePercent: number | null
  sparkline: number[] | null
}

function blendSparklines(weights: { weight: number; series: number[] }[]): number[] | null {
  if (!weights.length) return null
  const len = Math.min(...weights.map((w) => w.series.length))
  if (len < 2) return null
  const totalW = weights.reduce((s, w) => s + w.weight, 0)
  if (totalW <= 0) return null
  const out: number[] = []
  for (let i = 0; i < len; i++) {
    let n = 0
    for (const { weight, series } of weights) {
      n += (series[i] ?? 0) * weight
    }
    out.push(n / totalW)
  }
  return out
}

function normalizeSparkline(series: number[]): number[] | null {
  const clean = series.filter((v) => Number.isFinite(v))
  if (clean.length < 2) return null
  const min = Math.min(...clean)
  const max = Math.max(...clean)
  const range = max - min || 1
  return clean.map((v) => (v - min) / range)
}

/** Value-weighted daily % and blended 5d sparkline for a tax bucket or brokerage slice. */
export function computeBucketTrendDisplay(
  positions: FidelityPositionRow[],
  quoteMap: Map<string, HoldingQuote>,
): BucketTrendDisplay {
  const sparkWeights: { weight: number; series: number[] }[] = []
  let livePctNum = 0
  let livePctDen = 0
  let csvPctNum = 0
  let csvPctDen = 0

  for (const r of positions) {
    if (isFidelityPendingActivityRow(r)) continue
    const val = r.currentValue
    if (!(val > 0)) continue

    const sym = normalizeFidelityImportSymbol(r.symbol).toUpperCase()
    const q = sym ? quoteMap.get(sym) : undefined
    if (q) {
      livePctNum += q.changePct * val
      livePctDen += val
      const norm = q.sparkline?.length ? normalizeSparkline(q.sparkline) : null
      if (norm) sparkWeights.push({ weight: val, series: norm })
    }

    if (r.dailyChangePercent != null && Number.isFinite(r.dailyChangePercent)) {
      csvPctNum += r.dailyChangePercent * val
      csvPctDen += val
    }
  }

  const changePercent =
    livePctDen > 0 ? livePctNum / livePctDen : csvPctDen > 0 ? csvPctNum / csvPctDen : null
  let sparkline = blendSparklines(sparkWeights)
  if (!sparkline && changePercent != null && Number.isFinite(changePercent)) {
    sparkline = syntheticSparklineFromChangePercent(changePercent)
  }

  return { changePercent, sparkline }
}

/** Gentle 5-point curve from day-change % when live quote history is unavailable. */
export function syntheticSparklineFromChangePercent(pct: number): number[] {
  const n = 5
  const tilt = Math.max(-1, Math.min(1, pct / 4))
  const raw = Array.from({ length: n }, (_, i) => 0.5 + tilt * (i / (n - 1) - 0.5))
  const min = Math.min(...raw)
  const max = Math.max(...raw)
  const range = max - min || 1
  return raw.map((v) => (v - min) / range)
}

export function formatBucketChangePercent(pct: number): string {
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(2)}%`
}

/** Normalized sparkline between two dollar amounts (smoothstep curve). */
export function buildAmountsSparkline(start: number, end: number, points = 6): number[] {
  const raw = Array.from({ length: points }, (_, i) => {
    const t = i / (points - 1)
    const eased = t * t * (3 - 2 * t)
    return start + (end - start) * eased
  })
  const min = Math.min(...raw)
  const max = Math.max(...raw)
  const range = max - min || 1
  return raw.map((v) => (v - min) / range)
}

/** Trend display from a prior amount to the current hero value. */
export function buildTrendFromAmounts(start: number, end: number): BucketTrendDisplay | null {
  if (!(start > 0) || !Number.isFinite(end)) return null
  const sparkline = buildAmountsSparkline(start, end)
  const changePercent = ((end - start) / start) * 100
  return { changePercent, sparkline }
}
