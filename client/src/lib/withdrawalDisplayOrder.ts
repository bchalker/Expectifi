import { taxConfigForLocale, localeSupportsWithdrawalBucket } from '../config/taxConfig'
import type { OnboardingRegionId } from './onboardingRegions'
import { normalizeOnboardingRegionId } from './onboardingRegions'

/** Age at which RMD-driven ordering applies for withdrawal-sequence UI (US). */
export const WITHDRAWAL_RMD_DISPLAY_AGE = 73

/** Age at which RRIF minimums affect ordering (Canada). */
export const WITHDRAWAL_CA_RRIF_DISPLAY_AGE = 71

export type WithdrawalDisplayBucket = 'brokerage' | 'pretax' | 'roth' | 'hsa'

export function isWithdrawalRmdPhase(locale: OnboardingRegionId, retirementAge: number): boolean {
  if (locale === 'us') return retirementAge >= WITHDRAWAL_RMD_DISPLAY_AGE
  if (locale === 'ca') return retirementAge >= WITHDRAWAL_CA_RRIF_DISPLAY_AGE
  return false
}

function baseOrderForLocale(locale: OnboardingRegionId): WithdrawalDisplayBucket[] {
  if (locale === 'ca') return ['brokerage', 'pretax', 'roth']
  return ['brokerage', 'pretax', 'roth', 'hsa']
}

/**
 * Recommended display order for retirement + taxable buckets.
 * When `includeBrokerage` is false, brokerage is omitted (e.g. separate card) but numeric hints still align with the full strategy.
 */
export function withdrawalBucketOrder(
  retirementAge: number,
  includeBrokerage: boolean,
  locale?: OnboardingRegionId | string | null,
): WithdrawalDisplayBucket[] {
  const id = normalizeOnboardingRegionId(locale) ?? 'us'
  const rmd = isWithdrawalRmdPhase(id, retirementAge)
  const base = baseOrderForLocale(id).filter((b) => localeSupportsWithdrawalBucket(id, b))
  if (rmd && id === 'us') {
    const withoutBrokerage = base.filter((b) => b !== 'brokerage' && b !== 'hsa')
    const ordered: WithdrawalDisplayBucket[] = ['pretax', ...withoutBrokerage.filter((b) => b !== 'pretax')]
    if (includeBrokerage && localeSupportsWithdrawalBucket(id, 'brokerage')) {
      return ['pretax', 'brokerage', ...ordered.filter((b) => b !== 'pretax' && b !== 'brokerage')]
    }
    return ordered
  }
  if (!includeBrokerage) return base.filter((b) => b !== 'brokerage')
  return base
}

export type WithdrawalBadgeHint = { order: number | null; hint: string | null }

export function withdrawalBadgeAndHint(
  bucket: WithdrawalDisplayBucket,
  retirementAge: number,
  includeBrokerage: boolean,
  presentBuckets?: Iterable<WithdrawalDisplayBucket>,
  locale?: OnboardingRegionId | string | null,
): WithdrawalBadgeHint {
  const id = normalizeOnboardingRegionId(locale) ?? 'us'
  const config = taxConfigForLocale(id)
  const rmd = isWithdrawalRmdPhase(id, retirementAge)
  const order =
    presentBuckets != null
      ? withdrawalOrderAmongPresent(bucket, retirementAge, includeBrokerage, presentBuckets, id)
      : (() => {
          const fullOrder = withdrawalBucketOrder(retirementAge, includeBrokerage, id)
          const idx = fullOrder.indexOf(bucket)
          return bucket === 'hsa' ? null : idx >= 0 ? idx + 1 : null
        })()

  switch (bucket) {
    case 'brokerage':
      return {
        order,
        hint: rmd ? 'after required distributions' : 'draw first',
      }
    case 'pretax':
      return {
        order,
        hint:
          rmd && config.mandatoryWithdrawalLabel
            ? config.mandatoryWithdrawalLabel
            : null,
      }
    case 'roth':
      return {
        order,
        hint: id === 'ca' ? 'draw last — tax-free' : null,
      }
    case 'hsa':
      return {
        order: null,
        hint: id === 'us' ? 'medical expenses, runs parallel' : null,
      }
    default:
      return { order: null, hint: null }
  }
}

/** Number badges only among buckets that have balances; preserves strategy order. HSA is never numbered. */
export function withdrawalOrderAmongPresent(
  bucket: WithdrawalDisplayBucket,
  retirementAge: number,
  includeBrokerage: boolean,
  presentBuckets: Iterable<WithdrawalDisplayBucket>,
  locale?: OnboardingRegionId | string | null,
): number | null {
  if (bucket === 'hsa') return null
  const present = new Set(presentBuckets)
  const seq = withdrawalBucketOrder(retirementAge, includeBrokerage, locale).filter(
    (b) => present.has(b) && b !== 'hsa',
  )
  const idx = seq.indexOf(bucket)
  return idx >= 0 ? idx + 1 : null
}
