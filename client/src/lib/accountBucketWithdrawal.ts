import type { AccountScenarioBucketId } from './accountReturnScenario'
import type { ComputedSnapshot } from './computeResults'

/** Annual withdrawal for a portfolio bucket — same figures as Withdrawal Strategy stats. */
export function annualWithdrawalForAccountBucket(
  bucket: AccountScenarioBucketId,
  snapshot: ComputedSnapshot,
): number | null {
  if (!snapshot.hasPortfolioBalances) return null
  const s = snapshot.strategy
  const amount =
    bucket === 'brokerage'
      ? s.brkWdAnn
      : bucket === 'pretax'
        ? s.tradWdAnn
        : bucket === 'roth'
          ? s.rothWdAnn
          : s.hsaWdAnn
  if (!Number.isFinite(amount) || amount <= 0) return null
  return amount
}
