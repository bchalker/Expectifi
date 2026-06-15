/** Namespaced localStorage keys for Expectifi plan data. */

export const PLAN_STORAGE_SCHEMA_VERSION = 1 as const

export const EXPECTIFI_META_KEY = 'expectifi/meta-v1'
export const EXPECTIFI_PROFILE_KEY = 'expectifi/profile-v1'
export const EXPECTIFI_ACCOUNTS_KEY = 'expectifi/accounts-v1'
export const EXPECTIFI_SESSION_KEY = 'expectifi/session-v1'
export const EXPECTIFI_ACCOUNT_INCOME_UI_KEY = 'expectifi/account-income-ui-v1'
export const EXPECTIFI_PLAN_STATE_LOCAL_SAVED_AT_KEY = 'expectifi/plan-state-local-saved-at-v1'
export const EXPECTIFI_LIFE_PLANS_KEY = 'expectifi/life-plans-v1'
export const EXPECTIFI_GROWTH_LIFE_EVENTS_KEY = 'expectifi/growth-life-events-v1'
export const EXPECTIFI_LIFE_DISMISSED_KEY = 'expectifi/life-dismissed-suggestions-v1'
export const EXPECTIFI_TAX_SUMMARY_PANEL_OPEN_KEY = 'expectifi/tax-summary-panel-open-v1'

/** Legacy keys migrated once into expectifi/* */
export const LEGACY_APP_STATE_KEY = 'retirement-calculator/app-state-v1'
export const LEGACY_USER_PROFILE_KEY = 'expectifi_user_profile'
export const LEGACY_MANUAL_ACCOUNTS_KEY = 'retirement-calculator/manual-account-entries-v1'
export const LEGACY_WELCOME_COMPLETED_KEY = 'expectifi_welcome_completed'
export const LEGACY_USER_PREFS_KEY = 'expectifi_user_prefs'
export const LEGACY_USER_PROFILE_KEYS = ['hwp_user_profile'] as const
export const LEGACY_WELCOME_COMPLETED_KEYS = ['headwayplanner_welcome_completed'] as const
export const LEGACY_USER_PREFS_KEYS = [
  'headwayplanner_user_prefs',
  'eggspectifi_user_prefs',
] as const
export const LEGACY_BALANCE_INPUT_MODE_KEY = 'retirement-calculator/balance-input-mode'

/** Removed only after a successful migration write to expectifi/*. */
export const MIGRATION_LEGACY_CLEANUP_KEYS = [
  LEGACY_USER_PROFILE_KEY,
  LEGACY_USER_PREFS_KEY,
  LEGACY_WELCOME_COMPLETED_KEY,
  LEGACY_APP_STATE_KEY,
  LEGACY_MANUAL_ACCOUNTS_KEY,
  LEGACY_BALANCE_INPUT_MODE_KEY,
] as const

/** Pre-Phase-A keys that trigger migration when present (includes older aliases). */
export const ALL_LEGACY_PLAN_STORAGE_KEYS = [
  ...MIGRATION_LEGACY_CLEANUP_KEYS,
  ...LEGACY_USER_PROFILE_KEYS,
  ...LEGACY_WELCOME_COMPLETED_KEYS,
  ...LEGACY_USER_PREFS_KEYS,
] as const

export const ALL_EXPECTIFI_PLAN_KEYS = [
  EXPECTIFI_META_KEY,
  EXPECTIFI_PROFILE_KEY,
  EXPECTIFI_ACCOUNTS_KEY,
  EXPECTIFI_SESSION_KEY,
  EXPECTIFI_ACCOUNT_INCOME_UI_KEY,
  EXPECTIFI_LIFE_PLANS_KEY,
  EXPECTIFI_GROWTH_LIFE_EVENTS_KEY,
] as const
