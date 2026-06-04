import type { AccountScenarioBucketId } from './accountReturnScenario'
import type { AccountDataSource, AllocationProfile } from './allocationProfile'

export type { AllocationProfile } from './allocationProfile'
import type { WithdrawalDisplayBucket } from './withdrawalDisplayOrder'
import type { OnboardingRegionId } from './onboardingRegions'
import {
  ACCOUNT_TYPE_AGGREGATE_BUCKET,
  buildLocaleAccountTypeMetaMap,
  getLocaleAccountTypeOptions,
  resolveOnboardingAccountLocale,
} from './onboardingAccountTypesByLocale'
import { loadSessionOnboardingAccounts } from './sessionFlags'
import { clearPlanAccounts } from './planStorage/accounts'
import { canWritePlanLocalStorage, loadPlanAccounts, savePlanAccounts } from './planStorage'

export const MANUAL_ACCOUNTS_STORAGE_KEY = 'retirement-calculator/manual-account-entries-v1'

export type OnboardingAccountType =
  // US
  | 'brokerage'
  | 'pretax_401k_ira'
  | 'roth_ira'
  | 'hsa'
  | 'pension'
  // Canada
  | 'ca_rrif'
  // Legacy US (stored accounts)
  | 'trad_ira'
  | 'roth_401k'
  | 'trad_401k'
  | 'sep_ira'
  | 'other'
  // UK
  | 'uk_workplace_pension'
  | 'uk_sipp'
  | 'uk_isa'
  | 'uk_lisa'
  | 'uk_defined_benefit'
  // DE
  | 'de_gesetzliche_rente'
  | 'de_bav'
  | 'de_riester'
  | 'de_ruerup'
  | 'de_etf_depot'
  // FR
  | 'fr_retraite_base'
  | 'fr_agirc_arrco'
  | 'fr_per'
  | 'fr_assurance_vie'
  | 'fr_pea'
  // ES
  | 'es_pension_publica'
  | 'es_plan_pensiones'
  | 'es_pias'
  | 'es_cuenta_valores'
  | 'es_sialp'
  // IT
  | 'it_pensione_pubblica'
  | 'it_fondo_pensione'
  | 'it_pip'
  | 'it_conto_titoli'
  // EU / other
  | 'int_occupational_pension'
  | 'int_private_pension'
  | 'int_state_pension'
  | 'int_investment_account'
  | 'int_savings_account'

export type ManualAccountEntry = {
  id: string
  type: OnboardingAccountType | null
  balance: number
  /** How this account was added — manual entry only uses allocation_profile. */
  source?: AccountDataSource
  allocation_profile?: AllocationProfile | null
}

export type StoredManualAccounts = {
  version: 1
  entries: ManualAccountEntry[]
  onboardingCompleted: boolean
  onboardingSkipped: boolean
}

export type ManualAccountTypeMeta = {
  id: OnboardingAccountType
  label: string
  taxHelper: string | null
  taxKind: string
  taxDesc: string
  tone: 'trad' | 'roth' | 'hsa' | 'taxable'
  withdrawalBucket: WithdrawalDisplayBucket
}

/** Legacy US-centric options — kept for backward-compatible stored account metadata. */
export const ONBOARDING_ACCOUNT_TYPE_OPTIONS: ManualAccountTypeMeta[] = [
  {
    id: 'roth_ira',
    label: 'Roth IRA',
    taxHelper: 'After-tax contributions, tax-free withdrawals',
    taxKind: 'Tax-free growth',
    taxDesc: 'After-tax contributions, tax-free withdrawals',
    tone: 'roth',
    withdrawalBucket: 'roth',
  },
  {
    id: 'trad_ira',
    label: 'Traditional IRA',
    taxHelper: 'Pre-tax contributions, taxed on withdrawal',
    taxKind: 'Traditional',
    taxDesc: 'Pre-tax contributions, taxed on withdrawal',
    tone: 'trad',
    withdrawalBucket: 'pretax',
  },
  {
    id: 'roth_401k',
    label: 'Roth 401k',
    taxHelper: 'After-tax contributions, tax-free withdrawals',
    taxKind: 'Tax-free growth',
    taxDesc: 'After-tax contributions, tax-free withdrawals',
    tone: 'roth',
    withdrawalBucket: 'roth',
  },
  {
    id: 'trad_401k',
    label: 'Traditional 401k',
    taxHelper: 'Pre-tax contributions, taxed on withdrawal',
    taxKind: 'Traditional',
    taxDesc: 'Pre-tax contributions, taxed on withdrawal',
    tone: 'trad',
    withdrawalBucket: 'pretax',
  },
  {
    id: 'sep_ira',
    label: 'SEP IRA',
    taxHelper: 'Pre-tax, for self-employed',
    taxKind: 'Traditional',
    taxDesc: 'Pre-tax, for self-employed',
    tone: 'trad',
    withdrawalBucket: 'pretax',
  },
  {
    id: 'pension',
    label: 'Pension',
    taxHelper: "Defined benefit, we'll factor in your monthly payment",
    taxKind: 'Traditional',
    taxDesc: "Defined benefit, we'll factor in your monthly payment",
    tone: 'trad',
    withdrawalBucket: 'pretax',
  },
  {
    id: 'brokerage',
    label: 'Brokerage',
    taxHelper: 'After-tax, capital gains apply',
    taxKind: 'Taxable',
    taxDesc: 'After-tax, capital gains apply',
    tone: 'taxable',
    withdrawalBucket: 'brokerage',
  },
  {
    id: 'hsa',
    label: 'HSA',
    taxHelper: 'Triple tax advantaged if used for healthcare',
    taxKind: 'Triple tax-advantaged',
    taxDesc: 'Triple tax advantaged if used for healthcare',
    tone: 'hsa',
    withdrawalBucket: 'hsa',
  },
  {
    id: 'other',
    label: 'Other',
    taxHelper: null,
    taxKind: 'Other',
    taxDesc: '',
    tone: 'trad',
    withdrawalBucket: 'pretax',
  },
]

const LOCALE_META_BY_ID = buildLocaleAccountTypeMetaMap()

const LEGACY_META_BY_ID = Object.fromEntries(
  ONBOARDING_ACCOUNT_TYPE_OPTIONS.map((o) => [o.id, o]),
) as Record<OnboardingAccountType, ManualAccountTypeMeta>

const META_BY_ID = {
  ...LEGACY_META_BY_ID,
  ...LOCALE_META_BY_ID,
} as Record<OnboardingAccountType, ManualAccountTypeMeta>

/** Typed manual rows with balance — for dashboard account cards (not gated on onboarding flag). */
export function activeManualAccountEntries(
  stored: StoredManualAccounts | null | undefined,
): ManualAccountEntry[] {
  if (!stored?.entries?.length) return []
  return normalizeManualAccountEntries(stored.entries).filter(
    (entry) => entry.type != null && entry.balance > 0,
  )
}

export function manualAccountEntryForBucket(
  entries: ManualAccountEntry[],
  bucket: AccountScenarioBucketId,
  locale?: OnboardingRegionId | null,
): ManualAccountEntry | undefined {
  return entries.find(
    (entry) =>
      entry.type != null &&
      entry.balance > 0 &&
      getAccountTypeMeta(entry.type, locale).withdrawalBucket === bucket,
  )
}

export function getAccountTypeMeta(
  type: OnboardingAccountType,
  locale?: OnboardingRegionId | null,
): ManualAccountTypeMeta {
  const localized = getLocaleAccountTypeOptions(locale ?? resolveOnboardingAccountLocale()).find(
    (option) => option.id === type,
  )
  if (localized) return localized
  return META_BY_ID[type] ?? LEGACY_META_BY_ID[type]
}

export function getUsedOnboardingAccountTypes(
  entries: ManualAccountEntry[],
  excludeEntryId?: string,
): Set<OnboardingAccountType> {
  return new Set(
    entries
      .filter((entry) => entry.id !== excludeEntryId && entry.type != null)
      .map((entry) => entry.type as OnboardingAccountType),
  )
}

export function getOnboardingAccountTypeOptionsForEntry(
  entries: ManualAccountEntry[],
  entryId: string,
  locale?: OnboardingRegionId | null,
): ManualAccountTypeMeta[] {
  const entry = entries.find((item) => item.id === entryId)
  const usedTypes = getUsedOnboardingAccountTypes(entries, entryId)
  const options = getLocaleAccountTypeOptions(locale ?? resolveOnboardingAccountLocale())
  return options.filter((option) => option.id === entry?.type || !usedTypes.has(option.id))
}

export function getNextOnboardingAccountType(
  entries: ManualAccountEntry[],
  locale?: OnboardingRegionId | null,
): OnboardingAccountType | null {
  const usedTypes = getUsedOnboardingAccountTypes(entries)
  const options = getLocaleAccountTypeOptions(locale ?? resolveOnboardingAccountLocale())
  return options.find((option) => !usedTypes.has(option.id))?.id ?? null
}

export function canAddOnboardingAccountEntry(
  entries: ManualAccountEntry[],
  locale?: OnboardingRegionId | null,
): boolean {
  if (entries.some((entry) => entry.type == null)) return false
  return getNextOnboardingAccountType(entries, locale) !== null
}

/** Welcome accounts step: no pre-filled types or balances. */
export function emptyOnboardingAccountEntries(): ManualAccountEntry[] {
  return []
}

/** @deprecated Use emptyOnboardingAccountEntries for welcome; kept for tests/tools. */
export function buildDefaultOnboardingAccountEntries(
  locale?: OnboardingRegionId | null,
): ManualAccountEntry[] {
  const options = getLocaleAccountTypeOptions(locale ?? resolveOnboardingAccountLocale())
  return options.slice(0, 3).map((option) => newManualAccountEntry(option.id))
}

/** Stable id for bucket-derived dashboard rows (survives re-derive from calculator balances). */
export function manualEntryIdForAccountType(type: OnboardingAccountType): string {
  return `manual-entry-${type}`
}

export function newManualAccountEntry(type: OnboardingAccountType | null = null): ManualAccountEntry {
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `acct-${Date.now()}-${Math.random()}`,
    type,
    balance: 0,
    source: 'manual',
    allocation_profile: null,
  }
}

function normalizeManualAccountEntries(entries: ManualAccountEntry[]): ManualAccountEntry[] {
  return entries.map((entry) => ({
    ...entry,
    source: entry.source ?? 'manual',
  }))
}

export function loadStoredManualAccounts(): StoredManualAccounts | null {
  const fromPlan = loadPlanAccounts()
  if (fromPlan) {
    return { ...fromPlan, entries: normalizeManualAccountEntries(fromPlan.entries) }
  }

  if (!canWritePlanLocalStorage()) return null

  try {
    const raw = localStorage.getItem(MANUAL_ACCOUNTS_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredManualAccounts
    if (parsed?.version !== 1 || !Array.isArray(parsed.entries)) return null
    return { ...parsed, entries: normalizeManualAccountEntries(parsed.entries) }
  } catch {
    return null
  }
}

export function saveStoredManualAccounts(state: StoredManualAccounts): void {
  if (!canWritePlanLocalStorage()) return
  savePlanAccounts(state)
}

export function clearStoredManualAccounts(): void {
  clearPlanAccounts()
  try {
    localStorage.removeItem(MANUAL_ACCOUNTS_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function markManualAccountsSkipped(): void {
  saveStoredManualAccounts({
    version: 1,
    entries: [],
    onboardingCompleted: false,
    onboardingSkipped: true,
  })
}

export function saveCompletedManualAccounts(entries: ManualAccountEntry[]): void {
  saveStoredManualAccounts({
    version: 1,
    entries,
    onboardingCompleted: true,
    onboardingSkipped: false,
  })
}

function storedManualAccountsOrEmpty(): StoredManualAccounts {
  return (
    loadStoredManualAccounts() ?? {
      version: 1,
      entries: [],
      onboardingCompleted: true,
      onboardingSkipped: false,
    }
  )
}

/** Update one manual entry's balance (local plan storage). */
export function updateManualAccountEntryBalance(
  entryId: string,
  balance: number,
): ManualAccountEntry[] | null {
  const stored = storedManualAccountsOrEmpty()
  const rounded = Math.max(0, Math.round(balance))
  const entries = stored.entries.map((entry) =>
    entry.id === entryId ? { ...entry, balance: rounded } : entry,
  )
  saveStoredManualAccounts({ ...stored, entries })
  return entries
}

/** Update one manual entry's allocation profile (local plan storage). */
export function updateManualAccountAllocationProfile(
  entryId: string,
  allocationProfile: AllocationProfile | null,
): ManualAccountEntry[] | null {
  const stored = storedManualAccountsOrEmpty()
  const entries = stored.entries.map((entry) =>
    entry.id === entryId
      ? { ...entry, source: entry.source ?? 'manual', allocation_profile: allocationProfile }
      : entry,
  )
  saveStoredManualAccounts({ ...stored, entries })
  return entries
}

/** Bucket totals from the dashboard manual-balance editor (matches `manualBalanceRows`). */
export type ManualBucketBases = {
  base401k: number
  baseSE401k: number
  baseTradIRA: number
  baseRoth: number
  baseHsa: number
  brkBal: number
}

const DASHBOARD_BUCKET_ACCOUNT_TYPES: {
  field: keyof ManualBucketBases
  type: OnboardingAccountType
}[] = [
  { field: 'base401k', type: 'trad_401k' },
  { field: 'baseSE401k', type: 'sep_ira' },
  { field: 'baseTradIRA', type: 'trad_ira' },
  { field: 'baseRoth', type: 'roth_ira' },
  { field: 'baseHsa', type: 'hsa' },
  { field: 'brkBal', type: 'brokerage' },
]

/** Build onboarding-style entries from dashboard bucket inputs (for localStorage restore). */
/** Calculator bucket totals → manual entries (legacy dashboard users without stored entries). */
export function deriveManualAccountEntriesFromBalances(
  bal: {
    bal401k: number
    balSE401k: number
    balTradIRA: number
    balRoth: number
    balHsa: number
  },
  brkBal: number,
): ManualAccountEntry[] {
  return manualEntriesFromBucketBases({
    base401k: Math.max(0, Math.round(bal.bal401k)),
    baseSE401k: Math.max(0, Math.round(bal.balSE401k)),
    baseTradIRA: Math.max(0, Math.round(bal.balTradIRA)),
    baseRoth: Math.max(0, Math.round(bal.balRoth)),
    baseHsa: Math.max(0, Math.round(bal.balHsa)),
    brkBal: Math.max(0, Math.round(brkBal)),
  })
}

export function manualEntriesFromBucketBases(bases: ManualBucketBases): ManualAccountEntry[] {
  const entries: ManualAccountEntry[] = []
  for (const { field, type } of DASHBOARD_BUCKET_ACCOUNT_TYPES) {
    const balance = Math.max(0, Math.round(bases[field]))
    if (balance <= 0) continue
    entries.push({
      ...newManualAccountEntry(type),
      id: manualEntryIdForAccountType(type),
      balance,
    })
  }
  return entries
}

/** Persist manual bucket totals to expectifi/accounts-v1 (browser_saved guests). */
export function saveManualAccountsFromBucketBases(bases: ManualBucketBases): void {
  saveCompletedManualAccounts(manualEntriesFromBucketBases(bases))
}

function parseSessionOnboardingAccountEntries(): ManualAccountEntry[] | null {
  const raw = loadSessionOnboardingAccounts()
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null
    return parsed
      .filter(
        (entry): entry is ManualAccountEntry =>
          !!entry &&
          typeof entry === 'object' &&
          typeof (entry as ManualAccountEntry).id === 'string' &&
          ((entry as ManualAccountEntry).type == null ||
            typeof (entry as ManualAccountEntry).type === 'string') &&
          typeof (entry as ManualAccountEntry).balance === 'number',
      )
      .map((entry) => ({
        ...entry,
        source: entry.source ?? 'manual',
      }))
  } catch {
    return null
  }
}

/** Accounts blob for browser save — uses LS if present, else session onboarding entries. */
export function manualAccountsForBrowserSave(): StoredManualAccounts {
  const stored = loadStoredManualAccounts()
  if (stored?.entries.length) {
    return {
      ...stored,
      onboardingCompleted: true,
      onboardingSkipped: false,
    }
  }
  const sessionEntries = parseSessionOnboardingAccountEntries()
  if (sessionEntries?.length) {
    return {
      version: 1,
      entries: sessionEntries,
      onboardingCompleted: true,
      onboardingSkipped: false,
    }
  }
  return {
    version: 1,
    entries: [],
    onboardingCompleted: true,
    onboardingSkipped: false,
  }
}

export function manualAccountsOnboardingSkipped(): boolean {
  return loadStoredManualAccounts()?.onboardingSkipped === true
}

export function manualAccountsOnboardingCompleted(): boolean {
  return loadStoredManualAccounts()?.onboardingCompleted === true
}

/** True when manual onboarding saved at least one typed account with balance > 0. */
export function storedManualAccountsHaveBalances(): boolean {
  const stored = loadStoredManualAccounts()
  if (!stored?.onboardingCompleted) return false
  const bases = aggregateManualAccountsToBases(stored.entries)
  const retBal =
    bases.base401k + bases.baseSE401k + bases.baseTradIRA + bases.baseRoth + bases.baseHsa
  return retBal + bases.brkBal > 0
}

export function aggregateManualAccountsToBases(entries: ManualAccountEntry[]): {
  base401k: number
  baseSE401k: number
  baseTradIRA: number
  baseRoth: number
  baseHsa: number
  brkBal: number
} {
  const totals = {
    base401k: 0,
    baseSE401k: 0,
    baseTradIRA: 0,
    baseRoth: 0,
    baseHsa: 0,
    brkBal: 0,
  }

  for (const entry of entries) {
    const amount = Math.max(0, Math.round(entry.balance))
    if (amount <= 0 || entry.type == null) continue
    const bucket = ACCOUNT_TYPE_AGGREGATE_BUCKET[entry.type]
    if (bucket) {
      totals[bucket] += amount
    }
  }

  return totals
}
