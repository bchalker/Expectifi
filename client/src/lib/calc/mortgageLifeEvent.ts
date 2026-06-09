export const MORTGAGE_LOAN_TERM_YEARS = [10, 15, 20, 25, 30] as const

export type MortgageLoanTermYears = (typeof MORTGAGE_LOAN_TERM_YEARS)[number]

export type MortgageAmortizationSchedule = {
  /** Months until balance reaches zero at the current payment. */
  monthsToNaturalPayoff: number
  naturalPayoffYear: number
  /** Total interest in the schedule after `payoffMonth` (0-based from today). */
  interestSavedIfPayoffAtMonth: (payoffMonth: number) => number
}

export type MortgageLifeEventDerived = {
  schedule: MortgageAmortizationSchedule
  payoffYearMin: number
  payoffYearMax: number
  /** Contractual maturity: loan start year + loan term. */
  scheduledPayoffYear: number
  /** Amortized payoff from remaining balance and monthly payment. */
  amortizedPayoffYear: number
  interestSavedAtPayoffYear: number
}

export type MortgageTradeoffResult = {
  investmentGain: number
  interestSaved: number
  netAdvantageOfInvesting: number
  investingWins: boolean
}

function roundCents(n: number): number {
  return Math.round(n / 100) * 100
}

/** Months until loan is paid off at the current payment (Infinity if payment ≤ interest). */
export function calcMonthsToNaturalPayoff(
  balance: number,
  annualRate: number,
  monthlyPayment: number,
): number {
  if (balance <= 0 || monthlyPayment <= 0) return 0
  const r = annualRate / 12
  if (r <= 0) return Math.ceil(balance / monthlyPayment)
  if (monthlyPayment <= balance * r) return Number.POSITIVE_INFINITY

  const ratio = 1 - (balance * r) / monthlyPayment
  if (ratio <= 0) return Number.POSITIVE_INFINITY
  return Math.ceil(-Math.log(ratio) / Math.log(1 + r))
}

export function buildMortgageAmortizationSchedule(
  balance: number,
  annualRate: number,
  monthlyPayment: number,
  currentYear: number,
): MortgageAmortizationSchedule {
  const monthsToNaturalPayoff = calcMonthsToNaturalPayoff(balance, annualRate, monthlyPayment)
  const naturalPayoffYear =
    monthsToNaturalPayoff === Number.POSITIVE_INFINITY
      ? currentYear + 30
      : currentYear + Math.floor((monthsToNaturalPayoff - 1) / 12)

  const monthInterest: number[] = []
  let b = balance
  const r = annualRate / 12

  for (let m = 0; m < monthsToNaturalPayoff && b > 0.01; m++) {
    const interest = r > 0 ? b * r : 0
    const principal = Math.min(Math.max(0, monthlyPayment - interest), b)
    monthInterest.push(interest)
    b -= principal
  }

  const interestSavedIfPayoffAtMonth = (payoffMonth: number): number => {
    const start = Math.max(0, Math.min(Math.floor(payoffMonth), monthInterest.length))
    let sum = 0
    for (let i = start; i < monthInterest.length; i++) {
      sum += monthInterest[i]
    }
    return roundCents(sum)
  }

  return {
    monthsToNaturalPayoff,
    naturalPayoffYear,
    interestSavedIfPayoffAtMonth,
  }
}

export function payoffMonthFromYear(
  payoffYear: number,
  currentYear: number,
): number {
  return Math.max(0, (payoffYear - currentYear) * 12)
}

export function getMortgageScheduledPayoffYear(
  loanTermYears: number,
  loanStartYear: number,
): number {
  return loanStartYear + loanTermYears
}

/** Interest avoided by paying off early vs continuing until scheduled maturity. */
export function calcInterestSavedVsScheduledPayoff(
  balance: number,
  annualRate: number,
  monthlyPayment: number,
  currentYear: number,
  scheduledPayoffYear: number,
  selectedPayoffYear: number,
): number {
  const scheduledMonth = payoffMonthFromYear(scheduledPayoffYear, currentYear)
  const selectedMonth = payoffMonthFromYear(selectedPayoffYear, currentYear)
  if (selectedMonth >= scheduledMonth || balance <= 0 || monthlyPayment <= 0) return 0

  const monthInterest: number[] = []
  let b = balance
  const r = annualRate / 12

  for (let m = 0; m < scheduledMonth && b > 0.01; m++) {
    const interest = r > 0 ? b * r : 0
    const principal = Math.min(Math.max(0, monthlyPayment - interest), b)
    monthInterest.push(interest)
    b -= principal
  }

  let sum = 0
  for (let i = selectedMonth; i < monthInterest.length; i++) {
    sum += monthInterest[i]
  }
  return roundCents(sum)
}

export function calcMortgageYearsEarly(
  selectedYear: number,
  scheduledPayoffYear: number,
): number {
  return Math.max(0, scheduledPayoffYear - selectedYear)
}

export function formatMortgageYearsEarlyPill(
  selectedYear: number,
  scheduledPayoffYear: number,
): string {
  const yearsEarly = calcMortgageYearsEarly(selectedYear, scheduledPayoffYear)
  if (yearsEarly <= 0) return 'On schedule'
  const unit = yearsEarly === 1 ? 'year' : 'years'
  return `${yearsEarly} ${unit} early`
}

export function formatMortgagePayoffAriaLabel(
  selectedYear: number,
  scheduledPayoffYear: number,
): string {
  const yearsEarly = calcMortgageYearsEarly(selectedYear, scheduledPayoffYear)
  if (yearsEarly <= 0) return `Pay off ${selectedYear}, on schedule`
  const unit = yearsEarly === 1 ? 'year' : 'years'
  return `Pay off ${selectedYear}, ${yearsEarly} ${unit} early`
}

/** @deprecated Use formatMortgagePayoffAriaLabel — kept for any external callers */
export function formatMortgagePayoffSliderLabel(
  selectedYear: number,
  scheduledPayoffYear: number,
): string {
  const yearsEarly = calcMortgageYearsEarly(selectedYear, scheduledPayoffYear)
  if (yearsEarly <= 0) {
    return `Pay off by ${selectedYear} · on schedule`
  }
  const unit = yearsEarly === 1 ? 'year' : 'years'
  return `Pay off by ${selectedYear} · ${yearsEarly} ${unit} early`
}

export function clampMortgagePayoffYear(
  year: number,
  currentYear: number,
  retirementYear: number,
  loanTermYears: number,
  loanStartYear: number,
): number {
  const bounds = getMortgagePayoffYearBounds(
    currentYear,
    retirementYear,
    loanTermYears,
    loanStartYear,
  )
  return Math.min(Math.max(Math.round(year), bounds.payoffYearMin), bounds.payoffYearMax)
}

export function getMortgagePayoffYearBounds(
  currentYear: number,
  retirementYear: number,
  loanTermYears: number,
  loanStartYear: number,
): Pick<
  MortgageLifeEventDerived,
  'payoffYearMin' | 'payoffYearMax' | 'scheduledPayoffYear'
> {
  const scheduledPayoffYear = getMortgageScheduledPayoffYear(loanTermYears, loanStartYear)
  const payoffYearMin = currentYear + 1
  const payoffYearMax = Math.max(payoffYearMin, retirementYear)

  return {
    payoffYearMin,
    payoffYearMax,
    scheduledPayoffYear,
  }
}

export function getDefaultMortgagePayoffYear(
  currentYear: number,
  retirementYear: number,
  loanTermYears: number,
  loanStartYear: number,
): number {
  const bounds = getMortgagePayoffYearBounds(
    currentYear,
    retirementYear,
    loanTermYears,
    loanStartYear,
  )
  return Math.min(bounds.scheduledPayoffYear, bounds.payoffYearMax)
}

export function deriveMortgageLifeEvent(
  balance: number,
  annualRate: number,
  monthlyPayment: number,
  payoffYear: number,
  currentYear: number,
  retirementYear: number,
  loanTermYears: number,
  loanStartYear: number,
): MortgageLifeEventDerived {
  const schedule = buildMortgageAmortizationSchedule(
    balance,
    annualRate,
    monthlyPayment,
    currentYear,
  )
  const bounds = getMortgagePayoffYearBounds(
    currentYear,
    retirementYear,
    loanTermYears,
    loanStartYear,
  )

  return {
    schedule,
    ...bounds,
    amortizedPayoffYear: schedule.naturalPayoffYear,
    interestSavedAtPayoffYear: calcInterestSavedVsScheduledPayoff(
      balance,
      annualRate,
      monthlyPayment,
      currentYear,
      bounds.scheduledPayoffYear,
      payoffYear,
    ),
  }
}

export function calcMortgageTradeoff(
  payoffAmount: number,
  _mortgageRate: number,
  portfolioGrowthRate: number,
  eventYear: number,
  retirementYear: number,
  interestSaved: number,
): MortgageTradeoffResult {
  const yearsToRetirement = Math.max(0, retirementYear - eventYear)
  const investmentGain =
    yearsToRetirement > 0
      ? payoffAmount * (Math.pow(1 + portfolioGrowthRate, yearsToRetirement) - 1)
      : 0
  const roundedInterestSaved = roundCents(interestSaved)
  const netAdvantageOfInvesting = roundCents(investmentGain - roundedInterestSaved)

  return {
    investmentGain: roundCents(investmentGain),
    interestSaved: roundedInterestSaved,
    netAdvantageOfInvesting,
    investingWins: netAdvantageOfInvesting > 0,
  }
}

/** Portfolio growth rate where staying invested and paying off early are equivalent. */
export function calcMortgageBreakEvenRate(
  payoffAmount: number,
  interestSaved: number,
  eventYear: number,
  retirementYear: number,
): number | null {
  const years = Math.max(0, retirementYear - eventYear)
  if (payoffAmount <= 0 || years <= 0 || interestSaved <= 0) return null
  const ratio = 1 + interestSaved / payoffAmount
  if (ratio <= 0) return null
  return Math.pow(ratio, 1 / years) - 1
}

export function formatMortgageBreakEvenSentence(
  breakEvenRate: number | null,
  mortgageRate: number,
): string | null {
  if (breakEvenRate == null || !Number.isFinite(breakEvenRate)) return null
  const bePct = (breakEvenRate * 100).toFixed(1)
  const ratesEqual = Math.abs(breakEvenRate - mortgageRate) < 0.0005
  if (ratesEqual) {
    return `The recommendation flips if your portfolio grows below ${bePct}% annually — equal to your mortgage rate.`
  }
  return `The recommendation flips if your portfolio grows below ${bePct}% annually.`
}

export function defaultMortgageLoanStartYear(currentYear: number, loanTermYears = 30): number {
  return Math.max(2000, currentYear - Math.min(loanTermYears, 15))
}

export function normalizeMortgageLoanTermYears(raw: unknown): MortgageLoanTermYears {
  const n = typeof raw === 'number' && Number.isFinite(raw) ? Math.round(raw) : 30
  if ((MORTGAGE_LOAN_TERM_YEARS as readonly number[]).includes(n)) {
    return n as MortgageLoanTermYears
  }
  return 30
}

export function normalizeMortgageLoanStartYear(
  raw: unknown,
  currentYear: number,
): number {
  const fallback = defaultMortgageLoanStartYear(currentYear)
  const n = typeof raw === 'number' && Number.isFinite(raw) ? Math.round(raw) : fallback
  return Math.min(currentYear, Math.max(2000, n))
}
