/** Modal fade-out duration (keep in sync with account-balances-manual-sheet-out). */
export const MANUAL_PLAN_MODAL_FADE_MS = 480

/** Pause after modal is gone before subheader wave + strip metrics animate in. */
export const MANUAL_PLAN_POST_FADE_PAUSE_MS = 280

/** Match CSS animation durations (SubHeader, StripHeader, calculator.scss). */
export const PORTFOLIO_DETAIL_ANIM_MS = 500
export const PORTFOLIO_STAGGER_STEP_MS = 18
export const PORTFOLIO_STRIP_SLIDER_STAGGER_MS = 90

/** After post-fade pause, before wave scale animation starts. */
export const PORTFOLIO_REVEAL_START_DELAY_MS = 100
export const PORTFOLIO_WAVE_ANIM_MS = PORTFOLIO_DETAIL_ANIM_MS

import {
  beginDashboardViewEnter,
  isPortfolioManualPlanReveal,
  isPortfolioPostCommitReveal,
  markPortfolioBalancesFlush,
} from './dashboardViewReveal'

/** Gap after wave before strip metric headline appears. */
const PORTFOLIO_STRIP_AFTER_WAVE_MS = 70

export function getStripControlsRevealDelayMs(): number {
  if (typeof document === 'undefined') return 900
  if (isPortfolioPostCommitReveal()) {
    const afterManualPlan = isPortfolioManualPlanReveal()
    const leadPause = afterManualPlan ? MANUAL_PLAN_POST_FADE_PAUSE_MS : 0
    return (
      leadPause +
      PORTFOLIO_REVEAL_START_DELAY_MS +
      PORTFOLIO_WAVE_ANIM_MS +
      PORTFOLIO_STRIP_AFTER_WAVE_MS
    )
  }
  return 650
}

/** Account card rows: after strip headline + slider row have had time to stagger in. */
export function getAccountsRevealDelayMs(): number {
  return (
    getStripControlsRevealDelayMs() +
    PORTFOLIO_DETAIL_ANIM_MS +
    Math.round(PORTFOLIO_STRIP_SLIDER_STAGGER_MS * 0.45)
  )
}

export { markPortfolioBalancesFlush }

/** Subheader + dashboard top-down stagger after portfolio balances are committed. */
export function schedulePortfolioWaveReveal(
  startDelayMs: number = PORTFOLIO_REVEAL_START_DELAY_MS,
): void {
  beginDashboardViewEnter('growth', { startDelayMs })
}

export function triggerPortfolioWaveReveal(): void {
  markPortfolioBalancesFlush()
  schedulePortfolioWaveReveal()
}
