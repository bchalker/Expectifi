import type { AccountIncomeStrategy } from './accountIncomeStrategy'
import { accountIncomeFundStorageKey } from './accountIncomeFund'
import type { CalculatorUi } from './computeResults'
import {
  activeManualAccountEntries,
  manualEntryIdForAccountType,
  type ManualAccountEntry,
  type OnboardingAccountType,
} from './manualAccountEntries'
import { loadPlanAccounts } from './planStorage/accounts'
import { EXPECTIFI_ACCOUNT_INCOME_UI_KEY } from './planStorage/keys'
import { touchLocalPlanStateSavedAt } from './planStorage/localSavedAt'
import { readJsonFromLocalStorage, removeFromLocalStorage, writeJsonToLocalStorage } from './planStorage/storageUtils'
import { canWriteExpectifiPlanBlobs } from './planStorage/writeContext'

const INCOME_UI_SNAP_KEY = 'expectifi/income-ui-snap-v1'

/** Legacy dashboard row keys → account types (stable income storage ids). */
const MANUAL_ROW_KEY_TO_ACCOUNT_TYPE: Record<string, OnboardingAccountType> = {
  ret401k: 'trad_401k',
  se401k: 'sep_ira',
  tradIra: 'trad_ira',
  roth: 'roth_ira',
  hsa: 'hsa',
  brokerage: 'brokerage',
}

export type IncomeUiFields = Pick<
  CalculatorUi,
  'accountIncomeFunds' | 'accountIncomeStrategies' | 'accountWithdrawRates'
>

export function canonicalIncomeStorageKeyForEntry(entry: ManualAccountEntry): string {
  if (entry.type != null) {
    return accountIncomeFundStorageKey('manual', manualEntryIdForAccountType(entry.type))
  }
  return accountIncomeFundStorageKey('manual', entry.id)
}

export function canonicalIncomeStorageKeyForManualId(
  id: string,
  accountType?: OnboardingAccountType | null,
): string {
  if (accountType) {
    return accountIncomeFundStorageKey('manual', manualEntryIdForAccountType(accountType))
  }
  const rowType = MANUAL_ROW_KEY_TO_ACCOUNT_TYPE[id]
  if (rowType) {
    return accountIncomeFundStorageKey('manual', manualEntryIdForAccountType(rowType))
  }
  if (id.startsWith('manual-entry-')) {
    return accountIncomeFundStorageKey('manual', id)
  }
  return accountIncomeFundStorageKey('manual', id)
}

export function canonicalIncomeStorageKeyForBucket(bucket: string): string {
  return accountIncomeFundStorageKey('bucket', bucket)
}

function parseIncomeStorageKey(key: string): { scope: 'manual' | 'bucket'; id: string } | null {
  const idx = key.indexOf(':')
  if (idx <= 0) return null
  const scope = key.slice(0, idx)
  if (scope !== 'manual' && scope !== 'bucket') return null
  return { scope, id: key.slice(idx + 1) }
}

function canonicalizeIncomeStorageKey(
  key: string,
  accounts: ManualAccountEntry[],
): string {
  const parsed = parseIncomeStorageKey(key)
  if (!parsed) return key
  if (parsed.scope === 'bucket') return canonicalIncomeStorageKeyForBucket(parsed.id)

  const rowType = MANUAL_ROW_KEY_TO_ACCOUNT_TYPE[parsed.id]
  if (rowType) return canonicalIncomeStorageKeyForManualId(parsed.id, rowType)

  if (parsed.id.startsWith('manual-entry-')) {
    return accountIncomeFundStorageKey('manual', parsed.id)
  }

  const entry = accounts.find((item) => item.id === parsed.id)
  if (entry) return canonicalIncomeStorageKeyForEntry(entry)

  return accountIncomeFundStorageKey('manual', parsed.id)
}

function preferIncomeStrategy(
  current: AccountIncomeStrategy | undefined,
  next: AccountIncomeStrategy,
): AccountIncomeStrategy {
  if (!current || current === 'none') return next
  if (next === 'none') return current
  return next
}

function remapIncomeRecord<T>(
  record: Record<string, T> | undefined,
  accounts: ManualAccountEntry[],
  merge: (current: T | undefined, next: T) => T,
): Record<string, T> {
  const out: Record<string, T> = {}
  if (!record) return out
  for (const [key, value] of Object.entries(record)) {
    const canonical = canonicalizeIncomeStorageKey(key, accounts)
    out[canonical] = merge(out[canonical], value)
  }
  return out
}

export function migrateIncomeUiFields(
  ui: IncomeUiFields,
  accounts?: ManualAccountEntry[] | null,
): IncomeUiFields {
  const resolvedAccounts =
    accounts ?? activeManualAccountEntries(loadPlanAccounts()) ?? []

  return {
    accountIncomeFunds: remapIncomeRecord(
      ui.accountIncomeFunds,
      resolvedAccounts,
      (current, next) => (next.trim().length > 0 ? next : current ?? next),
    ),
    accountIncomeStrategies: remapIncomeRecord(
      ui.accountIncomeStrategies,
      resolvedAccounts,
      (current, next) => preferIncomeStrategy(current, next),
    ),
    accountWithdrawRates: remapIncomeRecord(
      ui.accountWithdrawRates,
      resolvedAccounts,
      (current, next) => (next > 0 ? next : current ?? next),
    ),
  }
}

export function mergeIncomeUiFields(
  base: IncomeUiFields,
  overlay: IncomeUiFields | null | undefined,
): IncomeUiFields {
  if (!overlay) return migrateIncomeUiFields(base)
  const migratedBase = migrateIncomeUiFields(base)
  const migratedOverlay = migrateIncomeUiFields(overlay)
  return {
    accountIncomeFunds: {
      ...migratedBase.accountIncomeFunds,
      ...migratedOverlay.accountIncomeFunds,
    },
    accountIncomeStrategies: {
      ...migratedBase.accountIncomeStrategies,
      ...migratedOverlay.accountIncomeStrategies,
    },
    accountWithdrawRates: {
      ...migratedBase.accountWithdrawRates,
      ...migratedOverlay.accountWithdrawRates,
    },
  }
}

export function mergeHydratedCalculatorUi(ui: CalculatorUi): CalculatorUi {
  const snap = loadPersistedAccountIncomeUiFields()
  const merged = mergeIncomeUiFields(ui, snap)
  return {
    ...ui,
    ...merged,
  }
}

export function incomeUiFieldsHaveData(fields: IncomeUiFields | null | undefined): boolean {
  if (!fields) return false
  return (
    Object.keys(fields.accountIncomeFunds).length > 0 ||
    Object.keys(fields.accountIncomeStrategies).length > 0 ||
    Object.keys(fields.accountWithdrawRates).length > 0
  )
}

function parseStoredIncomeUiFields(raw: unknown): IncomeUiFields | null {
  if (!raw || typeof raw !== 'object') return null
  const parsed = raw as Partial<IncomeUiFields>
  return migrateIncomeUiFields({
    accountIncomeFunds:
      parsed.accountIncomeFunds && typeof parsed.accountIncomeFunds === 'object'
        ? parsed.accountIncomeFunds
        : {},
    accountIncomeStrategies:
      parsed.accountIncomeStrategies && typeof parsed.accountIncomeStrategies === 'object'
        ? parsed.accountIncomeStrategies
        : {},
    accountWithdrawRates:
      parsed.accountWithdrawRates && typeof parsed.accountWithdrawRates === 'object'
        ? parsed.accountWithdrawRates
        : {},
  })
}

export function loadPersistedAccountIncomeUiFields(): IncomeUiFields | null {
  if (canWriteExpectifiPlanBlobs()) {
    const fromLocal = parseStoredIncomeUiFields(
      readJsonFromLocalStorage<unknown>(EXPECTIFI_ACCOUNT_INCOME_UI_KEY),
    )
    if (fromLocal) return fromLocal
    const fromSession = loadIncomeUiSnapFromSessionStorage()
    if (fromSession) {
      writeJsonToLocalStorage(EXPECTIFI_ACCOUNT_INCOME_UI_KEY, fromSession)
      return fromSession
    }
    return null
  }
  return loadIncomeUiSnapFromSessionStorage()
}

/** Plan-state payload: prefer dedicated blob, then fall back to session UI fields. */
export function loadAccountIncomeUiFieldsForPlanState(): IncomeUiFields | null {
  const persisted = loadPersistedAccountIncomeUiFields()
  if (incomeUiFieldsHaveData(persisted)) return persisted
  return null
}

export function saveIncomeUiSnap(
  ui: IncomeUiFields,
  options?: { skipServerSync?: boolean; skipTouchSavedAt?: boolean },
): void {
  const migrated = migrateIncomeUiFields(ui)
  if (canWriteExpectifiPlanBlobs()) {
    writeJsonToLocalStorage(EXPECTIFI_ACCOUNT_INCOME_UI_KEY, migrated)
    if (!options?.skipTouchSavedAt) {
      touchLocalPlanStateSavedAt()
    }
    if (!options?.skipServerSync) {
      void import('./planStateServerSync').then(({ queuePlanStateServerSync }) => {
        queuePlanStateServerSync()
      })
    }
    return
  }
  saveIncomeUiSnapToSessionStorage(migrated)
}

function saveIncomeUiSnapToSessionStorage(migrated: IncomeUiFields): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(INCOME_UI_SNAP_KEY, JSON.stringify(migrated))
  } catch {
    /* private mode / quota */
  }
}

function loadIncomeUiSnapFromSessionStorage(): IncomeUiFields | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(INCOME_UI_SNAP_KEY)
    if (!raw) return null
    return parseStoredIncomeUiFields(JSON.parse(raw) as unknown)
  } catch {
    return null
  }
}

/** @deprecated Prefer loadPersistedAccountIncomeUiFields */
export function loadIncomeUiSnap(): IncomeUiFields | null {
  return loadPersistedAccountIncomeUiFields()
}

export function clearIncomeUiSnap(): void {
  if (canWriteExpectifiPlanBlobs()) {
    removeFromLocalStorage(EXPECTIFI_ACCOUNT_INCOME_UI_KEY)
  }
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.removeItem(INCOME_UI_SNAP_KEY)
  } catch {
    /* ignore */
  }
}
