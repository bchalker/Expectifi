import { APP_PATHS } from './appPaths'
import type { DrawerName } from './computeResults'

export type AppNavRouteId = 'where-to-retire'

export type NavPanelRequirement = 'portfolio' | 'ss'

export type NavPanelContext = {
  hasPortfolioBalances: boolean
  ssConfigured: boolean
}

/** Temporarily hidden from left nav until feature work resumes. */
export const TEMP_HIDDEN_NAV_DRAWERS = new Set<DrawerName>([
  'scenarios',
  'sstiming',
  'taxfree',
  'strategy',
])

const ALL_NAV_DRAWER_ITEMS: readonly {
  id: DrawerName
  label: string
  requires: readonly NavPanelRequirement[]
}[] = [
  { id: 'scenarios', label: 'Return scenarios', requires: ['portfolio'] },
  { id: 'sstiming', label: 'SS timing', requires: ['ss'] },
  { id: 'taxfree', label: 'Tax-free withdrawals', requires: ['portfolio'] },
  { id: 'strategy', label: 'Withdrawal strategy', requires: ['portfolio'] },
]

export const APP_NAV_DRAWER_ITEMS = ALL_NAV_DRAWER_ITEMS.filter(
  (item) => !TEMP_HIDDEN_NAV_DRAWERS.has(item.id),
)

export const APP_NAV_ROUTE_ITEMS: readonly {
  id: AppNavRouteId
  path: string
  label: string
  requires: readonly NavPanelRequirement[]
}[] = [
  {
    id: 'where-to-retire',
    path: APP_PATHS.whereToRetire,
    label: 'Where to retire?',
    requires: ['portfolio'],
  },
]

export const TAX_SUMMARY_NAV_REQUIRES: readonly NavPanelRequirement[] = ['portfolio']

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
  if (TEMP_HIDDEN_NAV_DRAWERS.has(id)) return false
  const item = ALL_NAV_DRAWER_ITEMS.find((entry) => entry.id === id)
  return item ? navRequirementsMet(item.requires, ctx) : false
}

export function isRouteNavAvailable(id: AppNavRouteId, ctx: NavPanelContext): boolean {
  const item = APP_NAV_ROUTE_ITEMS.find((entry) => entry.id === id)
  return item ? navRequirementsMet(item.requires, ctx) : false
}

export function isTaxSummaryPanelAvailable(ctx: NavPanelContext): boolean {
  return navRequirementsMet(TAX_SUMMARY_NAV_REQUIRES, ctx)
}
