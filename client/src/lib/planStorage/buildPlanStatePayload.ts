import { loadBrokerageBalanceMode } from '../brokerageBalanceMode'
import { loadBalanceInputMode } from '../retirementBalanceMode'
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
      events: loadGrowthLifeEvents(),
    }),
    balanceModes: {
      retirement: loadBalanceInputMode(),
      brokerage: loadBrokerageBalanceMode(),
    },
  }
}
