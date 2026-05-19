import { hydrateAppSnapshot } from './appSnapshot'
import {
  loadPersistedCalculatorSession,
  loadStoredAppState,
} from './appStateStorage'
import { loadStoredFidelityImport } from './fidelityStorage'
import { loadBalanceInputMode } from './retirementBalanceMode'
import { loadBrokerageBalanceMode } from './brokerageBalanceMode'
import { DEFAULT_INCOME_PRESETS, type CalculatorInputs, type CalculatorUi } from './computeResults'
import { defaultRetireRegionPick } from './calc/retireRegions'
import { hasPlanningProfilePrefs, loadLocalUserPrefs, userPrefsToCalculatorPatch } from './userPrefs'

export const defaultCalculatorInputs: CalculatorInputs = {
  base401k: 0,
  baseSE401k: 0,
  baseTradIRA: 0,
  baseRoth: 0,
  baseHsa: 0,
  brkBal: 0,
  retRate: 0.07,
  brkRate: 0.07,
  save: 0,
  wdRate: 0.04,
  wdInflation: 0.025,
  incYield: 0.06,
  incGrowth: 0.01,
  ssAge: 67,
  spouseClaimAge: 67,
  ssBenefit62: 0,
  ssBenefit67: 0,
  ssBenefit70: 0,
  married: false,
  spouseDateOfBirth: '',
  spouseHasOwnEarnings: true,
  spouseBenefit62: 0,
  spouseBenefit67: 0,
  spouseBenefit70: 0,
  other: 0,
  retireRegions: [defaultRetireRegionPick('italy')],
  ssInvestPct: 5,
  dateOfBirth: '',
  targetRetirementAge: 0,
  growthGoal: 0,
  monthlyIncomeGoal: 0,
  incomePresets: [...DEFAULT_INCOME_PRESETS],
  positionReturnModels: [],
}

export const defaultCalculatorUi: CalculatorUi = {
  incomeMode: true,
  ssIncluded: false,
}

function applyFidelityBalanceOverrides(inputs: CalculatorInputs): CalculatorInputs {
  const imp = loadStoredFidelityImport()
  if (!imp?.balances) return inputs
  const rabMode = loadBalanceInputMode()
  const brkMode = loadBrokerageBalanceMode()
  const d = { ...inputs }
  if (rabMode === 'fidelity') {
    d.base401k = imp.balances.base401k
    d.baseSE401k = imp.balances.baseSE401k
    d.baseRoth = imp.balances.baseRoth
    d.baseHsa = imp.balances.baseHsa
  }
  if (brkMode === 'fidelity' || rabMode === 'fidelity') {
    d.brkBal = imp.balances.brkBal
  }
  return d
}

function mergeStoredWelcomePrefs(inputs: CalculatorInputs): CalculatorInputs {
  const prefs = loadLocalUserPrefs()
  if (!prefs || !hasPlanningProfilePrefs(prefs)) return inputs
  return { ...inputs, ...userPrefsToCalculatorPatch(prefs) }
}

/** Calculator inputs for welcome gate / first paint (session + headwayplanner_user_prefs). */
export function getInitialCalculatorInputs(): CalculatorInputs {
  const persisted = loadPersistedCalculatorSession(defaultCalculatorInputs, defaultCalculatorUi)
  if (persisted) {
    return applyFidelityBalanceOverrides(persisted.inputs)
  }
  const stored = loadStoredAppState()
  if (stored) {
    const hydrated = hydrateAppSnapshot(stored, defaultCalculatorInputs)
    if (hydrated) {
      return mergeStoredWelcomePrefs(applyFidelityBalanceOverrides(hydrated.inputs))
    }
  }
  return mergeStoredWelcomePrefs(applyFidelityBalanceOverrides({ ...defaultCalculatorInputs }))
}
