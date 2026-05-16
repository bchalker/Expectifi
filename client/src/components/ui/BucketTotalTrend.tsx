import { useId } from 'react'
import type { BucketTrendDisplay } from '../../lib/bucketHoldingTrend'
import {
  formatBucketChangePercent,
  syntheticSparklineFromChangePercent,
} from '../../lib/bucketHoldingTrend'
import './BucketTotalTrend.scss'

type Tone = 'default' | 'on-dark'
type Layout = 'row' | 'stack'

type Props = {
  trend: BucketTrendDisplay | null | undefined
  className?: string
  /** Show sparkline area chart (off for account rows; on for subheader hero). */
  showChart?: boolean
  /** Hide the signed % label (chart only). */
  showPercent?: boolean
  tone?: Tone
  layout?: Layout
}

const STROKE_BY_TONE: Record<Tone, Record<'up' | 'down' | 'flat', string>> = {
  default: {
    up: 'var(--accent-text)',
    down: 'var(--danger)',
    flat: 'var(--text-faint)',
  },
  'on-dark': {
    up: '#5fd4a4',
    down: '#f87171',
    flat: 'rgba(255, 255, 255, 0.45)',
  },
}

export function resolveChartPoints(trend: BucketTrendDisplay): number[] | null {
  if (trend.sparkline != null && trend.sparkline.length >= 2) return trend.sparkline
  if (trend.changePercent != null && Number.isFinite(trend.changePercent)) {
    return syntheticSparklineFromChangePercent(trend.changePercent)
  }
  return null
}

function TrendChart({
  points,
  direction,
  tone,
  wide,
}: {
  points: number[]
  direction: 'up' | 'down' | 'flat'
  tone: Tone
  wide?: boolean
}) {
  const gradId = useId().replace(/:/g, '')
  const w = wide ? 180 : 80
  const h = wide ? 22 : 32
  const padY = wide ? 3 : 3
  const min = Math.min(...points)
  const max = Math.max(...points)
  const spread = max - min
  const range = spread < 0.05 ? 1 : spread
  const mid = (min + max) / 2
  const plotMin = spread < 0.05 ? mid - 0.5 : min
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w
    const y = h - ((p - plotMin) / range) * (h - padY * 2) - padY
    return { x, y }
  })
  const lineD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')
  const areaD = `${lineD} L${w},${h} L0,${h} Z`
  const stroke = STROKE_BY_TONE[tone][direction]
  const useGradient = tone === 'on-dark'

  return (
    <svg
      className={`bucket-total-trend__chart${wide ? ' bucket-total-trend__chart--hero' : ''}`}
      viewBox={`0 0 ${w} ${h}`}
      width={wide ? '100%' : w}
      height={h}
      preserveAspectRatio={wide ? 'none' : 'xMidYMid meet'}
      aria-hidden
    >
      {useGradient ? (
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.5" />
            <stop offset="72%" stopColor={stroke} stopOpacity="0.12" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
      ) : null}
      <path
        className="bucket-total-trend__chart-area"
        d={areaD}
        fill={useGradient ? `url(#${gradId})` : stroke}
        fillOpacity={useGradient ? 1 : 0.18}
      />
      <path
        className="bucket-total-trend__chart-line"
        d={lineD}
        fill="none"
        stroke={stroke}
        strokeWidth={wide ? 1.75 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Mini trend chart + optional signed change %. */
export function BucketTotalTrend({
  trend,
  className = '',
  showChart = false,
  showPercent = true,
  tone = 'default',
  layout = 'row',
}: Props) {
  if (!trend) return null

  const pct = trend.changePercent
  const hasPct = pct != null && Number.isFinite(pct)
  const points = showChart ? resolveChartPoints(trend) : null
  const hasChart = showChart && points != null && points.length >= 2

  if (!hasPct && !hasChart) return null

  const direction: 'up' | 'down' | 'flat' =
    hasPct && pct! > 0.005 ? 'up' : hasPct && pct! < -0.005 ? 'down' : 'flat'

  return (
    <div
      className={[
        'bucket-total-trend',
        `bucket-total-trend--${direction}`,
        `bucket-total-trend--${layout}`,
        tone === 'on-dark' ? 'bucket-total-trend--on-dark' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      title={hasPct ? formatBucketChangePercent(pct!) : 'Trend'}
    >
      {hasChart ? <TrendChart points={points} direction={direction} tone={tone} wide={tone === 'on-dark'} /> : null}
      {showPercent && hasPct ? (
        <span className="bucket-total-trend__pct">{formatBucketChangePercent(pct!)}</span>
      ) : null}
    </div>
  )
}
