import type { WithdrawalDisplayBucket } from './withdrawalDisplayOrder'

export const MANUAL_ACCOUNTS_STORAGE_KEY = 'retirement-calculator/manual-account-entries-v1'

export type OnboardingAccountType =
  | 'roth_ira'
  | 'trad_ira'
  | 'roth_401k'
  | 'trad_401k'
  | 'sep_ira'
  | 'pension'
  | 'brokerage'
  | 'hsa'
  | 'other'

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

const META_BY_ID = Object.fromEntries(ONBOARDING_ACCOUNT_TYPE_OPTIONS.map((o) => [o.id, o])) as Record<
  OnboardingAccountType,
  ManualAccountTypeMeta
>

export function getAccountTypeMeta(type: OnboardingAccountType): ManualAccountTypeMeta {
  return META_BY_ID[type]
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
): ManualAccountTypeMeta[] {
  const entry = entries.find((item) => item.id === entryId)
  const usedTypes = getUsedOnboardingAccountTypes(entries, entryId)
  return ONBOARDING_ACCOUNT_TYPE_OPTIONS.filter(
    (option) => option.id === entry?.type || !usedTypes.has(option.id),
  )
}

export function getNextOnboardingAccountType(
  entries: ManualAccountEntry[],
): OnboardingAccountType | null {
  const usedTypes = getUsedOnboardingAccountTypes(entries)
  return ONBOARDING_ACCOUNT_TYPE_OPTIONS.find((option) => !usedTypes.has(option.id))?.id ?? null
}

export function canAddOnboardingAccountEntry(entries: ManualAccountEntry[]): boolean {
  if (entries.some((entry) => entry.type == null)) return false
  return getNextOnboardingAccountType(entries) !== null
}

export function newManualAccountEntry(type: OnboardingAccountType | null = null): ManualAccountEntry {
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `acct-${Date.now()}-${Math.random()}`,
    type,
    balance: 0,
  }
}

export function loadStoredManualAccounts(): StoredManualAccounts | null {
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
  try {
    localStorage.setItem(MANUAL_ACCOUNTS_STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
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
    switch (entry.type) {
      case 'trad_401k':
        totals.base401k += amount
        break
      case 'sep_ira':
        totals.baseSE401k += amount
        break
      case 'trad_ira':
      case 'pension':
      case 'other':
        totals.baseTradIRA += amount
        break
      case 'roth_ira':
      case 'roth_401k':
        totals.baseRoth += amount
        break
      case 'hsa':
        totals.baseHsa += amount
        break
      case 'brokerage':
        totals.brkBal += amount
        break
      default:
        break
    }
  }

  return totals
}
