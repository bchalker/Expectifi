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
      {fmt(annualWithdrawal)}/yr withdrawal
    </span>
  )
}
