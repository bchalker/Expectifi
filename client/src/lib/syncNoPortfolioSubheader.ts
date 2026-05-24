import { defaultRetireRegionPick } from './calc/retireRegions'
import { hydrateAppSnapshot } from './appSnapshot'
import { loadStoredAppState } from './appStateStorage'
import { computeResults, type CalculatorInputs, type CalculatorUi } from './computeResults'
import { loadBrokerageBalanceMode } from './brokerageBalanceMode'
import { loadBalanceInputMode } from './retirementBalanceMode'
import { applyFidelityBalanceOverrides } from './portfolioSourceExclusivity'

const BOOTSTRAP_DEFAULT_INPUTS: CalculatorInputs = {
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
  targetRetirementAge: 62,
  growthGoal: 0,
  monthlyIncomeGoal: 0,
  incomePresets: [],
  positionReturnModels: [],
  residenceCountry: '',
}

const BOOTSTRAP_DEFAULT_UI: CalculatorUi = {
  incomeMode: true,
  ssIncluded: false,
  incomeSecurityTicker: null,
}

function bootstrapInputsFromStorage(): CalculatorInputs {
  let inputs: CalculatorInputs = { ...BOOTSTRAP_DEFAULT_INPUTS }
  const stored = loadStoredAppState()
  if (stored) {
    const hydrated = hydrateAppSnapshot(stored, inputs)
    if (hydrated) inputs = hydrated.inputs
  }
  return applyFidelityBalanceOverrides(inputs)
}

/** Match `computeResults().hasPortfolioBalances` from persisted local state (pre-React). */
export function readHasPortfolioBalancesFromStorage(): boolean {
  if (typeof window === 'undefined') return false
  const inputs = bootstrapInputsFromStorage()
  const balanceModes = {
    retirement: loadBalanceInputMode(),
    brokerage: loadBrokerageBalanceMode(),
  }
  return computeResults(inputs, BOOTSTRAP_DEFAULT_UI, balanceModes).hasPortfolioBalances
}

/** Keep subheader wave band collapsed before paint when there is no portfolio. */
export function syncNoPortfolioSubheaderDocumentAttr(hasPortfolioBalances?: boolean): void {
  if (typeof document === 'undefined') return
  const has =
    typeof hasPortfolioBalances === 'boolean'
      ? hasPortfolioBalances
      : readHasPortfolioBalancesFromStorage()
  if (has) {
    document.documentElement.removeAttribute('data-no-portfolio-subheader')
  } else {
    document.documentElement.setAttribute('data-no-portfolio-subheader', 'true')
  }
}
