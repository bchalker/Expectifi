import {
  getAccountIncomeRecommendation,
  incomeStrategyDisplayName,
} from '../lib/accountIncomeRecommendation'
import type { AccountScenarioBucketId } from '../lib/accountReturnScenario'
import './IncomeAccountRecommendation.scss'

type Props = {
  bucket: AccountScenarioBucketId
}

export function IncomeAccountRecommendation({ bucket }: Props) {
  const recommendation = getAccountIncomeRecommendation(bucket)

  return (
    <aside
      className="income-account-recommendation"
      aria-label="Income strategy recommendation"
    >
      <p className="income-account-recommendation__text">
        We recommend{' '}
        <strong className="income-account-recommendation__strategy">
          {incomeStrategyDisplayName(recommendation.strategy)}
        </strong>{' '}
        for this account.
      </p>
    </aside>
  )
}
