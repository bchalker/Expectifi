import type { UserTier } from './types'
import { canPersistPlanToLocalStorage } from './resolveTier'

/** Set by UserTierProvider after hydration; used by storage modules (no React in lib code). */
let planWriteTier: UserTier = 'anonymous'

export function setPlanWriteTier(tier: UserTier): void {
  planWriteTier = tier
}

export function getPlanWriteTier(): UserTier {
  return planWriteTier
}

export function canWritePlanLocalStorage(): boolean {
  return canPersistPlanToLocalStorage(planWriteTier)
}
