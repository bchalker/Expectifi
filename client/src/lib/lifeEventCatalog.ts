import type { LifeEventType } from './calc/lifeEvents'

export type EventCatalogEntry = {
  canonicalLabel: string
  type: LifeEventType
  group: 'one-time-out' | 'recurring-out' | 'one-time-in' | 'recurring-in'
}

export const EVENT_PICKER_GROUPS: {
  id: EventCatalogEntry['group']
  title: string
  options: string[]
}[] = [
  {
    id: 'one-time-out',
    title: 'One-time outflows',
    options: [
      'Pay off mortgage early',
      'Buy a car (cash)',
      'Home renovation / major repair',
      'Medical procedure or surgery',
      'Long-term care facility',
      'Down payment gift to child',
      'Wedding gift / family event',
      'Buy a vacation property',
      'Start a business',
      'Legal settlement or expense',
      'Custom one-time outflow',
    ],
  },
  {
    id: 'recurring-out',
    title: 'Recurring outflows',
    options: [
      'Grandkid / child tuition support',
      'Support a family member',
      'Second home carrying costs',
      'Long-term care insurance premiums',
      'Private health insurance (pre-Medicare)',
      'Charitable giving / tithe',
      'Travel budget (annual)',
      'Assisted living for parent',
      'Custom recurring outflow',
    ],
  },
  {
    id: 'one-time-in',
    title: 'One-time inflows',
    options: [
      'Sell primary home',
      'Receive inheritance',
      'Sell a business or property',
      'Life insurance payout',
      'Legal settlement received',
      'Sell vacation property',
      'Custom one-time inflow',
    ],
  },
  {
    id: 'recurring-in',
    title: 'Recurring inflows',
    options: [
      'Rental property income',
      'Pension starts',
      'Part-time / consulting income',
      'Social Security',
      'Annuity payments begin',
      'Royalties or passive income',
      'Custom recurring inflow',
    ],
  },
]

const GROUP_TO_TYPE: Record<EventCatalogEntry['group'], LifeEventType> = {
  'one-time-out': 'lump-sum-out',
  'recurring-out': 'recurring-out',
  'one-time-in': 'lump-sum-in',
  'recurring-in': 'recurring-in',
}

export function eventTypeForCanonicalLabel(canonicalLabel: string): LifeEventType {
  for (const g of EVENT_PICKER_GROUPS) {
    if (g.options.includes(canonicalLabel)) return GROUP_TO_TYPE[g.id]
  }
  if (canonicalLabel.toLowerCase().includes('custom')) {
    if (canonicalLabel.includes('recurring')) {
      return canonicalLabel.includes('inflow') ? 'recurring-in' : 'recurring-out'
    }
    return canonicalLabel.includes('inflow') ? 'lump-sum-in' : 'lump-sum-out'
  }
  return 'lump-sum-out'
}

type EventDefaults = {
  amount: number
  year: number
  duration?: number
}

/** Catalog defaults from spec — keyed by canonical label. */
export function eventDefaultsForLabel(
  canonicalLabel: string,
  currentYear: number,
  retirementYear: number,
): EventDefaults {
  const y = (offset: number) => currentYear + offset
  const map: Record<string, EventDefaults> = {
    'Pay off mortgage early': { amount: 85000, year: y(2) },
    'Buy a car (cash)': { amount: 35000, year: y(1) },
    'Home renovation / major repair': { amount: 45000, year: y(1) },
    'Medical procedure or surgery': { amount: 25000, year: y(1) },
    'Long-term care facility': { amount: 120000, year: y(3) },
    'Down payment gift to child': { amount: 50000, year: y(2) },
    'Wedding gift / family event': { amount: 20000, year: y(1) },
    'Buy a vacation property': { amount: 180000, year: y(3) },
    'Start a business': { amount: 40000, year: y(1) },
    'Legal settlement or expense': { amount: 30000, year: y(1) },
    'Custom one-time outflow': { amount: 10000, year: y(1) },
    'Grandkid / child tuition support': { amount: 600, year: y(2), duration: 4 },
    'Support a family member': { amount: 500, year: y(1), duration: 5 },
    'Second home carrying costs': { amount: 1200, year: y(2), duration: 10 },
    'Long-term care insurance premiums': { amount: 300, year: y(1), duration: 15 },
    'Private health insurance (pre-Medicare)': { amount: 800, year: y(1), duration: 8 },
    'Charitable giving / tithe': { amount: 400, year: y(1), duration: 20 },
    'Travel budget (annual)': { amount: 667, year: y(1), duration: 10 },
    'Assisted living for parent': { amount: 3500, year: y(2), duration: 3 },
    'Custom recurring outflow': { amount: 500, year: y(1), duration: 5 },
    'Sell primary home': { amount: 280000, year: y(5) },
    'Receive inheritance': { amount: 75000, year: y(3) },
    'Sell a business or property': { amount: 150000, year: y(4) },
    'Life insurance payout': { amount: 100000, year: y(5) },
    'Legal settlement received': { amount: 40000, year: y(2) },
    'Sell vacation property': { amount: 200000, year: y(6) },
    'Custom one-time inflow': { amount: 10000, year: y(1) },
    'Rental property income': { amount: 1400, year: y(2), duration: 15 },
    'Pension starts': { amount: 1800, year: retirementYear, duration: 25 },
    'Part-time / consulting income': { amount: 2000, year: retirementYear, duration: 5 },
    'Social Security': { amount: 1950, year: retirementYear + 2, duration: 25 },
    'Annuity payments begin': { amount: 1200, year: retirementYear, duration: 20 },
    'Royalties or passive income': { amount: 400, year: y(1), duration: 10 },
    'Custom recurring inflow': { amount: 500, year: y(1), duration: 5 },
  }
  return map[canonicalLabel] ?? { amount: 10000, year: y(1), duration: 5 }
}

export function colorForEventType(type: LifeEventType): string {
  switch (type) {
    case 'lump-sum-out':
      return '#E24B4A'
    case 'recurring-out':
      return '#EF9F27'
    case 'lump-sum-in':
      return '#639922'
    case 'recurring-in':
      return '#1D9E75'
  }
}
