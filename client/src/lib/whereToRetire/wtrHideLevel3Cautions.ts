/** Dispatched from caution-chip tooltips to enable the global Level 3 hide filter. */
export const WTR_HIDE_LEVEL3_CAUTIONS_EVENT = 'wtr-hide-level3-cautions' as const

export const HIDE_LEVEL3_CAUTIONS_TOAST_MESSAGE =
  'Level 3 cautioned cities are now hidden. Change this anytime in Excluded.'

export function requestHideLevel3CautionedCities(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(WTR_HIDE_LEVEL3_CAUTIONS_EVENT))
}
