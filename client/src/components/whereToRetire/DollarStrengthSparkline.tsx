import {
  formatUsdToLocalRate,
  type DollarStrengthSeries,
} from '../../lib/api/exchangeRates'
import './DollarStrengthSparkline.scss'

type Props = {
  series: DollarStrengthSeries
}

export function DollarStrengthSparkline({ series }: Props) {
  const { points, trendPct, currencyCode, historyAvailable } = series
  const lastRate = points[points.length - 1]?.rate
  if (lastRate == null || lastRate <= 0) {
    return <span className="wtr-fx-spark wtr-fx-spark--na">—</span>
  }

  const rateLabel = `1 USD ≈ ${formatUsdToLocalRate(lastRate, currencyCode)} ${currencyCode}`

  if (!historyAvailable || points.length < 2) {
    return (
      <div className="wtr-fx-spark-stack">
        <span className="wtr-fx-spark__rate">{rateLabel}</span>
        <span className="wtr-fx-spark__note">Live rate</span>
      </div>
    )
  }

  const w = 72
  const h = 22
  const rates = points.map((p) => p.rate)
  const min = Math.min(...rates)
  const max = Math.max(...rates)
  const span = max - min || 1

  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w
      const y = h - ((p.rate - min) / span) * (h - 4) - 2
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const usdStronger = trendPct >= 0

  return (
    <div className="wtr-fx-spark-stack">
      <span className="wtr-fx-spark__rate">{rateLabel}</span>
      <span className={`wtr-fx-spark wtr-fx-spark--${usdStronger ? 'up' : 'down'}`}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
          <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <span className="wtr-fx-spark__pct" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {usdStronger ? '+' : ''}
          {trendPct.toFixed(1)}% (10y)
        </span>
      </span>
    </div>
  )
}
