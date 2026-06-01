import { hydrateAppSnapshot } from './appSnapshot'
import {
  loadPersistedCalculatorSession,
  loadStoredAppState,
} from './appStateStorage'
import { applyFidelityBalanceOverrides } from './portfolioSourceExclusivity'
import type { CalculatorInputs, CalculatorUi } from './computeResults'
import { DEFAULT_INCOME_PRESETS } from './incomePresets'
import { stripFinancialFields } from './calculatorInputSanitize'
import { defaultRetireRegionPick } from './calc/retireRegions'
import { hasPlanningProfilePrefs, loadLocalUserPrefs, userPrefsToCalculatorPatch } from './userPrefs'
import { DEFAULT_CALCULATOR_FILING_STATUS } from './filingStatus'
import { loadUserProfile, profileToCalculatorPatch } from './userProfileStorage'

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
  accountReturnScenarios: {},
  marketScenario: 'base',
  marketScenarioActive: false,
  residenceCountry: '',
  filingStatus: DEFAULT_CALCULATOR_FILING_STATUS,
}

export const defaultCalculatorUi: CalculatorUi = {
  incomeMode: true,
  ssIncluded: false,
  incomeSecurityTicker: null,
}

function mergeStoredWelcomePrefs(inputs: CalculatorInputs): CalculatorInputs {
  const prefs = loadLocalUserPrefs()
  if (!prefs || !hasPlanningProfilePrefs(prefs)) return inputs
  return { ...inputs, ...userPrefsToCalculatorPatch(prefs) }
}

function mergeStoredProfile(inputs: CalculatorInputs): CalculatorInputs {
  const profile = loadUserProfile()
  if (!profile) return inputs
  return { ...inputs, ...profileToCalculatorPatch(profile) }
}

/** Calculator inputs for welcome gate / first paint (session + expectifi_user_prefs). */
export function getInitialCalculatorInputs(): CalculatorInputs {
  const persisted = loadPersistedCalculatorSession(defaultCalculatorInputs, defaultCalculatorUi, {
    stripFinancial: true,
  })
  if (persisted) {
    return applyFidelityBalanceOverrides(stripFinancialFields(persisted.inputs))
  }
  const stored = loadStoredAppState()
  if (stored) {
    const hydrated = hydrateAppSnapshot(stored, defaultCalculatorInputs)
    if (hydrated) {
      return mergeStoredProfile(
        mergeStoredWelcomePrefs(applyFidelityBalanceOverrides(stripFinancialFields(hydrated.inputs))),
      )
    }
  }
  return mergeStoredProfile(mergeStoredWelcomePrefs(applyFidelityBalanceOverrides({ ...defaultCalculatorInputs })))
}
