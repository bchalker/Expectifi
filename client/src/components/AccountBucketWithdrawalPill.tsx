import { IconCornerDownRight } from '@tabler/icons-react'
import { fmt } from '../utils/format'
import './AccountBucketWithdrawalPill.scss'

type Props = {
  annualWithdrawal: number
  className?: string
}

/** Income-mode supporting stat under account bucket hints. */
export function AccountBucketWithdrawalPill({ annualWithdrawal, className }: Props) {
  const rootClass = ['account-bucket-withdrawal-pill', className].filter(Boolean).join(' ')

  return (
    <span className={rootClass}>
      <span className="account-bucket-withdrawal-pill__amount">
        <span className="account-bucket-withdrawal-pill__amount-icon" aria-hidden>
          <IconCornerDownRight size={14} stroke={1.25} />
        </span>
        {fmt(annualWithdrawal)}/yr
      </span>
      <span className="account-bucket-withdrawal-pill__label">withdrawal</span>
    </span>
  )
}
