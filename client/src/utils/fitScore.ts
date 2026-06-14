export type FitScoreColors = {
  background: string
  text: string
}

/**
 * 0–100 fit score color bands for the destination detail header badge.
 * The same band mapping could later be reused for other scores on the same
 * scale (e.g. Quality of Life index) if we want consistent color semantics
 * across the app — treat that as a separate follow-up.
 */
export function getFitScoreColors(score: number): FitScoreColors {
  const s = Math.max(0, Math.min(100, Math.round(score)))

  if (s >= 80) {
    return { background: '#27500A', text: '#FFFFFF' }
  }
  if (s >= 60) {
    return { background: '#3B6D11', text: '#FFFFFF' }
  }
  if (s >= 40) {
    return { background: '#854F0B', text: '#FFFFFF' }
  }
  return { background: '#A32D2D', text: '#FFFFFF' }
}
