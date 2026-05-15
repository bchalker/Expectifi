/** Age at which RMD-driven ordering applies for withdrawal-sequence UI. */
export const WITHDRAWAL_RMD_DISPLAY_AGE = 73

export type WithdrawalDisplayBucket = 'brokerage' | 'pretax' | 'roth' | 'hsa'

export function isWithdrawalRmdPhase(retirementAge: number): boolean {
  return retirementAge >= WITHDRAWAL_RMD_DISPLAY_AGE
}

/**
 * Recommended display order for retirement + taxable buckets.
 * When `includeBrokerage` is false, brokerage is omitted (e.g. separate card) but numeric hints still align with the full strategy.
 */
export function withdrawalBucketOrder(retirementAge: number, includeBrokerage: boolean): WithdrawalDisplayBucket[] {
  const rmd = isWithdrawalRmdPhase(retirementAge)
  if (includeBrokerage) {
    return rmd ? ['pretax', 'brokerage', 'roth', 'hsa'] : ['brokerage', 'pretax', 'roth', 'hsa']
  }
  return rmd ? ['pretax', 'roth', 'hsa'] : ['pretax', 'roth', 'hsa']
}

export type WithdrawalBadgeHint = { order: number | null; hint: string | null }

export function withdrawalBadgeAndHint(
  bucket: WithdrawalDisplayBucket,
  retirementAge: number,
  includeBrokerage: boolean,
): WithdrawalBadgeHint {
  const rmd = isWithdrawalRmdPhase(retirementAge)
  const fullOrder = withdrawalBucketOrder(retirementAge, includeBrokerage)
  const idx = fullOrder.indexOf(bucket)
  const order = bucket === 'hsa' ? null : idx >= 0 ? idx + 1 : null

  switch (bucket) {
    case 'brokerage':
      return {
        order,
        hint: rmd ? 'after required distributions' : 'draw first',
      }
    case 'pretax':
      return {
        order,
        hint: rmd ? 'RMDs required at 73' : 'fill lower tax brackets',
      }
    case 'roth':
      return {
        order,
        hint: 'preserve longest',
      }
    case 'hsa':
      return {
        order: null,
        hint: 'medical expenses, runs parallel',
      }
    default:
      return { order: null, hint: null }
  }
}
