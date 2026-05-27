import type { ReactNode } from 'react'
import type { BucketTrendDisplay } from '../lib/bucketHoldingTrend'
import { BucketTotalTrend } from './ui/BucketTotalTrend'
import { ViewHoldingsHint } from './ui/ViewHoldingsHint'
import './FidelityBucketAccountRow.scss'

type Props = {
  label: string
  total: ReactNode
  trend?: BucketTrendDisplay | null
  showViewHoldings?: boolean
}

/** Fidelity tax bucket summary: name + View Holdings on the left; total + trend on the right. */
export function FidelityBucketAccountRow({ label, total, trend, showViewHoldings = true }: Props) {
  return (
    <>
      <div className="portfolio-bucket-row__start">
        <span className="edit-row-label">{label}</span>
      </div>
      <div className="edit-row-right portfolio-bucket-row__end">
        <div className="portfolio-bucket-row__values">
          <div className="portfolio-bucket-row__amount-row">
            <span className="edit-row-val portfolio-bucket-total">{total}</span>
            {showViewHoldings ? <ViewHoldingsHint /> : null}
          </div>
          <BucketTotalTrend trend={trend} />
        </div>
      </div>
    </>
  )
}
