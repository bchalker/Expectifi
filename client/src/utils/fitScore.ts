export type FitScoreColors = {
  background: string
  text: string
}

/**
 * 0–100 fit score color bands for destination badges (list, detail header).
 *
 * Nine shades grouped by pin band families in retirementScore.ts
 * (PIN_BAND_THRESHOLDS: Poor <50, Moderate 50–69, Good 70–89, Excellent ≥90),
 * with three shades per family for finer badge granularity.
 */
export function getFitScoreColors(score: number): FitScoreColors {
  const s = Math.max(0, Math.min(100, Math.round(score)))

  if (s >= 90) {
    return { background: '#1E8E47', text: '#FFFFFF' }
  }
  if (s >= 80) {
    return { background: '#24a854', text: '#FFFFFF' }
  }
  if (s >= 70) {
    return { background: '#27b95d', text: '#FFFFFF' }
  }
  if (s >= 64) {
    return { background: '#F0A030', text: '#FFFFFF' }
  }
  if (s >= 57) {
    return { background: '#f1a841', text: '#FFFFFF' }
  }
  if (s >= 50) {
    return { background: '#f2b054', text: '#FFFFFF' }
  }
  if (s >= 34) {
    return { background: '#D55648', text: '#FFFFFF' }
  }
  if (s >= 17) {
    return { background: '#D24737', text: '#FFFFFF' }
  }
  return { background: '#BF3A2B', text: '#FFFFFF' }
}
