import { migrateIncomeUiFields, mergeIncomeUiFields, type IncomeUiFields } from './accountIncomeStorage'
import type { AppSnapshotV1 } from './appSnapshot'
import { fetchUserPlanState, saveUserPlanState } from './api/planState'
import { applyPlanStatePayloadToLocal } from './planStorage/applyPlanState'
import { buildPlanStatePayloadFromLocal } from './planStorage/buildPlanStatePayload'
import { planAccountsHaveBalances } from './planStorage/accounts'
import { growthLifeEventsHaveCustomizations } from './planStorage/growthLifeEvents'
import { profileHasOnboardingComplete } from './planStorage/profile'
import { loadLocalPlanStateSavedAt, touchLocalPlanStateSavedAt } from './planStorage/localSavedAt'
import { getPlanWriteTier } from './planStorage/writeContext'
import { tierIsAuthenticated } from './planStorage/resolveTier'
import type { UserPlanStatePayload } from './planStateTypes'

function asSession(raw: unknown): AppSnapshotV1 | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as AppSnapshotV1
  return o.version === 1 && o.inputs && o.ui ? o : null
}

function incomeUiFieldCount(session: AppSnapshotV1 | null): number {
  if (!session?.ui) return 0
  return (
    Object.keys(session.ui.accountIncomeStrategies ?? {}).length +
    Object.keys(session.ui.accountIncomeFunds ?? {}).length +
    Object.keys(session.ui.accountWithdrawRates ?? {}).length
  )
}

function localSessionShouldWinOverRemote(
  local: UserPlanStatePayload,
  remote: UserPlanStatePayload,
  localSavedAt: string | null,
  remoteUpdatedAt: string | null,
): boolean {
  if (localPlanStateIsNewerThanRemote(localSavedAt, remoteUpdatedAt)) {
    const localSession = asSession(local.session)
    const remoteSession = asSession(remote.session)
    const localIncomeCount = incomeUiFieldCount(localSession)
    const remoteIncomeCount = incomeUiFieldCount(remoteSession)
    const remoteAccountIncomeUiCount = incomeUiFieldCountFromPayload(remote.accountIncomeUi)
    const localAccountIncomeUiCount = incomeUiFieldCountFromPayload(local.accountIncomeUi)
    if (
      remoteIncomeCount + remoteAccountIncomeUiCount >
      localIncomeCount + localAccountIncomeUiCount
    ) {
      return false
    }
    return true
  }
  const localSession = asSession(local.session)
  const remoteSession = asSession(remote.session)
  if (localSession?.phase === 'income' && remoteSession?.phase !== 'income') return true
  if (incomeUiFieldCount(localSession) > incomeUiFieldCount(remoteSession)) return true
  return false
}

function incomeUiFieldCountFromPayload(raw: unknown): number {
  if (!raw || typeof raw !== 'object') return 0
  const fields = raw as {
    accountIncomeStrategies?: Record<string, unknown>
    accountIncomeFunds?: Record<string, unknown>
    accountWithdrawRates?: Record<string, unknown>
  }
  return (
    Object.keys(fields.accountIncomeStrategies ?? {}).length +
    Object.keys(fields.accountIncomeFunds ?? {}).length +
    Object.keys(fields.accountWithdrawRates ?? {}).length
  )
}

function mergeRetirementPreferences(
  remote: UserPlanStatePayload,
  local: UserPlanStatePayload,
): UserPlanStatePayload['retirementPreferences'] {
  return remote.retirementPreferences ?? local.retirementPreferences ?? null
}

/** Preserve remote fields missing locally so a stale local win cannot wipe synced data. */
function mergeRemoteFieldsIntoLocal(
  remote: UserPlanStatePayload,
  local: UserPlanStatePayload,
): UserPlanStatePayload {
  const mergedRetirementPreferences = mergeRetirementPreferences(remote, local)
  const mergedAccountIncomeUi =
    remote.accountIncomeUi || local.accountIncomeUi
      ? mergeIncomeUiFields(
          (remote.accountIncomeUi ?? {
            accountIncomeFunds: {},
            accountIncomeStrategies: {},
            accountWithdrawRates: {},
          }) as IncomeUiFields,
          (local.accountIncomeUi ?? null) as IncomeUiFields | null,
        )
      : null

  return {
    ...local,
    ...(mergedRetirementPreferences != null
      ? { retirementPreferences: mergedRetirementPreferences }
      : {}),
    ...(mergedAccountIncomeUi ? { accountIncomeUi: mergedAccountIncomeUi } : {}),
  }
}

function dispatchPlanStateServerHydrated(): void {
  window.dispatchEvent(new CustomEvent(PLAN_STATE_SERVER_HYDRATED_EVENT))
}

function restoreMissingLocalFieldsFromRemote(
  remote: UserPlanStatePayload,
  local: UserPlanStatePayload,
): void {
  const patch: UserPlanStatePayload = {
    version: 1,
    savedAt: new Date().toISOString(),
    profile: null,
    accounts: null,
    session: null,
    lifePlans: null,
    growthLifeEvents: null,
    balanceModes: null,
    retirementPreferences: null,
    accountIncomeUi: null,
  }
  let hasPatch = false

  if (!local.retirementPreferences && remote.retirementPreferences) {
    patch.retirementPreferences = remote.retirementPreferences
    hasPatch = true
  }
  if (!local.accountIncomeUi && remote.accountIncomeUi) {
    patch.accountIncomeUi = remote.accountIncomeUi
    hasPatch = true
  }

  if (hasPatch) {
    applyPlanStatePayloadToLocal(patch)
  }
}

/** Keep local income tab + per-account income picks when the server copy is stale. */
function mergeLocalSessionOverrides(
  remote: UserPlanStatePayload,
  local: UserPlanStatePayload,
): UserPlanStatePayload {
  const remoteSession = asSession(remote.session)
  const localSession = asSession(local.session)
  const mergedAccountIncomeUi =
    remote.accountIncomeUi || local.accountIncomeUi
      ? mergeIncomeUiFields(
          (remote.accountIncomeUi ?? {
            accountIncomeFunds: {},
            accountIncomeStrategies: {},
            accountWithdrawRates: {},
          }) as IncomeUiFields,
          (local.accountIncomeUi ?? null) as IncomeUiFields | null,
        )
      : null

  if (!remoteSession || !localSession) {
    const mergedRetirementPreferences = mergeRetirementPreferences(remote, local)
    if (
      !mergedAccountIncomeUi &&
      mergedRetirementPreferences === remote.retirementPreferences
    ) {
      return remote
    }
    return {
      ...remote,
      ...(mergedAccountIncomeUi ? { accountIncomeUi: mergedAccountIncomeUi } : {}),
      ...(mergedRetirementPreferences != null
        ? { retirementPreferences: mergedRetirementPreferences }
        : {}),
    }
  }

  const remoteUi = remoteSession.ui
  const localUi = localSession.ui
  const mergeIncomeUi = incomeUiFieldCount(localSession) > 0

  let session: AppSnapshotV1 = remoteSession
  if (localSession.phase === 'income' && remoteSession.phase !== 'income') {
    session = { ...session, phase: 'income' }
  }
  if (mergeIncomeUi && localUi) {
    session = {
      ...session,
      ui: {
        ...remoteUi,
        ...migrateIncomeUiFields({
          accountIncomeFunds: {
            ...remoteUi.accountIncomeFunds,
            ...localUi.accountIncomeFunds,
          },
          accountIncomeStrategies: {
            ...remoteUi.accountIncomeStrategies,
            ...localUi.accountIncomeStrategies,
          },
          accountWithdrawRates: {
            ...remoteUi.accountWithdrawRates,
            ...localUi.accountWithdrawRates,
          },
        }),
      },
    }
  }

  const mergedRetirementPreferences = mergeRetirementPreferences(remote, local)

  if (
    session === remoteSession &&
    !mergedAccountIncomeUi &&
    mergedRetirementPreferences === remote.retirementPreferences
  ) {
    return remote
  }

  return {
    ...remote,
    session,
    ...(mergedAccountIncomeUi ? { accountIncomeUi: mergedAccountIncomeUi } : {}),
    ...(mergedRetirementPreferences != null
      ? { retirementPreferences: mergedRetirementPreferences }
      : {}),
  }
}

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

function parseSavedAtMs(iso: string | null | undefined): number {
  if (!iso) return 0
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : 0
}

function localPlanStateIsNewerThanRemote(
  localSavedAt: string | null,
  remoteUpdatedAt: string | null,
): boolean {
  const localMs = parseSavedAtMs(localSavedAt)
  if (localMs <= 0) return false
  const remoteMs = parseSavedAtMs(remoteUpdatedAt)
  if (remoteMs <= 0) return true
  return localMs > remoteMs
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
 * Load plan state from server on login. When local edits are newer than the
 * server copy, local wins and is re-uploaded (avoids stale server wiping income
 * strategy selections before the debounced sync completes).
 */
export async function hydratePlanStateFromServer(): Promise<boolean> {
  if (!canSyncPlanStateToServer()) return false
  if (hydrateInFlight) return hydrateInFlight
  hydrateInFlight = (async () => {
    try {
      const local = buildPlanStatePayloadFromLocal()
      const localSavedAt = loadLocalPlanStateSavedAt()
      const { planState: remote, updatedAt: remoteUpdatedAt } = await fetchUserPlanState()

      if (remote && planStatePayloadHasData(remote)) {
        if (localSessionShouldWinOverRemote(local, remote, localSavedAt, remoteUpdatedAt)) {
          const mergedLocal = mergeRemoteFieldsIntoLocal(remote, local)
          restoreMissingLocalFieldsFromRemote(remote, local)
          if (planStatePayloadHasData(mergedLocal)) {
            pushPlanStateToServer(mergedLocal)
            dispatchPlanStateServerHydrated()
            return true
          }
        }
        const merged = mergeLocalSessionOverrides(remote, local)
        applyPlanStatePayloadToLocal(merged)
        const mergedDiffersFromRemote = merged !== remote
        touchLocalPlanStateSavedAt(
          mergedDiffersFromRemote ? new Date().toISOString() : (remoteUpdatedAt ?? remote.savedAt),
        )
        if (mergedDiffersFromRemote) {
          pushPlanStateToServer(merged)
        }
        dispatchPlanStateServerHydrated()
        return true
      }

      if (planStatePayloadHasData(local)) {
        pushPlanStateToServer(local)
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
