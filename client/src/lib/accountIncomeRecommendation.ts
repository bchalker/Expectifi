import type { AccountScenarioBucketId } from './accountReturnScenario'
import type { AccountIncomeStrategy } from './accountIncomeStrategy'

export type AccountIncomeRecommendation = {
  strategy: AccountIncomeStrategy
  reason: string
}

const STRATEGY_LABEL: Record<Exclude<AccountIncomeStrategy, 'none'>, string> = {
  dividend: 'Dividend',
  withdraw: 'Withdraw',
  both: 'Both',
}

export function incomeStrategyDisplayName(strategy: AccountIncomeStrategy): string {
  if (strategy === 'none') return 'No strategy'
  return STRATEGY_LABEL[strategy]
}

export function recommendedStrategyPillLabel(bucket: AccountScenarioBucketId): string {
  const strategy = recommendedAccountIncomeStrategy(bucket)
  return `${STRATEGY_LABEL[strategy]} Recommended`
}

export function selectedStrategyDeviationLabel(strategy: AccountIncomeStrategy): string {
  if (strategy === 'none') return 'no strategy'
  return STRATEGY_LABEL[strategy]
}

/** Model-based default strategy per account bucket (income mode). */
export function recommendedAccountIncomeStrategy(
  bucket: AccountScenarioBucketId,
): Exclude<AccountIncomeStrategy, 'none'> {
  switch (bucket) {
    case 'brokerage':
      return 'withdraw'
    case 'pretax':
      return 'withdraw'
    case 'roth':
      return 'dividend'
    case 'hsa':
      return 'withdraw'
    default:
      return 'withdraw'
  }
}

function recommendationReason(
  bucket: AccountScenarioBucketId,
  strategy: Exclude<AccountIncomeStrategy, 'none'>,
): string {
  const key = `${bucket}:${strategy}` as const

  const reasons: Record<string, string> = {
    'brokerage:withdraw':
      'We recommend Withdraw for this account. Taxable brokerage is usually drawn first so Roth and pre-tax balances keep compounding while you spend from assets with favorable long-term capital gains treatment.',
    'brokerage:dividend':
      'We recommend Dividend for this account. Your projected balance supports full income coverage at current yield without touching principal. Drawing from dividends first preserves your Roth and pre-tax accounts to keep compounding.',
    'brokerage:both':
      'We recommend Both for this account. Dividend income covers your baseline expenses while a small withdrawal component closes the gap to your income goal. Combining strategies avoids over-relying on high-yield funds that may carry NAV erosion risk.',

    'pretax:withdraw':
      'We recommend Withdraw for this account. Drawing from pre-tax in early retirement fills lower tax brackets and reduces future RMD pressure before required distributions begin at 73.',
    'pretax:dividend':
      'We recommend Dividend for this account. Modeling dividend distributions from pre-tax is conservative; IRA income is usually modeled as withdrawals rather than dividend-driven cash flow.',
    'pretax:both':
      'We recommend Both for this account. A hybrid can increase income, but pre-tax dividends still represent taxable distributions when withdrawn for spending.',

    'roth:dividend':
      "We recommend Dividend for this account. Tax-free compounding is this account's greatest advantage. Preserving principal here as long as possible means every dollar keeps growing with no tax drag and no required distributions ever.",
    'roth:withdraw':
      'We recommend Withdraw for this account. Roth withdrawals are tax-free but spend down your longest-compounding tax shelter; dividends often preserve balance longer.',
    'roth:both':
      'We recommend Both for this account. Dividends plus limited Roth draws can cover income gaps while keeping most of the account invested tax-free.',

    'hsa:withdraw':
      'We recommend Withdraw for this account. Reserve HSA funds for qualified medical expenses first. This account is not optimized for general income and non-medical withdrawals before 65 carry a 20 percent penalty.',
    'hsa:dividend':
      'We recommend Dividend for this account. HSAs are best preserved for medical use; dividend modeling helps if you plan to keep the account invested until qualified expenses arise.',
    'hsa:both':
      'We recommend Both for this account. Medical draws plus dividend modeling can show total HSA cash flow while tracking preserved balance for later care.',
  }

  return (
    reasons[key] ??
    `We recommend ${STRATEGY_LABEL[strategy]} for this account. This strategy balances projected income with how this account type is typically used in retirement drawdown planning.`
  )
}

export function getAccountIncomeRecommendation(
  bucket: AccountScenarioBucketId,
): AccountIncomeRecommendation {
  const strategy = recommendedAccountIncomeStrategy(bucket)
  return {
    strategy,
    reason: recommendationReason(bucket, strategy),
  }
}

export function accountIncomeMatchesRecommendation(
  bucket: AccountScenarioBucketId,
  strategy: AccountIncomeStrategy,
): boolean {
  return strategy === recommendedAccountIncomeStrategy(bucket)
}

export const INCOME_RECOMMENDATION_DISCLAIMER =
  'This is a model-based suggestion, not financial advice. Consult a financial advisor for personalized guidance.'
