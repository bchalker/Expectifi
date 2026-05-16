/** Modal fade-out duration (keep in sync with account-balances-manual-sheet-out). */
export const MANUAL_PLAN_MODAL_FADE_MS = 480

/** Pause after modal is gone before subheader wave + strip metrics animate in. */
export const MANUAL_PLAN_POST_FADE_PAUSE_MS = 280

/** Match CSS animation durations (SubHeader, StripHeader, calculator.scss). */
export const PORTFOLIO_DETAIL_ANIM_MS = 500
export const PORTFOLIO_STAGGER_STEP_MS = 40
export const PORTFOLIO_STRIP_SLIDER_STAGGER_MS = 160

const PORTFOLIO_WAVE_REVEAL_CLEAR_MS = 620
/** After post-fade pause, before wave scale animation starts. */
export const PORTFOLIO_REVEAL_START_DELAY_MS = 100
export const PORTFOLIO_WAVE_ANIM_MS = PORTFOLIO_DETAIL_ANIM_MS
/** Gap after wave before strip metric headline appears. */
const PORTFOLIO_STRIP_AFTER_WAVE_MS = 70

export function getStripControlsRevealDelayMs(): number {
  if (typeof document === 'undefined') return 900
  if (document.documentElement.getAttribute('data-portfolio-post-commit-reveal') === 'true') {
    return (
      MANUAL_PLAN_POST_FADE_PAUSE_MS +
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
    PORTFOLIO_STRIP_SLIDER_STAGGER_MS +
    Math.round(PORTFOLIO_DETAIL_ANIM_MS * 0.75) +
    60
  )
}

export function markPortfolioBalancesFlush(): void {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-portfolio-import-flush', 'true')
  document.documentElement.setAttribute('data-portfolio-post-commit-reveal', 'true')
}

/** Subheader front-wave animation after portfolio balances are committed (import or manual). */
export function schedulePortfolioWaveReveal(
  startDelayMs: number = PORTFOLIO_REVEAL_START_DELAY_MS,
): void {
  if (typeof document === 'undefined') return
  window.setTimeout(() => {
    window.requestAnimationFrame(() => {
      document.documentElement.removeAttribute('data-portfolio-import-flush')
      document.documentElement.setAttribute('data-portfolio-wave-reveal', 'true')
    })
    window.setTimeout(() => {
      document.documentElement.removeAttribute('data-portfolio-wave-reveal')
      document.documentElement.removeAttribute('data-portfolio-import-flush')
      document.documentElement.removeAttribute('data-portfolio-post-commit-reveal')
    }, PORTFOLIO_WAVE_REVEAL_CLEAR_MS)
  }, startDelayMs)
}

export function triggerPortfolioWaveReveal(): void {
  markPortfolioBalancesFlush()
  schedulePortfolioWaveReveal()
}
