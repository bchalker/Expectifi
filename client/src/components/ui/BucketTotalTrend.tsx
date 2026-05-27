import type { BucketTrendDisplay } from '../../lib/bucketHoldingTrend'
import { formatBucketChangePercent } from '../../lib/bucketHoldingTrend'
import './BucketTotalTrend.scss'

type Tone = 'default' | 'on-dark'
type Layout = 'row' | 'stack'

type Props = {
  trend: BucketTrendDisplay | null | undefined
  className?: string
  tone?: Tone
  layout?: Layout
}

/** Signed daily change % for a bucket or account group. */
export function BucketTotalTrend({
  trend,
  className = '',
  tone = 'default',
  layout = 'row',
}: Props) {
  if (!trend) return null

  const pct = trend.changePercent
  const hasPct = pct != null && Number.isFinite(pct)
  if (!hasPct) return null

  const direction: 'up' | 'down' | 'flat' =
    pct! > 0.005 ? 'up' : pct! < -0.005 ? 'down' : 'flat'

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
      title={formatBucketChangePercent(pct!)}
    >
      <span className="bucket-total-trend__pct">{formatBucketChangePercent(pct!)}</span>
    </div>
  )
}
