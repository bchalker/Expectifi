import {
  getAccountIncomeRecommendation,
  incomeStrategyDisplayName,
} from '../lib/accountIncomeRecommendation'
import type { AccountScenarioBucketId } from '../lib/accountReturnScenario'
import { renderIncomeTextWithRmdTerms } from './renderIncomeTextWithRmdTerms'
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
      <span className="income-account-recommendation__pill">
        <strong className="income-account-recommendation__pill-strategy">
          {incomeStrategyDisplayName(recommendation.strategy)}
        </strong>
        <span className="income-account-recommendation__pill-suffix">Recommended</span>
      </span>
      <p className="income-account-recommendation__reason">
        {renderIncomeTextWithRmdTerms(recommendation.reason)}
      </p>
    </aside>
  )
}
