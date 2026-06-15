import type { AppSnapshotV1 } from './appSnapshot'
import type { StoredManualAccounts } from './manualAccountEntries'
import type { StoredGrowthLifeEvents } from './planStorage/growthLifeEvents'
import type { LifePlans } from './planStorage/life'
import type { StoredPlanProfile } from './planStorage/types'
import type { RetirementPreferences } from '../types/preferences'

export const PLAN_STATE_PAYLOAD_VERSION = 1 as const

export type UserPlanStateBalanceModes = {
  retirement?: 'manual' | 'imported'
  brokerage?: 'manual' | 'imported'
}

export type UserPlanStatePayload = {
  version: typeof PLAN_STATE_PAYLOAD_VERSION
  savedAt: string
  profile: StoredPlanProfile | null
  accounts: StoredManualAccounts | null
  session: AppSnapshotV1 | null
  lifePlans: LifePlans | null
  growthLifeEvents: StoredGrowthLifeEvents | null
  balanceModes: UserPlanStateBalanceModes | null
  retirementPreferences: RetirementPreferences | null
}
