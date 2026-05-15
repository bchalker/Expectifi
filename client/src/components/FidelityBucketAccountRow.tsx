import type { ReactNode } from 'react'

type Props = {
  label: ReactNode
  total: ReactNode
}

/** Fidelity CSV bucket: account title row (label + tag) and computed total on the right. */
export function FidelityBucketAccountRow({ label, total }: Props) {
  return (
    <>
      <span className="edit-row-label">{label}</span>
      <div className="edit-row-right">
        <span className="edit-row-val fidelity-bucket-total">{total}</span>
      </div>
    </>
  )
}
