import type { AppSnapshotV1 } from '../appSnapshot'
import type { StoredUserProfile } from '../storedUserProfile'
import type { StoredManualAccounts } from '../manualAccountEntries'
import type { CalculatorInputs, CalculatorUi } from '../computeResults'

/** Persisted tier for guests without auth (auth tiers derived from session). */
export type PersistedGuestTier = 'anonymous' | 'browser_saved'

export const PLAN_META_VERSION = 1 as const

export type ExpectifiMeta = {
  version: typeof PLAN_META_VERSION
  tier: PersistedGuestTier
  visitCount: number
  /**
   * Last meaningful edit to a browser-saved guest plan (ISO). Used for 30-day
   * inactivity expiry — not session TTL, auth expiry, or cache busting.
   */
  lastActiveAt?: string
  /** ISO timestamps for Phase B+ prompts */
  prompts: {
    savePlanAcceptedAt?: string
    savePlanDismissedAt?: string
    returnVisitNudgeShownAt?: string
  }
}

export type StoredPlanProfile = StoredUserProfile & {
  onboardingComplete?: boolean
}

export type PlanSessionSnapshot = AppSnapshotV1

export type UserTier =
  | 'anonymous'
  | 'browser_saved'
  | 'authenticated_free'
  | 'pro'

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused'
  | 'none'

export type AuthTierInput = {
  subscriptionStatus?: SubscriptionStatus
} | null

export type PlanHydration = {
  tier: UserTier
  inputs: CalculatorInputs
  ui: CalculatorUi
  phase: 'growth' | 'income'
  activePreset: string | null
  /** When true, skip onboarding overlay */
  onboardingComplete: boolean
  profile: StoredPlanProfile | null
  accounts: StoredManualAccounts | null
}

export type PlanPersistSnapshot = {
  inputs: CalculatorInputs
  ui: CalculatorUi
  phase: 'growth' | 'income'
  activePreset: string | null
  profile: StoredPlanProfile | null
  accounts: StoredManualAccounts | null
}
