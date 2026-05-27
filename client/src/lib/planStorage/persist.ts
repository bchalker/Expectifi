import { buildSnapshot } from '../appSnapshot'
import { inputsForPersistedCalculatorSession } from '../fidelityStorage'
import type { PlanPersistSnapshot } from './types'
import { savePlanAccounts } from './accounts'
import { savePlanProfile } from './profile'
import { savePlanSession } from './session'
import { hasSavePlanBeenAccepted } from './meta'
import { canPersistPlanToLocalStorage } from './resolveTier'
import type { UserTier } from './types'

/**
 * Write plan blobs to expectifi/* localStorage.
 * No-op for anonymous tier (strict zero localStorage writes).
 */
export function persistPlanState(tier: UserTier, snapshot: PlanPersistSnapshot): void {
  if (!canPersistPlanToLocalStorage(tier)) return
  if (tier === 'browser_saved' && !hasSavePlanBeenAccepted()) return

  if (snapshot.profile) {
    savePlanProfile(snapshot.profile)
  }
  if (snapshot.accounts) {
    savePlanAccounts(snapshot.accounts)
  }
  savePlanSession(
    buildSnapshot(
      inputsForPersistedCalculatorSession(snapshot.inputs),
      snapshot.ui,
      snapshot.phase,
      snapshot.activePreset,
    ),
  )
}
