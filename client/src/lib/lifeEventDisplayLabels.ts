/** Canonical dropdown label → first-person card display (Expect if I…). */
const DISPLAY_LABEL_MAP: Record<string, string> = {
  'Pay off mortgage early': 'pay off my mortgage early',
  'Buy a car (cash)': 'buy a car with cash',
  'Home renovation / major repair': 'renovate my home',
  'Home renovation': 'renovate my home',
  'Medical procedure or surgery': 'have a medical expense',
  'Long-term care facility': 'move to long-term care',
  'Down payment gift to child': 'give my child a down payment',
  'Wedding gift / family event': 'pay for a family event',
  'Buy a vacation property': 'buy a vacation property',
  'Start a business': 'start a business',
  'Legal settlement or expense': 'cover a legal expense',
  'Grandkid / child tuition support': 'support tuition',
  'Support a family member': 'support a family member',
  'Second home carrying costs': 'carry a second home',
  'Long-term care insurance premiums': 'pay LTC insurance',
  'Private health insurance (pre-Medicare)': 'pay for private health insurance',
  'Charitable giving / tithe': 'give regularly to charity',
  'Travel budget (annual)': 'budget for annual travel',
  'Assisted living for parent': 'help pay for a parent\'s care',
  'Sell primary home': 'sell my home',
  'Receive inheritance': 'receive an inheritance',
  'Pension / inheritance': 'receive an inheritance',
  'Sell a business or property': 'sell a business or property',
  'Life insurance payout': 'receive a life insurance payout',
  'Legal settlement received': 'receive a legal settlement',
  'Sell vacation property': 'sell my vacation property',
  'Rental property income': 'collect rental income',
  'Rental income': 'collect rental income',
  'Pension starts': 'start drawing my pension',
  'Part-time / consulting income': 'do part-time or consulting work',
  'Social Security': 'start collecting Social Security',
  'Annuity payments begin': 'start receiving annuity payments',
  'Royalties or passive income': 'earn royalties or passive income',
}

const CUSTOM_CANONICAL_LABELS = new Set([
  'Custom one-time outflow',
  'Custom recurring outflow',
  'Custom one-time inflow',
  'Custom recurring inflow',
])

export function deriveDisplayLabel(label: string): string {
  const trimmed = label.trim()
  if (!trimmed) return ''
  const mapped = DISPLAY_LABEL_MAP[trimmed]
  if (mapped) return mapped
  if (CUSTOM_CANONICAL_LABELS.has(trimmed)) return trimmed.toLowerCase()
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1)
}
