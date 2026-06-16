import { fetchUserPlanState, saveUserPlanState } from './api/planState'
import { applyPlanStatePayloadToLocal } from './planStorage/applyPlanState'
import { buildPlanStatePayloadFromLocal } from './planStorage/buildPlanStatePayload'
import { planAccountsHaveBalances } from './planStorage/accounts'
import { growthLifeEventsHaveCustomizations } from './planStorage/growthLifeEvents'
import { profileHasOnboardingComplete } from './planStorage/profile'
import { touchLocalPlanStateSavedAt } from './planStorage/localSavedAt'
import { getPlanWriteTier } from './planStorage/writeContext'
import { tierIsAuthenticated } from './planStorage/resolveTier'
import type { UserPlanStatePayload } from './planStateTypes'

export const PLAN_STATE_SERVER_HYDRATED_EVENT = 'expectifi/plan-state-server-hydrated'

let syncTimer: ReturnType<typeof setTimeout> | null = null
let hydrateInFlight: Promise<boolean> | null = null
let pagehideFlushInstalled = false

function planStatePayloadHasData(payload: UserPlanStatePayload): boolean {
  if (payload.session != null) return true
  if (profileHasOnboardingComplete(payload.profile)) return true
  if (planAccountsHaveBalances(payload.accounts)) return true
  if (growthLifeEventsHaveCustomizations(payload.growthLifeEvents?.cards ?? [])) return true
  if (payload.retirementPreferences != null) return true
  if (payload.accountIncomeUi != null) return true
  return false
}

function canSyncPlanStateToServer(): boolean {
  return tierIsAuthenticated(getPlanWriteTier())
}

function dispatchPlanStateServerHydrated(): void {
  window.dispatchEvent(new CustomEvent(PLAN_STATE_SERVER_HYDRATED_EVENT))
}

function pushPlanStateToServer(payload: UserPlanStatePayload): void {
  if (!planStatePayloadHasData(payload)) return
  void saveUserPlanState(payload).catch(() => {
    /* offline / transient — local copy remains */
  })
}

/** Push pending plan state immediately (authenticated users only). */
export function flushPlanStateServerSync(): void {
  if (!canSyncPlanStateToServer()) return
  if (syncTimer) {
    clearTimeout(syncTimer)
    syncTimer = null
  }
  pushPlanStateToServer(buildPlanStatePayloadFromLocal())
}

function installPagehideFlush(): void {
  if (pagehideFlushInstalled || typeof window === 'undefined') return
  pagehideFlushInstalled = true
  window.addEventListener('pagehide', () => {
    flushPlanStateServerSync()
  })
}

/** Debounced push after local plan save (authenticated users only). */
export function queuePlanStateServerSync(): void {
  if (!canSyncPlanStateToServer()) return
  installPagehideFlush()
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    syncTimer = null
    flushPlanStateServerSync()
  }, 800)
}

/**
 * Pull plan state from the DB for signed-in users.
 * Server is always the cross-device source of truth on hydrate — never push
 * stale local data over a server copy (that was wiping toggles on other devices).
 * Seed the server only when no remote row exists yet.
 */
export async function hydratePlanStateFromServer(): Promise<boolean> {
  if (!canSyncPlanStateToServer()) return false
  if (hydrateInFlight) return hydrateInFlight
  hydrateInFlight = (async () => {
    try {
      const local = buildPlanStatePayloadFromLocal()
      const { planState: remote, updatedAt: remoteUpdatedAt } = await fetchUserPlanState()

      if (remote && planStatePayloadHasData(remote)) {
        applyPlanStatePayloadToLocal(remote)
        touchLocalPlanStateSavedAt(remoteUpdatedAt ?? remote.savedAt)
        dispatchPlanStateServerHydrated()
        return true
      }

      if (planStatePayloadHasData(local)) {
        pushPlanStateToServer(local)
        touchLocalPlanStateSavedAt(new Date().toISOString())
        dispatchPlanStateServerHydrated()
        return true
      }
      dispatchPlanStateServerHydrated()
      return false
    } catch {
      return false
    } finally {
      hydrateInFlight = null
    }
  })()
  return hydrateInFlight
}
