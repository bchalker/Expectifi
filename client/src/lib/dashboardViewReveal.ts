export type DashboardViewId = 'growth' | 'income' | 'where-to-retire'

/** Stagger slot indices — top-down reveal order. */
export const DASHBOARD_STAGGER = {
  progbar: 0,
  wave: 1,
  subheaderContent: 2,
  fineTune: 3,
  sidePanel: 3,
  sidePanelScenario: 4,
  accounts: 5,
  lifeEvents: 6,
} as const

/** Match --dashboard-stagger-step in global.scss. */
export const DASHBOARD_STAGGER_STEP_MS = 120

/** Match --dashboard-reveal-duration in global.scss. */
export const DASHBOARD_REVEAL_DURATION_MS = 500

const VIEW_ATTR = 'data-dashboard-view-enter'
const VIEW_FLUSH_ATTR = 'data-dashboard-view-flush'
const IMPORT_FLUSH_ATTR = 'data-portfolio-import-flush'
const POST_COMMIT_ATTR = 'data-portfolio-post-commit-reveal'
const MANUAL_PLAN_ATTR = 'data-portfolio-manual-plan-reveal'

export function dashboardViewEnterClearMs(): number {
  return (
    DASHBOARD_REVEAL_DURATION_MS +
    DASHBOARD_STAGGER_STEP_MS * DASHBOARD_STAGGER.lifeEvents +
    120
  )
}

export function clearDashboardViewEnterAttrs(): void {
  if (typeof document === 'undefined') return
  document.documentElement.removeAttribute(VIEW_ATTR)
  document.documentElement.removeAttribute(VIEW_FLUSH_ATTR)
  document.documentElement.removeAttribute(IMPORT_FLUSH_ATTR)
  document.documentElement.removeAttribute(POST_COMMIT_ATTR)
  document.documentElement.removeAttribute(MANUAL_PLAN_ATTR)
}

let clearTimer: number | undefined

function scheduleClearDashboardViewEnter(): void {
  if (typeof window === 'undefined') return
  if (clearTimer) window.clearTimeout(clearTimer)
  clearTimer = window.setTimeout(() => {
    clearTimer = undefined
    clearDashboardViewEnterAttrs()
  }, dashboardViewEnterClearMs())
}

/** Start the top-down stagger for a dashboard view (after optional import flush). */
export function beginDashboardViewEnter(
  view: DashboardViewId,
  options?: { startDelayMs?: number },
): void {
  if (typeof document === 'undefined') return
  const startDelayMs = options?.startDelayMs ?? 0

  const run = () => {
    document.documentElement.removeAttribute(IMPORT_FLUSH_ATTR)
    document.documentElement.setAttribute(VIEW_ATTR, view)
    scheduleClearDashboardViewEnter()
  }

  if (startDelayMs > 0) window.setTimeout(run, startDelayMs)
  else run()
}

/** Brief hide + replay — tab switches between growth / income / where to retire. */
export function replayDashboardViewEnter(view: DashboardViewId): void {
  if (typeof document === 'undefined') return
  if (clearTimer) {
    window.clearTimeout(clearTimer)
    clearTimer = undefined
  }
  document.documentElement.removeAttribute(VIEW_ATTR)
  document.documentElement.setAttribute(VIEW_FLUSH_ATTR, 'true')

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      document.documentElement.removeAttribute(VIEW_FLUSH_ATTR)
      document.documentElement.setAttribute(VIEW_ATTR, view)
      scheduleClearDashboardViewEnter()
    })
  })
}

export function markPortfolioBalancesFlush(options?: {
  afterManualPlanModal?: boolean
}): void {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute(IMPORT_FLUSH_ATTR, 'true')
  document.documentElement.setAttribute(POST_COMMIT_ATTR, 'true')
  if (options?.afterManualPlanModal) {
    document.documentElement.setAttribute(MANUAL_PLAN_ATTR, 'true')
  }
}

export function isPortfolioPostCommitReveal(): boolean {
  if (typeof document === 'undefined') return false
  return (
    document.documentElement.getAttribute(POST_COMMIT_ATTR) === 'true'
  )
}

export function isPortfolioManualPlanReveal(): boolean {
  if (typeof document === 'undefined') return false
  return (
    document.documentElement.getAttribute(MANUAL_PLAN_ATTR) === 'true'
  )
}
