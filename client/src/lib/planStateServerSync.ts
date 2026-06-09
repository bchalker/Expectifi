import { fetchUserPlanState, saveUserPlanState } from './api/planState'
import { applyPlanStatePayloadToLocal } from './planStorage/applyPlanState'
import { buildPlanStatePayloadFromLocal } from './planStorage/buildPlanStatePayload'
import { planAccountsHaveBalances } from './planStorage/accounts'
import { growthLifeEventsHaveCustomizations } from './planStorage/growthLifeEvents'
import { profileHasOnboardingComplete } from './planStorage/profile'
import { getPlanWriteTier } from './planStorage/writeContext'
import { tierIsAuthenticated } from './planStorage/resolveTier'
import type { UserPlanStatePayload } from './planStateTypes'

export const PLAN_STATE_SERVER_HYDRATED_EVENT = 'expectifi/plan-state-server-hydrated'

let syncTimer: ReturnType<typeof setTimeout> | null = null
let hydrateInFlight: Promise<boolean> | null = null

function planStatePayloadHasData(payload: UserPlanStatePayload): boolean {
  if (payload.session != null) return true
  if (profileHasOnboardingComplete(payload.profile)) return true
  if (planAccountsHaveBalances(payload.accounts)) return true
  if (growthLifeEventsHaveCustomizations(payload.growthLifeEvents?.events ?? [])) return true
  return false
}

function canSyncPlanStateToServer(): boolean {
  return tierIsAuthenticated(getPlanWriteTier())
}

/** Debounced push after local plan save (authenticated users only). */
export function queuePlanStateServerSync(): void {
  if (!canSyncPlanStateToServer()) return
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    syncTimer = null
    const payload = buildPlanStatePayloadFromLocal()
    if (!planStatePayloadHasData(payload)) return
    void saveUserPlanState(payload).catch(() => {
      /* offline / transient — local copy remains */
    })
  }, 800)
}

/**
 * Load plan state from server on login. Server wins when present; otherwise
 * uploads existing local copy (device migration).
 */
export async function hydratePlanStateFromServer(): Promise<boolean> {
  if (!canSyncPlanStateToServer()) return false
  if (hydrateInFlight) return hydrateInFlight
  hydrateInFlight = (async () => {
    try {
      const { planState: remote } = await fetchUserPlanState()
      if (remote && planStatePayloadHasData(remote)) {
        applyPlanStatePayloadToLocal(remote)
        window.dispatchEvent(new CustomEvent(PLAN_STATE_SERVER_HYDRATED_EVENT))
        return true
      }
      const local = buildPlanStatePayloadFromLocal()
      if (planStatePayloadHasData(local)) {
        await saveUserPlanState(local)
        return true
      }
      return false
    } catch {
      return false
    } finally {
      hydrateInFlight = null
    }
  })()
  return hydrateInFlight
}
