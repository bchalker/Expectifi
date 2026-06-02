import type { AccountScenarioBucketId } from './accountReturnScenario'
import type { ComputedSnapshot } from './computeResults'

/** Fields required to split retirement FV across accounts within a bucket. */
export type AccountRetirementFvSnapshot = Pick<
  ComputedSnapshot,
  'hasPortfolioBalances' | 'retFV' | 'brkFV' | 'tradRatio' | 'rothRatio' | 'hsaRatio'
>

/** Projected portfolio value at retirement for a tax bucket (matches withdrawal split). */
export function retirementFvForAccountBucket(
  bucket: AccountScenarioBucketId,
  snapshot: AccountRetirementFvSnapshot,
): number {
  if (!snapshot.hasPortfolioBalances) return 0
  switch (bucket) {
    case 'brokerage':
      return snapshot.brkFV
    case 'pretax':
      return snapshot.retFV * snapshot.tradRatio
    case 'roth':
      return snapshot.retFV * snapshot.rothRatio
    case 'hsa':
      return snapshot.retFV * snapshot.hsaRatio
  }
}

/** Current balance total for a bucket — used to split retirement FV across multiple accounts. */
export function currentBalanceForAccountBucket(
  bucket: AccountScenarioBucketId,
  snapshot: ComputedSnapshot,
  brkBal: number,
): number {
  switch (bucket) {
    case 'brokerage':
      return brkBal
    case 'pretax':
      return snapshot.tradBal
    case 'roth':
      return snapshot.rothBal
    case 'hsa':
      return snapshot.hsaBal
  }
}

/** Per-account share of retirement FV from current balance proportion within the bucket. */
export function accountRetirementBalance(
  bucket: AccountScenarioBucketId,
  currentBalance: number,
  bucketCurrentTotal: number,
  snapshot: AccountRetirementFvSnapshot,
): number {
  const bucketFv = retirementFvForAccountBucket(bucket, snapshot)
  if (bucketFv <= 0 || currentBalance <= 0) return 0
  if (bucketCurrentTotal <= 0) return bucketFv
  return bucketFv * (currentBalance / bucketCurrentTotal)
}
