import type { WithdrawalDisplayBucket } from './withdrawalDisplayOrder'
import type { OnboardingRegionId } from './onboardingRegions'
import {
  ACCOUNT_TYPE_AGGREGATE_BUCKET,
  buildLocaleAccountTypeMetaMap,
  getLocaleAccountTypeOptions,
  resolveOnboardingAccountLocale,
} from './onboardingAccountTypesByLocale'
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

export function newManualAccountEntry(type: OnboardingAccountType | null = null): ManualAccountEntry {
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `acct-${Date.now()}-${Math.random()}`,
    type,
    balance: 0,
  }
}

export function loadStoredManualAccounts(): StoredManualAccounts | null {
  const fromPlan = loadPlanAccounts()
  if (fromPlan) return fromPlan

  if (!canWritePlanLocalStorage()) return null

  try {
    const raw = localStorage.getItem(MANUAL_ACCOUNTS_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredManualAccounts
    if (parsed?.version !== 1 || !Array.isArray(parsed.entries)) return null
    return parsed
  } catch {
    return null
  }
}

export function saveStoredManualAccounts(state: StoredManualAccounts): void {
  if (!canWritePlanLocalStorage()) return
  savePlanAccounts(state)
}

export function clearStoredManualAccounts(): void {
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
