import type { DrawerName } from './computeResults'

export const APP_NAV_DRAWER_ITEMS: readonly { id: DrawerName; label: string }[] = [
  { id: 'scenarios', label: 'Return scenarios' },
  { id: 'sstiming', label: 'SS timing' },
  { id: 'taxfree', label: 'Tax-free withdrawals' },
  { id: 'strategy', label: 'Withdrawal strategy' },
  { id: 'italy', label: 'Italy comparison' },
]
