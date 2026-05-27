import {
  isFidelityPendingActivityRow,
  type FidelityPositionRow,
} from './fidelityCsv'

export type BucketTrendDisplay = {
  changePercent: number | null
}

/** Value-weighted daily % from imported holding rows (CSV daily change columns). */
export function computeBucketTrendDisplay(positions: FidelityPositionRow[]): BucketTrendDisplay {
  let csvPctNum = 0
  let csvPctDen = 0

  for (const r of positions) {
    if (isFidelityPendingActivityRow(r)) continue
    const val = r.currentValue
    if (!(val > 0)) continue

    if (r.dailyChangePercent != null && Number.isFinite(r.dailyChangePercent)) {
      csvPctNum += r.dailyChangePercent * val
      csvPctDen += val
    }
  }

  const changePercent = csvPctDen > 0 ? csvPctNum / csvPctDen : null
  return { changePercent }
}

export function formatBucketChangePercent(pct: number): string {
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(2)}%`
}
