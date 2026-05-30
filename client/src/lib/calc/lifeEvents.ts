import type { ComputedSnapshot, CalculatorInputs } from '../computeResults'
import { deriveDisplayLabel } from '../lifeEventDisplayLabels'

export type LifeEventType = 'lump-sum-out' | 'recurring-out' | 'lump-sum-in' | 'recurring-in'

export type EventPhase = 'growth' | 'income' | 'both'

export type LifeEvent = {
  id: string
  type: LifeEventType
  label: string
  /** First-person lowercase label for card display (Expect if I…). */
  displayLabel: string
  /** Monthly if recurring, total if lump sum. */
  amount: number
  year: number
  duration?: number
  color: string
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

function growthSideImpactText(
  event: LifeEvent,
  retirementYear: number,
  growthYears: number,
): string {
  const amt = fmtDollar(event.amount)

  if (event.type === 'lump-sum-out') {
    const lost = growthLumpImpact(event.amount, event.year, retirementYear)
    return `Pulling ${amt} in ${event.year} costs ${fmtImpactAmount(lost)} in lost portfolio growth by retirement — your portfolio arrives ${fmtImpactAmount(lost)} lighter.`
  }

  if (event.type === 'lump-sum-in') {
    const gained = growthLumpImpact(event.amount, event.year, retirementYear)
    return `Adding ${amt} in ${event.year} compounds to roughly ${fmtImpactAmount(gained)} by retirement.`
  }

  const dur = Math.max(1, growthYears || event.duration || 1)
  const endYear = event.year + dur - 1
  const mo = fmtDollar(event.amount)

  if (event.type === 'recurring-out') {
    const lost = growthRecurringImpact(event.amount, event.year, dur, retirementYear)
    return `${mo}/mo from ${event.year}–${endYear} reduces your portfolio at retirement by roughly ${fmtImpactAmount(lost)}.`
  }

  const gained = growthRecurringImpact(event.amount, event.year, dur, retirementYear)
  return `${mo}/mo from ${event.year}–${endYear} adds roughly ${fmtImpactAmount(gained)} to your retirement portfolio.`
}

function incomeSideImpactText(event: LifeEvent, monthlyPortfolioIncome: number): string {
  const amt = fmtDollar(event.amount)
  const monthlyIncome = Math.max(1, monthlyPortfolioIncome)

  if (event.type === 'lump-sum-out') {
    const months = Math.round(event.amount / monthlyIncome)
    return `A ${amt} expense in retirement depletes roughly ${months} months of portfolio income.`
  }

  if (event.type === 'lump-sum-in') {
    const months = Math.round(event.amount / monthlyIncome)
    return `${amt} received in retirement covers roughly ${months} months of income.`
  }

  const dur = Math.max(1, event.duration ?? 1)
  const mo = fmtDollar(event.amount)

  if (event.type === 'recurring-out') {
    const totalCost = roundImpact(event.amount * 12 * dur)
    return `${mo}/mo adds ${dur} years of extra draw — your portfolio needs to support an additional ${fmtImpactAmount(totalCost)} over that period.`
  }

  const portfolioMonths = Math.round((event.amount / monthlyIncome) * dur * 12)
  return `${mo}/mo offsets your draw for ${dur} years, extending your portfolio by roughly ${portfolioMonths} months.`
}

function spanningImpactText(
  event: LifeEvent,
  retirementYear: number,
  monthlyPortfolioIncome: number,
): string {
  const eventEnd = event.year + (event.duration || 0)
  const preRetYears = Math.max(0, retirementYear - event.year)
  const postRetYears = Math.max(0, eventEnd - retirementYear)

  if (event.type === 'recurring-in') {
    const growthPart =
      preRetYears > 0
        ? growthRecurringImpact(event.amount, event.year, preRetYears, retirementYear)
        : 0
    const growthLine =
      growthPart > 0
        ? `Adds ${fmtImpactAmount(growthPart)} to your portfolio before retirement.`
        : ''
    const incomeLine =
      postRetYears > 0
        ? `After retirement, offsets ${fmtDollar(event.amount)}/mo of your required draw for ${postRetYears} years.`
        : ''
    return [growthLine, incomeLine].filter(Boolean).join('\n')
  }

  if (event.type === 'recurring-out') {
    const growthPart =
      preRetYears > 0
        ? growthRecurringImpact(event.amount, event.year, preRetYears, retirementYear)
        : 0
    const growthLine =
      growthPart > 0
        ? `Reduces your portfolio at retirement by roughly ${fmtImpactAmount(growthPart)}.`
        : ''
    const incomeLine =
      postRetYears > 0
        ? `After retirement, adds ${fmtDollar(event.amount)}/mo to your required draw for ${postRetYears} years.`
        : ''
    return [growthLine, incomeLine].filter(Boolean).join('\n')
  }

  // Lump-sum spanning: treat pre-retirement portion as growth, post as income
  if (event.year < retirementYear && eventEnd > retirementYear) {
    const growthLine = growthSideImpactText(event, retirementYear, 1)
    const incomeLine = incomeSideImpactText(event, monthlyPortfolioIncome)
    return `${growthLine}\n${incomeLine}`
  }

  return growthSideImpactText(event, retirementYear, 1)
}

export function buildImpactSentence(
  event: LifeEvent,
  retirementYear: number,
  monthlyPortfolioIncome: number,
): string {
  const phase = classifyEvent(event, retirementYear)

  if (phase === 'growth') {
    return growthSideImpactText(event, retirementYear, event.duration ?? 1)
  }

  if (phase === 'income') {
    return incomeSideImpactText(event, monthlyPortfolioIncome)
  }

  return spanningImpactText(event, retirementYear, monthlyPortfolioIncome)
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

export type LifeEventPresetId = 'rental-income' | 'home-renovation' | 'pension-inheritance' | 'custom'

export function presetLifeEvent(
  preset: LifeEventPresetId,
  data: LifeEventsProjectionData,
): Omit<LifeEvent, 'id'> {
  const defaultYear = Math.min(data.retirementYear - 1, data.currentYear + 2)
  let base: Omit<LifeEvent, 'id' | 'displayLabel'> & { label: string }
  switch (preset) {
    case 'rental-income':
      base = {
        type: 'recurring-in',
        label: 'Rental property income',
        amount: 1500,
        year: defaultYear,
        duration: 10,
        color: LIFE_EVENT_COLORS.green,
      }
      break
    case 'home-renovation':
      base = {
        type: 'lump-sum-out',
        label: 'Home renovation / major repair',
        amount: 45000,
        year: defaultYear,
        duration: undefined,
        color: LIFE_EVENT_COLORS.amber,
      }
      break
    case 'pension-inheritance':
      base = {
        type: 'lump-sum-in',
        label: 'Receive inheritance',
        amount: 100000,
        year: defaultYear,
        duration: undefined,
        color: LIFE_EVENT_COLORS.green,
      }
      break
    default:
      base = {
        type: 'lump-sum-out',
        label: 'Custom one-time outflow',
        amount: 25000,
        year: defaultYear,
        duration: undefined,
        color: LIFE_EVENT_COLORS.red,
      }
  }
  return { ...base, displayLabel: deriveDisplayLabel(base.label) }
}

export function eventBadgeText(event: LifeEvent): string {
  const sym = event.type.includes('out') ? '-' : '+'
  if (event.type === 'recurring-out' || event.type === 'recurring-in') {
    const dur = Math.max(1, event.duration ?? 1)
    const endYear = event.year + dur - 1
    const mo = Math.round(event.amount).toLocaleString('en-US')
    return `${sym}$${mo}/mo · ${event.year}–${endYear}`
  }
  const amt =
    event.amount >= 1000 ? `$${Math.round(event.amount / 1000)}k` : `$${Math.round(event.amount).toLocaleString('en-US')}`
  return `${sym}${amt} · ${event.year}`
}
