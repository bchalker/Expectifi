import type { DrawerName } from './computeResults'

export type NavPanelRequirement = 'portfolio' | 'ss'

export type NavPanelContext = {
  hasPortfolioBalances: boolean
  ssConfigured: boolean
}

export const APP_NAV_DRAWER_ITEMS: readonly {
  id: DrawerName
  label: string
  requires: readonly NavPanelRequirement[]
}[] = [
  { id: 'scenarios', label: 'Return scenarios', requires: ['portfolio'] },
  { id: 'sstiming', label: 'SS timing', requires: ['ss'] },
  { id: 'taxfree', label: 'Tax-free withdrawals', requires: ['portfolio'] },
  { id: 'strategy', label: 'Withdrawal strategy', requires: ['portfolio'] },
  { id: 'italy', label: 'Italy comparison', requires: ['portfolio'] },
]

export const SNAPSHOT_NAV_REQUIRES: readonly NavPanelRequirement[] = ['portfolio']

export function navRequirementsMet(
  requires: readonly NavPanelRequirement[],
  ctx: NavPanelContext,
): boolean {
  for (const req of requires) {
    if (req === 'portfolio' && !ctx.hasPortfolioBalances) return false
    if (req === 'ss' && !ctx.ssConfigured) return false
  }
  return true
}

export function navItemUnavailableReason(
  requires: readonly NavPanelRequirement[],
  ctx: NavPanelContext,
): string | null {
  if (navRequirementsMet(requires, ctx)) return null
  const needsPortfolio = requires.includes('portfolio') && !ctx.hasPortfolioBalances
  const needsSs = requires.includes('ss') && !ctx.ssConfigured
  if (needsPortfolio && needsSs) {
    return 'Add account balances and Social Security estimates in Configure to unlock.'
  }
  if (needsPortfolio) {
    return 'Add account balances or import a positions CSV to unlock.'
  }
  if (needsSs) {
    return 'Enter your Social Security estimates in Configure to unlock.'
  }
  return null
}

export function isDrawerNavAvailable(id: DrawerName, ctx: NavPanelContext): boolean {
  if (id === 'config') return true
  const item = APP_NAV_DRAWER_ITEMS.find((entry) => entry.id === id)
  return item ? navRequirementsMet(item.requires, ctx) : false
}

export function isSnapshotNavAvailable(ctx: NavPanelContext): boolean {
  return navRequirementsMet(SNAPSHOT_NAV_REQUIRES, ctx)
}
