import type { ComputedSnapshot, CalculatorInputs } from '../computeResults'
import { deriveDisplayLabel } from '../lifeEventDisplayLabels'
import { colorForEventType, eventDefaultsForLabel, eventTypeForCanonicalLabel } from '../lifeEventCatalog'

export type LifeEventType = 'lump-sum-out' | 'recurring-out' | 'lump-sum-in' | 'recurring-in'

export type EventPhase = 'growth' | 'income' | 'both'

export type LifeEvent = {
  id: string
  canonicalLabel: string
  displayLabel: string
  type: LifeEventType
  amount: number
  year: number
  duration?: number
  color: string
  phase: EventPhase
}

export const LIFE_EVENT_COLORS = {
  red: '#E24B4A',
  amber: '#EF9F27',
  teal: '#1D9E75',
  green: '#639922',
} as const

export type LifeEventsProjectionData = {
  currentYear: number
  retirementYear: number
  yearsToRetirement: number
  retBal: number
  brkBal: number
  retRate: number
  brkRate: number
  annualSave: number
  baselineTotalAtRetirement: number
}

export type YearlyProjection = {
  years: number[]
  portfolioValues: number[]
  totalAtRetirement: number
}

export function buildLifeEventsProjectionData(
  c: ComputedSnapshot,
  inputs: Pick<CalculatorInputs, 'retRate' | 'brkRate' | 'save'>,
): LifeEventsProjectionData {
  const currentYear = c.retirementCalendarYear - c.yearsToRetirement
  return {
    currentYear,
    retirementYear: c.retirementCalendarYear,
    yearsToRetirement: c.yearsToRetirement,
    retBal: c.retBal,
    brkBal: c.brkBal,
    retRate: inputs.retRate,
    brkRate: inputs.brkRate,
    annualSave: inputs.save,
    baselineTotalAtRetirement: c.totalFV,
  }
}

export function blendedGrowthRate(data: LifeEventsProjectionData): number {
  const total = data.retBal + data.brkBal
  if (total <= 0) return data.retRate
  return (data.retBal * data.retRate + data.brkBal * data.brkRate) / total
}

export function eventNetForYear(events: LifeEvent[], year: number): number {
  let net = 0
  for (const e of events) {
    if (e.type === 'lump-sum-out' && e.year === year) net -= e.amount
    if (e.type === 'lump-sum-in' && e.year === year) net += e.amount
    if (e.type === 'recurring-out' || e.type === 'recurring-in') {
      const dur = Math.max(1, e.duration ?? 1)
      const endYear = e.year + dur - 1
      if (year >= e.year && year <= endYear) {
        const annual = e.amount * 12
        net += e.type === 'recurring-out' ? -annual : annual
      }
    }
  }
  return net
}

/** Year-by-year portfolio path from today through retirement, optionally with life events. */
export function projectPortfolioTimeline(
  data: LifeEventsProjectionData,
  events: LifeEvent[] = [],
): YearlyProjection {
  const { currentYear, retirementYear, retBal, brkBal, retRate, brkRate, annualSave } = data
  const years: number[] = []
  const portfolioValues: number[] = []

  let ret = retBal
  let brk = brkBal

  years.push(currentYear)
  portfolioValues.push(ret + brk)

  const horizon = Math.max(0, retirementYear - currentYear)
  for (let i = 1; i <= horizon; i++) {
    const calendarYear = currentYear + i
    const eventNet = eventNetForYear(events, calendarYear)

    ret += annualSave
    const totalBeforeEvents = ret + brk
    if (totalBeforeEvents > 0 && eventNet !== 0) {
      const retShare = ret / totalBeforeEvents
      const brkShare = brk / totalBeforeEvents
      ret += eventNet * retShare
      brk += eventNet * brkShare
    } else if (eventNet !== 0) {
      ret += eventNet
    }

    ret *= 1 + retRate
    brk *= 1 + brkRate

    years.push(calendarYear)
    portfolioValues.push(ret + brk)
  }

  let totalAtRetirement = portfolioValues[portfolioValues.length - 1] ?? ret + brk

  // Align baseline (no events) with the main projection engine total at retirement.
  if (events.length === 0 && data.baselineTotalAtRetirement > 0) {
    const start = portfolioValues[0] ?? 0
    const target = data.baselineTotalAtRetirement
    const steps = portfolioValues.length - 1
    if (steps > 0 && start > 0 && Math.abs(target - totalAtRetirement) > 1) {
      const effRate = Math.pow(target / start, 1 / steps) - 1
      let v = start
      for (let i = 1; i < portfolioValues.length; i++) {
        v = (v + annualSave) * (1 + effRate)
        portfolioValues[i] = v
      }
      totalAtRetirement = target
    }
  }

  return {
    years,
    portfolioValues,
    totalAtRetirement,
  }
}

export function lumpSumLostGrowth(
  amount: number,
  eventYear: number,
  retirementYear: number,
  growthRate: number,
): number {
  const yearsRemaining = Math.max(0, retirementYear - eventYear)
  if (yearsRemaining <= 0 || amount <= 0) return 0
  return amount * (Math.pow(1 + growthRate, yearsRemaining) - 1)
}

/** Full compounded value of a lump sum withdrawn at eventYear, valued at retirementYear. */
export function calcLumpSumFutureValue(
  amount: number,
  eventYear: number,
  retirementYear: number,
  growthRate: number,
): number {
  const years = Math.max(0, retirementYear - eventYear)
  return Math.round((amount * Math.pow(1 + growthRate, years)) / 100) * 100
}

/** Fixed growth assumption for impact copy — matches projection engine default. */
export const LIFE_EVENT_GROWTH_RATE = 0.08

export function classifyEvent(event: LifeEvent, retirementYear: number): EventPhase {
  const eventEnd = event.type.includes('recurring')
    ? event.year + (event.duration || 0)
    : event.year

  if (eventEnd <= retirementYear) return 'growth'
  if (event.year >= retirementYear) return 'income'
  return 'both'
}

export function eventPhaseLabel(phase: EventPhase): string {
  switch (phase) {
    case 'growth':
      return 'growth phase'
    case 'income':
      return 'income phase'
    case 'both':
      return 'growth + income'
  }
}

function roundImpact(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.round(n / 100) * 100
}

function fmtImpactAmount(n: number): string {
  const r = roundImpact(n)
  const abs = Math.abs(r)
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1000) return `$${Math.round(abs / 1000).toLocaleString('en-US')}k`
  return `$${abs.toLocaleString('en-US')}`
}

function fmtDollar(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`
}

function growthLumpImpact(amount: number, eventYear: number, retirementYear: number): number {
  const years = Math.max(0, retirementYear - eventYear)
  if (years <= 0 || amount <= 0) return 0
  return roundImpact(amount * Math.pow(1 + LIFE_EVENT_GROWTH_RATE, years) - amount)
}

function growthRecurringImpact(
  amount: number,
  eventYear: number,
  duration: number,
  retirementYear: number,
): number {
  const totalPulled = amount * 12 * duration
  const avgYears = retirementYear - (eventYear + duration / 2)
  if (totalPulled <= 0 || avgYears <= 0) return 0
  return roundImpact(totalPulled * Math.pow(1 + LIFE_EVENT_GROWTH_RATE, avgYears) - totalPulled)
}

function fmtMonthlyForLife(n: number): string {
  const rounded = Math.round(n)
  const abs = Math.abs(rounded)
  const formatted = `$${abs.toLocaleString('en-US')}`
  if (rounded > 0) return `+${formatted}/mo for life`
  if (rounded < 0) return `-${formatted}/mo for life`
  return `${formatted}/mo for life`
}

export function monthlyIncomeFromPortfolioDelta(portfolioDelta: number, withdrawalRate: number): number {
  return Math.round((portfolioDelta * withdrawalRate) / 12)
}

export function portfolioDeltaWithEvents(
  data: LifeEventsProjectionData,
  events: LifeEvent[],
): number {
  const withEvents = projectPortfolioTimeline(data, events).totalAtRetirement
  return withEvents - data.baselineTotalAtRetirement
}

export function eventPortfolioDelta(
  data: LifeEventsProjectionData,
  allEvents: LifeEvent[],
  eventId: string,
): number {
  const withAll = projectPortfolioTimeline(data, allEvents).totalAtRetirement
  const without = projectPortfolioTimeline(
    data,
    allEvents.filter((e) => e.id !== eventId),
  ).totalAtRetirement
  return withAll - without
}

/** Months of portfolio runway change at withdrawal rate. */
export function portfolioRunwayShiftMonths(
  data: LifeEventsProjectionData,
  events: LifeEvent[],
  withdrawalRate: number,
  monthlyPortfolioIncome: number,
): number {
  const delta = portfolioDeltaWithEvents(data, events)
  const monthlyImpact = monthlyIncomeFromPortfolioDelta(delta, withdrawalRate)
  const monthlyDraw = Math.max(1, monthlyPortfolioIncome)
  return Math.round((monthlyImpact / monthlyDraw) * 10) / 10
}

export function createLifeEvent(
  canonicalLabel: string,
  data: LifeEventsProjectionData,
  overrides?: Partial<Pick<LifeEvent, 'amount' | 'year' | 'duration' | 'displayLabel'>>,
): LifeEvent {
  const type = eventTypeForCanonicalLabel(canonicalLabel)
  const defaults = eventDefaultsForLabel(canonicalLabel, data.currentYear, data.retirementYear)
  const event: Omit<LifeEvent, 'id' | 'phase'> = {
    canonicalLabel,
    displayLabel: overrides?.displayLabel ?? deriveDisplayLabel(canonicalLabel),
    type,
    amount: overrides?.amount ?? defaults.amount,
    year: overrides?.year ?? defaults.year,
    duration: overrides?.duration ?? defaults.duration,
    color: colorForEventType(type),
  }
  const phase = classifyEvent({ ...event, id: '', phase: 'growth' }, data.retirementYear)
  return { ...event, id: newEventId(), phase }
}

export function withUpdatedPhase(event: LifeEvent, retirementYear: number): LifeEvent {
  return { ...event, phase: classifyEvent(event, retirementYear) }
}

export function resolveDisplayLabelWithDuplicates(
  events: LifeEvent[],
  canonicalLabel: string,
  displayLabel: string,
): string {
  const count = events.filter((e) => e.canonicalLabel === canonicalLabel).length
  if (count === 0) return displayLabel
  return `${displayLabel} (${count + 1})`
}

function monthlyFromGrowthImpact(growthImpact: number, withdrawalRate: number): number {
  return Math.round((growthImpact * withdrawalRate) / 12)
}

function growthSideImpactText(
  event: LifeEvent,
  retirementYear: number,
  growthYears: number,
  withdrawalRate: number,
): string {
  const amt = fmtDollar(event.amount)

  if (event.type === 'lump-sum-out') {
    const lost = growthLumpImpact(event.amount, event.year, retirementYear)
    const monthlyLost = monthlyFromGrowthImpact(lost, withdrawalRate)
    return `Pulling ${amt} from your retirement portfolio in ${event.year} costs ${fmtImpactAmount(lost)} in compounding — that's ${fmtMonthlyForLife(-monthlyLost)}.`
  }

  if (event.type === 'lump-sum-in') {
    const gained = growthLumpImpact(event.amount, event.year, retirementYear)
    const monthlyGained = monthlyFromGrowthImpact(gained, withdrawalRate)
    return `Adding ${amt} to your retirement portfolio in ${event.year} compounds to ${fmtImpactAmount(gained)} — worth roughly ${fmtMonthlyForLife(monthlyGained)}.`
  }

  const dur = Math.max(1, growthYears || event.duration || 1)
  const endYear = event.year + dur - 1
  const mo = fmtDollar(event.amount)

  if (event.type === 'recurring-out') {
    const lost = growthRecurringImpact(event.amount, event.year, dur, retirementYear)
    const monthlyLost = monthlyFromGrowthImpact(lost, withdrawalRate)
    return `Redirecting ${mo}/mo away from your retirement portfolio from ${event.year}–${endYear} reduces your lifetime income by roughly ${fmtMonthlyForLife(-monthlyLost)}.`
  }

  const gained = growthRecurringImpact(event.amount, event.year, dur, retirementYear)
  const monthlyGained = monthlyFromGrowthImpact(gained, withdrawalRate)
  return `${mo}/mo added to your retirement portfolio from ${event.year}–${endYear} boosts your lifetime income by roughly ${fmtMonthlyForLife(monthlyGained)}.`
}

function incomeSideImpactText(
  event: LifeEvent,
  monthlyPortfolioIncome: number,
  withdrawalRate: number,
): string {
  const amt = fmtDollar(event.amount)
  const monthlyIncome = Math.max(1, monthlyPortfolioIncome)

  if (event.type === 'lump-sum-out') {
    const months = Math.round(event.amount / monthlyIncome)
    const monthlyLost = monthlyIncomeFromPortfolioDelta(-event.amount, withdrawalRate)
    return `A ${amt} withdrawal in retirement reduces your portfolio by that amount — cutting roughly ${fmtMonthlyForLife(monthlyLost)}, or depleting ${months} months of retirement income in one pull.`
  }

  if (event.type === 'lump-sum-in') {
    const months = Math.round(event.amount / monthlyIncome)
    const monthlyGained = monthlyIncomeFromPortfolioDelta(event.amount, withdrawalRate)
    return `${amt} added to your retirement portfolio in ${event.year} extends your income by roughly ${months} months — or boosts your monthly draw by ${fmtMonthlyForLife(monthlyGained)}.`
  }

  const dur = Math.max(1, event.duration ?? 1)
  const mo = fmtDollar(event.amount)

  if (event.type === 'recurring-out') {
    const totalCost = roundImpact(event.amount * 12 * dur)
    const months = Math.round(totalCost / monthlyIncome)
    return `${mo}/mo drawn from your retirement portfolio from ${event.year} for ${dur} years increases your required draw rate. If unplanned, this shortens your portfolio runway by roughly ${months} months.`
  }

  const portfolioMonths = Math.round((event.amount / monthlyIncome) * dur * 12)
  return `${mo}/mo flowing into your retirement portfolio from ${event.year} for ${dur} years offsets ${mo}/mo of your required draw — extending your portfolio runway by roughly ${portfolioMonths} months.`
}

function spanningImpactText(
  event: LifeEvent,
  retirementYear: number,
  monthlyPortfolioIncome: number,
  withdrawalRate: number,
): string {
  const eventEnd = event.year + (event.duration || 0)
  const preRetYears = Math.max(0, retirementYear - event.year)
  const postRetYears = Math.max(0, eventEnd - retirementYear)

  if (event.type === 'recurring-in') {
    const growthPart =
      preRetYears > 0
        ? growthRecurringImpact(event.amount, event.year, preRetYears, retirementYear)
        : 0
    const monthlyGained = monthlyFromGrowthImpact(growthPart, withdrawalRate)
    const growthLine =
      growthPart > 0
        ? `${fmtDollar(event.amount)}/mo in rental income adds ${fmtImpactAmount(growthPart)} to your portfolio before retirement — worth roughly ${fmtMonthlyForLife(monthlyGained)}.`
        : ''
    const incomeLine =
      postRetYears > 0
        ? `After retirement, it offsets ${fmtDollar(event.amount)}/mo of your required draw for ${postRetYears} years — extending your runway by roughly ${Math.round((event.amount / Math.max(1, monthlyPortfolioIncome)) * postRetYears * 12)} months.`
        : ''
    return [growthLine, incomeLine].filter(Boolean).join('\n')
  }

  if (event.type === 'recurring-out') {
    const growthLine =
      preRetYears > 0
        ? growthSideImpactText(event, retirementYear, preRetYears, withdrawalRate)
        : ''
    const incomeLine =
      postRetYears > 0
        ? incomeSideImpactText({ ...event, duration: postRetYears }, monthlyPortfolioIncome, withdrawalRate)
        : ''
    return [growthLine, incomeLine].filter(Boolean).join('\n')
  }

  if (event.year < retirementYear && eventEnd > retirementYear) {
    const growthLine = growthSideImpactText(event, retirementYear, 1, withdrawalRate)
    const incomeLine = incomeSideImpactText(event, monthlyPortfolioIncome, withdrawalRate)
    return `${growthLine}\n${incomeLine}`
  }

  return growthSideImpactText(event, retirementYear, 1, withdrawalRate)
}

export function buildImpactSentence(
  event: LifeEvent,
  retirementYear: number,
  monthlyPortfolioIncome: number,
  withdrawalRate: number,
): string {
  const phase = classifyEvent(event, retirementYear)

  if (phase === 'growth') {
    return growthSideImpactText(event, retirementYear, event.duration ?? 1, withdrawalRate)
  }

  if (phase === 'income') {
    return incomeSideImpactText(event, monthlyPortfolioIncome, withdrawalRate)
  }

  return spanningImpactText(event, retirementYear, monthlyPortfolioIncome, withdrawalRate)
}

export function totalEventOutflows(events: LifeEvent[]): number {
  let total = 0
  for (const e of events) {
    if (e.type === 'lump-sum-out') total += e.amount
    if (e.type === 'recurring-out') total += e.amount * 12 * Math.max(1, e.duration ?? 1)
  }
  return total
}

/** Approximate extra months of work needed to reach baseline portfolio with events applied. */
export function retirementDateShiftMonths(
  data: LifeEventsProjectionData,
  events: LifeEvent[],
): number {
  const baseline = data.baselineTotalAtRetirement
  const withEvents = projectPortfolioTimeline(data, events).totalAtRetirement
  if (withEvents >= baseline || baseline <= 0) return 0

  const shortfall = baseline - withEvents
  const blended = blendedGrowthRate(data)
  const monthlyRate = Math.pow(1 + blended, 1 / 12) - 1
  const monthlySave = data.annualSave / 12
  const monthlyGrowthOnBase = (baseline * monthlyRate) / 12
  const monthlyProgress = Math.max(1, monthlySave + monthlyGrowthOnBase)
  const months = shortfall / monthlyProgress
  return Math.round(months * 10) / 10
}

export function newEventId(): string {
  return `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function eventAmountContext(event: LifeEvent): string {
  if (event.type === 'recurring-out' || event.type === 'recurring-in') {
    const dur = Math.max(1, event.duration ?? 1)
    const endYear = event.year + dur - 1
    const mo = Math.round(event.amount).toLocaleString('en-US')
    return `$${mo}/mo · ${event.year}–${endYear}`
  }
  return `${fmtDollar(event.amount)} · ${event.year}`
}
