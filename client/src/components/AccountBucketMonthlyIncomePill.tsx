import { fmt } from '../utils/format'
import './AccountBucketMonthlyIncomePill.scss'

type Props = {
  monthlyIncome: number
  className?: string
}

/** Income-mode primary stat — monthly dividend income for an account. */
export function AccountBucketMonthlyIncomePill({ monthlyIncome, className }: Props) {
  const rootClass = ['account-bucket-monthly-income-pill', className].filter(Boolean).join(' ')

  return (
    <span className={rootClass}>
      <span className="account-bucket-monthly-income-pill__amount">{fmt(monthlyIncome)}</span>
      <span className="account-bucket-monthly-income-pill__label">/mo</span>
    </span>
  )
}
