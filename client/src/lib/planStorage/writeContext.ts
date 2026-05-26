import { hasSavePlanBeenAccepted } from './meta'
import { canPersistPlanToLocalStorage } from './resolveTier'
import type { UserTier } from './types'

/** Set by UserTierProvider after hydration; used by storage modules (no React in lib code). */
let planWriteTier: UserTier = 'anonymous'
let migrationWriteBypass = false

export function setPlanWriteTier(tier: UserTier): void {
  planWriteTier = tier
}

export function getPlanWriteTier(): UserTier {
  return planWriteTier
}

export function canWritePlanLocalStorage(): boolean {
  return canPersistPlanToLocalStorage(planWriteTier)
}

/** True when expectifi/* plan blobs may be written (consent + tier). */
export function canWriteExpectifiPlanBlobs(): boolean {
  if (migrationWriteBypass) return true
  if (!canPersistPlanToLocalStorage(planWriteTier)) return false
  if (planWriteTier === 'browser_saved' && !hasSavePlanBeenAccepted()) return false
  return true
}

/** Legacy migration runs before planWriteTier is set; bypass consent guard for that boot step only. */
export function runWithMigrationPlanWrites<T>(fn: () => T): T {
  migrationWriteBypass = true
  try {
    return fn()
  } finally {
    migrationWriteBypass = false
  }
}
