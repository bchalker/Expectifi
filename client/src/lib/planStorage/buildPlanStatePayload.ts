import { loadBrokerageBalanceMode } from '../brokerageBalanceMode'
import { loadBalanceInputMode } from '../retirementBalanceMode'
import {
  incomeUiFieldsHaveData,
  loadAccountIncomeUiFieldsForPlanState,
  migrateIncomeUiFields,
  type IncomeUiFields,
} from '../accountIncomeStorage'
import { loadRetirementPreferences } from '../../types/preferences'
import type { UserPlanStatePayload } from '../planStateTypes'
import { loadPlanAccounts } from './accounts'
import {
  GROWTH_LIFE_EVENTS_VERSION,
  loadGrowthLifeEvents,
  normalizeStoredGrowthLifeEvents,
} from './growthLifeEvents'
import { loadLifePlans } from './life'
import { loadPlanProfile } from './profile'
import { loadPlanSession } from './session'

function resolveAccountIncomeUiForPlanState(): IncomeUiFields | null {
  const persisted = loadAccountIncomeUiFieldsForPlanState()
  if (persisted) return persisted

  const session = loadPlanSession()
  if (!session?.ui) return null
  const fromSession = migrateIncomeUiFields({
    accountIncomeFunds: session.ui.accountIncomeFunds ?? {},
    accountIncomeStrategies: session.ui.accountIncomeStrategies ?? {},
    accountWithdrawRates: session.ui.accountWithdrawRates ?? {},
  })
  return incomeUiFieldsHaveData(fromSession) ? fromSession : null
}

export function buildPlanStatePayloadFromLocal(): UserPlanStatePayload {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    profile: loadPlanProfile(),
    accounts: loadPlanAccounts(),
    session: loadPlanSession(),
    lifePlans: loadLifePlans(),
    growthLifeEvents: normalizeStoredGrowthLifeEvents({
      version: GROWTH_LIFE_EVENTS_VERSION,
      cards: loadGrowthLifeEvents(),
    }),
    balanceModes: {
      retirement: loadBalanceInputMode(),
      brokerage: loadBrokerageBalanceMode(),
    },
    retirementPreferences: loadRetirementPreferences(),
    accountIncomeUi: resolveAccountIncomeUiForPlanState(),
  }
}
