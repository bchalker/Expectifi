import type { LifeEventType } from './calc/lifeEvents'
import { deriveDisplayLabel } from './lifeEventDisplayLabels'
import { colorForEventType, eventDefaultsForLabel, eventTypeForCanonicalLabel } from './lifeEventCatalog'
import type { ExpectifiPlans } from './planStorage/life'

export type LifeEventSuggestion = {
  id: string
  canonicalLabel: string
  displayLabel: string
  type: LifeEventType
  amount: number
  year: number
  duration?: number
  color: string
  reason: string
}

const MAX_SUGGESTIONS = 6

type FallbackSuggestion = {
  canonicalLabel: string
  reason: string
}

/** General suggestions shown when plan data yields fewer than MAX_SUGGESTIONS. */
const FALLBACK_SUGGESTIONS: FallbackSuggestion[] = [
  {
    canonicalLabel: 'Pay off mortgage early',
    reason: 'Paying off your mortgage early redirects cash from your portfolio — see what it costs in lifetime retirement income.',
  },
  {
    canonicalLabel: 'Buy a car (cash)',
    reason: 'A cash vehicle purchase is a one-time hit to your retirement portfolio. Model it before you commit.',
  },
  {
    canonicalLabel: 'Home renovation / major repair',
    reason: 'Major home expenses before retirement reduce compounding. Know the income impact upfront.',
  },
  {
    canonicalLabel: 'Receive inheritance',
    reason: 'Even a rough inheritance estimate shows what it could add to your monthly retirement draw.',
  },
  {
    canonicalLabel: 'Travel budget (annual)',
    reason: 'Regular travel spending draws from your portfolio every year — see how it affects your runway.',
  },
  {
    canonicalLabel: 'Medical procedure or surgery',
    reason: 'Unexpected medical costs can meaningfully shift your retirement timeline. Plan for the worst case.',
  },
  {
    canonicalLabel: 'Down payment gift to child',
    reason: 'Helping family with a down payment has a real cost in compounding — quantify it before you give.',
  },
  {
    canonicalLabel: 'Part-time / consulting income',
    reason: 'Side income in early retirement can extend your portfolio runway. Model what it adds.',
  },
]

function sugId(canonicalLabel: string): string {
  return `sug-${canonicalLabel.replace(/\s+/g, '-').toLowerCase()}`
}

export function generateSuggestions(
  plans: ExpectifiPlans,
  retirementYear: number,
  currentYear: number,
  existingCanonicalLabels: string[],
  dismissedIds: string[],
): LifeEventSuggestion[] {
  const out: LifeEventSuggestion[] = []
  const { life } = plans
  const has = (label: string) =>
    !existingCanonicalLabels.includes(label) && !dismissedIds.includes(sugId(label))

  const push = (
    canonicalLabel: string,
    partial: Pick<LifeEventSuggestion, 'amount' | 'year' | 'duration' | 'reason'>,
  ) => {
    if (!has(canonicalLabel)) return
    const type = eventTypeForCanonicalLabel(canonicalLabel)
    out.push({
      id: sugId(canonicalLabel),
      canonicalLabel,
      displayLabel: deriveDisplayLabel(canonicalLabel),
      type,
      color: colorForEventType(type),
      amount: partial.amount,
      year: partial.year,
      duration: partial.duration,
      reason: partial.reason,
    })
  }

  if (life.housing.owns && life.housing.mortgageBalance > 0) {
    push('Pay off mortgage early', {
      amount: life.housing.mortgageBalance,
      year: life.housing.mortgagePayoffYear,
      reason:
        'You have a mortgage balance — see what paying it off early costs in retirement income vs what you save in interest.',
    })
  }

  if (life.housing.planToSell === 'Yes' || life.housing.planToSell === 'Maybe') {
    push('Sell primary home', {
      amount: life.housing.saleProceeds || 200000,
      year: life.housing.sellYear,
      reason: 'A home sale could add meaningful monthly income in retirement. Let\'s model it.',
    })
  }

  if (life.family.hasChildren && life.family.dependentAges.some((a) => a < 22)) {
    const youngest = Math.min(...life.family.dependentAges.filter((a) => a < 22))
    const startYear = currentYear + Math.max(0, 18 - youngest)
    push('Grandkid / child tuition support', {
      amount: 600,
      year: startYear,
      duration: 4,
      reason: 'Supporting tuition could reduce your retirement income. Know the number before you commit.',
    })
  }

  if (life.family.supportingParent) {
    push('Support a family member', {
      amount: life.family.parentSupportAmount || 500,
      year: currentYear,
      duration: life.family.parentSupportYears,
      reason: "You're currently supporting a family member.",
    })
  }

  if (life.vehicles.count > 0) {
    const age = currentYear - life.vehicles.oldestYear
    if (age >= 8) {
      push('Buy a car (cash)', {
        amount: 35000,
        year: currentYear + 2,
        reason: `Your oldest vehicle is ${age} years old. A cash purchase now has a real cost in retirement income — here's what it is.`,
      })
    }
  }

  if (life.other.hasRental) {
    push('Rental property income', {
      amount: life.other.rentalIncome || 1400,
      year: life.other.rentalStartYear,
      duration: 15,
      reason: 'Rental income can meaningfully boost your monthly retirement draw. Let\'s add it.',
    })
  }

  if (life.other.expectsInheritance !== 'No') {
    push('Receive inheritance', {
      amount: life.other.inheritanceAmount || 50000,
      year: life.other.inheritanceYear || currentYear + 5,
      reason:
        'Even a rough estimate of an inheritance shows what it could add to your monthly retirement income.',
    })
  }

  if (life.other.tithes) {
    push('Charitable giving / tithe', {
      amount: life.other.titheAmount || 400,
      year: currentYear,
      duration: Math.max(1, retirementYear - currentYear + 10),
      reason: 'Regular giving is a draw on your retirement portfolio. Modeling it keeps your plan honest.',
    })
  }

  for (const fallback of FALLBACK_SUGGESTIONS) {
    if (out.length >= MAX_SUGGESTIONS) break
    const defaults = eventDefaultsForLabel(fallback.canonicalLabel, currentYear, retirementYear)
    push(fallback.canonicalLabel, {
      amount: defaults.amount,
      year: defaults.year,
      duration: defaults.duration,
      reason: fallback.reason,
    })
  }

  return out.slice(0, MAX_SUGGESTIONS)
}

export function loadDismissedSuggestionIds(): string[] {
  try {
    const raw = localStorage.getItem('expectifi/life-dismissed-suggestions-v1')
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function saveDismissedSuggestionIds(ids: string[]): void {
  try {
    localStorage.setItem('expectifi/life-dismissed-suggestions-v1', JSON.stringify(ids))
  } catch {
    /* ignore */
  }
}
