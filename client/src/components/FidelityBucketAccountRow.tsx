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
      <div className="fidelity-bucket-row__start">
        <span className="edit-row-label">{label}</span>
        {showViewHoldings ? <ViewHoldingsHint /> : null}
      </div>
      <div className="edit-row-right fidelity-bucket-row__end">
        <div className="fidelity-bucket-row__values">
          <span className="edit-row-val fidelity-bucket-total">{total}</span>
          <BucketTotalTrend trend={trend} />
        </div>
      </div>
    </>
  )
}
