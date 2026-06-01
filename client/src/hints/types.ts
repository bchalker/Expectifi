import type { OnboardingAccountType } from '../lib/manualAccountEntries'
import type { AccountScenarioBucketId } from '../lib/accountReturnScenario'
import type { ScenarioIntentTabId } from '../components/HoldingScenarioIntentTabs'

export type HintLocale = 'US' | 'CA'
export type HintMode = 'growth' | 'income'
export type HintTaxTreatment = 'taxable' | 'taxDeferred' | 'taxFree' | 'medical'

/** Portfolio withdrawal bucket — matches account scenario buckets. */
export type HintAccountType = AccountScenarioBucketId

export type HintLinkAction =
  | { type: 'scenario'; bucket: AccountScenarioBucketId; tab?: ScenarioIntentTabId }
  | { type: 'socialSecurity' }

export type HintSegment =
  | { type: 'text'; value: string }
  /** Bold currency or rate (e.g. $1,800/mo, ~$50,000/yr). */
  | { type: 'value'; value: string }
  | { type: 'link'; label: string; action: HintLinkAction }

export type HintContext = {
  accountBalance: number
  totalPortfolio: number
  isLargestAccount: boolean
  globalRate: number
  accountScenario: string | null
  accountScenarioActive: boolean
  hasSSConfigured: boolean
  ssMonthlyAmount: number
  hasCPPConfigured: boolean
  hasOASConfigured: boolean
  hasMedicalExpensesConfigured: boolean
  projectedMedicalMonthly: number
  conversionRoom: number
  userAccounts: OnboardingAccountType[]
  retirementYear: number
  locale: HintLocale
  mode: HintMode
  accountType: HintAccountType
  userHasBrokerage: boolean
  userHasPretax: boolean
  userHasRoth: boolean
  userHasHsa: boolean
}

export type AccountHintDefinition = {
  countries: readonly string[]
  taxTreatment: HintTaxTreatment
  growthHint: (ctx: HintContext) => HintSegment[] | null
  incomeHint: (ctx: HintContext) => HintSegment[] | null
}
