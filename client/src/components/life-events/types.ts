export type LifeEventGroupId = 'capital-decisions' | 'unexpected-hits' | 'windfalls'

export type LifeEventDirection = 'outflow' | 'inflow'

export type ImpactRating = 'minimal' | 'light' | 'moderate' | 'heavy' | 'significant'

/** Per-instance fields — lump sum only, no recurring. */
export interface LifeEventInstance {
  id: string
  label: string
  amount: number
  year: number
  isExpanded: boolean
  pendingDelete?: boolean
  financingEnabled?: boolean
  loanAmount?: number
  loanRate?: number
  loanTermYears?: number
  financedAmount?: number
  mortgageRate?: number
  mortgageMonthlyPayment?: number
  mortgageLoanTermYears?: number
  mortgageLoanStartYear?: number
  downPayment?: number
  hsaOffsetAmount?: number
  plan529GrowthRate?: number
  expectedReturn?: number
  timelineYears?: number
  description?: string
  divorceIsPercent?: boolean
  divorcePercent?: number
  investedAccount?: string
  taxRate?: number
  taxWithholding?: number
}

/** One card per event type; instances live inside as accordion rows. */
export interface LifeEventTypeCard {
  configId: string
  isActive: boolean
  isExpanded: boolean
  instances: LifeEventInstance[]
}

export interface LifeEventConfig {
  id: string
  group: LifeEventGroupId
  direction: LifeEventDirection
  title: string
  /** Plural noun for multi-instance detail lines, e.g. "vehicles" */
  instanceNoun: string
  supportsMultiple: boolean
  labelPlaceholder: string
  addInstanceLabel: string
  defaultAmount: number
  defaultYear: (currentYear: number, retirementYear: number) => number
  amountMin: number
  amountMax: number
  amountStep: number
  amountLabel: string
  yearLabel: string
  color: string
}

export interface InstanceImpactResult {
  futureValue: number
  rating: ImpactRating
  netAmount: number
  hsaResult?: {
    grossExpense: number
    hsaOffset: number
    netExpense: number
    fullyCovered: boolean
    hasHsa: boolean
  }
  hsaSavings?: number
}

export interface TypeCardImpactResult {
  totalFutureValue: number
  totalNetAmount: number
  highestRating: ImpactRating
  instanceResults: Map<string, InstanceImpactResult>
}

export type LifeEventFilterId = 'all' | LifeEventGroupId

export interface EventImpactStripProps {
  baselinePortfolio: number
  afterEventPortfolio: number
  monthlyIncomeLost: number
  isOutflow: boolean
}
