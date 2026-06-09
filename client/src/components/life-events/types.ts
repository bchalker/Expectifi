export type EventPhase = 'growth' | 'income' | 'both'

export type EventType = 'lump-sum-out' | 'recurring-out' | 'lump-sum-in' | 'recurring-in'

export type ImpactRating = 'minimal' | 'light' | 'moderate' | 'heavy' | 'significant'

export interface MortgageEventExtras {
  showTradeoffAnalysis: true
  mortgageRateDefault: number
  monthlyPaymentDefault: number
  mortgageRateMin: number
  mortgageRateMax: number
  mortgageRateStep: number
  tradeoffNarrative: (
    amount: number,
    year: number,
    futureValue: number,
    retirementYear: number,
    mortgageRate: number,
    portfolioGrowthRate: number,
    monthlyPayment: number,
    yearsRemaining: number,
    netAdvantage: number,
    investingWins: boolean,
  ) => string
}

export interface MedicalEventExtras {
  showHsaAnalysis: true
  hsaOffsetNarrative: (
    grossExpense: number,
    hsaBalance: number,
    hsaOffset: number,
    netExpense: number,
    futureValue: number,
    retirementYear: number,
    hasHsa: boolean,
    fullyCovered: boolean,
    hsaSavings: number,
  ) => string
}

export interface LifeEventConfig {
  id: string
  canonicalLabel: string
  displayLabel: string
  type: EventType
  phase: EventPhase
  color: string
  defaultAmount: number
  defaultYear: (currentYear: number, retirementYear: number) => number
  amountMin: number
  amountMax: number
  amountStep: number
  amountLabel: string
  yearLabel: string
  headerTitlePrefix: string
  headerTitleSuffix: string
  formatAmount: (amount: number) => string
  formatHeaderAmount: (amount: number) => string
  narrativeTemplate: (
    amount: number,
    year: number,
    futureValue: number,
    retirementYear: number,
    duration?: number,
  ) => string
  isRecurring: boolean
  defaultDuration?: number
  durationMin?: number
  durationMax?: number
  durationStep?: number
  durationLabel?: string
  extras?: MortgageEventExtras | MedicalEventExtras
}

export interface LifeEventState {
  id: string
  configId: string
  amount: number
  year: number
  isActive: boolean
  isExpanded: boolean
  label?: string
  duration?: number
  /** Pay-off-mortgage card only — persisted in growth life-events storage. */
  mortgageRate?: number
  mortgageMonthlyPayment?: number
  mortgageLoanTermYears?: number
  mortgageLoanStartYear?: number
}

export interface LifeEventCalculated {
  futureValue: number
  afterEventPortfolio: number
  rating: ImpactRating
  totalOutflow?: number
}

export interface EventImpactStripProps {
  baselinePortfolio: number
  afterEventPortfolio: number
  monthlyIncomeLost: number
  isOutflow: boolean
}
