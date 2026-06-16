import { tierIsAuthenticated } from './resolveTier'
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

/** Signed-in users: full plan cache in localStorage + server sync. */
export function canWritePlanLocalStorage(): boolean {
  if (migrationWriteBypass) return true
  return tierIsAuthenticated(planWriteTier)
}

/** Onboarding profile only — allowed for guests and signed-in users. */
export function canWriteGuestProfile(): boolean {
  if (migrationWriteBypass) return true
  return true
}

/** True when expectifi/* plan blobs (session, accounts, income UI, etc.) may be written. */
export function canWriteExpectifiPlanBlobs(): boolean {
  return canWritePlanLocalStorage()
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
