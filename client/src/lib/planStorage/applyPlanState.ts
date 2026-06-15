import { saveBrokerageBalanceMode } from '../brokerageBalanceMode'
import { saveBalanceInputMode } from '../retirementBalanceMode'
import {
  migrateIncomeUiFields,
  saveIncomeUiSnap,
  type IncomeUiFields,
} from '../accountIncomeStorage'
import {
  normalizeRetirementPreferences,
  saveRetirementPreferences,
} from '../../types/preferences'
import type { UserPlanStatePayload } from '../planStateTypes'
import { loadPlanSession, savePlanSession } from './session'
import {
  normalizeStoredGrowthLifeEvents,
  type StoredGrowthLifeEvents,
} from './growthLifeEvents'
import {
  EXPECTIFI_ACCOUNTS_KEY,
  EXPECTIFI_GROWTH_LIFE_EVENTS_KEY,
  EXPECTIFI_LIFE_PLANS_KEY,
  EXPECTIFI_PROFILE_KEY,
  EXPECTIFI_SESSION_KEY,
} from './keys'
import { normalizeLifePlans, type LifePlans } from './life'
import { writeJsonToLocalStorage } from './storageUtils'

export const ACCOUNT_INCOME_UI_UPDATED_EVENT = 'account-income-ui-updated'

/** Apply server plan state to localStorage (bypasses tier write guards). */
export function applyPlanStatePayloadToLocal(payload: UserPlanStatePayload): void {
  if (payload.profile) {
    writeJsonToLocalStorage(EXPECTIFI_PROFILE_KEY, payload.profile)
  }
  if (payload.accounts) {
    writeJsonToLocalStorage(EXPECTIFI_ACCOUNTS_KEY, payload.accounts)
  }
  if (payload.session) {
    writeJsonToLocalStorage(EXPECTIFI_SESSION_KEY, payload.session)
  }
  if (payload.lifePlans) {
    const normalized = normalizeLifePlans(payload.lifePlans as Partial<LifePlans>)
    writeJsonToLocalStorage(EXPECTIFI_LIFE_PLANS_KEY, normalized)
  }
  if (payload.growthLifeEvents) {
    const normalized = normalizeStoredGrowthLifeEvents(
      payload.growthLifeEvents as StoredGrowthLifeEvents,
    )
    writeJsonToLocalStorage(EXPECTIFI_GROWTH_LIFE_EVENTS_KEY, normalized)
  }
  if (payload.balanceModes?.retirement) {
    saveBalanceInputMode(payload.balanceModes.retirement)
  }
  if (payload.balanceModes?.brokerage) {
    saveBrokerageBalanceMode(payload.balanceModes.brokerage)
  }
  if (payload.retirementPreferences) {
    saveRetirementPreferences(
      normalizeRetirementPreferences(payload.retirementPreferences),
    )
    window.dispatchEvent(new CustomEvent('retirement-preferences-updated'))
  }
  if (payload.accountIncomeUi) {
    const normalized = migrateIncomeUiFields(payload.accountIncomeUi as IncomeUiFields)
    saveIncomeUiSnap(normalized, { skipServerSync: true })
    const session = loadPlanSession()
    if (session) {
      savePlanSession({
        ...session,
        ui: {
          ...session.ui,
          ...normalized,
        },
      })
    }
    window.dispatchEvent(new CustomEvent(ACCOUNT_INCOME_UI_UPDATED_EVENT))
  }
}
