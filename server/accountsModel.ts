/** User-scoped portfolio account row (manual, CSV import, or Plaid). */
export type AccountSource = 'manual' | 'csv' | 'plaid'

export type AllocationProfile =
  | 'aggressive'
  | 'moderate'
  | 'conservative'
  | 'all_equities'

export type AccountRow = {
  id: string
  user_id: string
  account_type: string
  balance: number
  source: AccountSource
  allocation_profile: AllocationProfile | null
  label: string | null
  created_at: Date
  updated_at: Date
}

export const ACCOUNT_SOURCE_VALUES: readonly AccountSource[] = ['manual', 'csv', 'plaid']

export const ALLOCATION_PROFILE_VALUES: readonly AllocationProfile[] = [
  'aggressive',
  'moderate',
  'conservative',
  'all_equities',
]

export function parseAccountSource(raw: unknown): AccountSource | null {
  if (raw === 'manual' || raw === 'csv' || raw === 'plaid') return raw
  return null
}

export function parseAllocationProfile(raw: unknown): AllocationProfile | null {
  if (
    raw === 'aggressive' ||
    raw === 'moderate' ||
    raw === 'conservative' ||
    raw === 'all_equities'
  ) {
    return raw
  }
  return null
}
