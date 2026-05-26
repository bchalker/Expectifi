import { buildSnapshot } from '../appSnapshot'
import type { PlanPersistSnapshot } from './types'
import { savePlanAccounts } from './accounts'
import { savePlanProfile } from './profile'
import { savePlanSession } from './session'
import { canPersistPlanToLocalStorage } from './resolveTier'
import type { UserTier } from './types'

/**
 * Write plan blobs to expectifi/* localStorage.
 * No-op for anonymous tier (strict zero localStorage writes).
 */
export function persistPlanState(tier: UserTier, snapshot: PlanPersistSnapshot): void {
  if (!canPersistPlanToLocalStorage(tier)) return

  if (snapshot.profile) {
    savePlanProfile(snapshot.profile)
  }
  if (snapshot.accounts) {
    savePlanAccounts(snapshot.accounts)
  }
  savePlanSession(
    buildSnapshot(snapshot.inputs, snapshot.ui, snapshot.phase, snapshot.activePreset),
  )
}
