/** Vanguard How America Saves 2024 — approximate median retirement savings by age band. */
const MEDIAN_BY_AGE_BAND: { minAge: number; maxAge: number; median: number }[] = [
  { minAge: 25, maxAge: 34, median: 37_211 },
  { minAge: 35, maxAge: 44, median: 97_020 },
  { minAge: 45, maxAge: 54, median: 179_200 },
  { minAge: 55, maxAge: 64, median: 256_244 },
  { minAge: 65, maxAge: 120, median: 334_000 },
]

export type SavingsComparisonCopy = {
  headline: string
  /** 0–100 for logic; bar fill uses visualPercent capped at 95. */
  percentile: number
  visualPercent: number
  showBar: boolean
}

function medianForAge(age: number): number {
  const band = MEDIAN_BY_AGE_BAND.find((b) => age >= b.minAge && age <= b.maxAge)
  return band?.median ?? MEDIAN_BY_AGE_BAND[MEDIAN_BY_AGE_BAND.length - 1]!.median
}

/**
 * Rough percentile vs national median for age (linear between band floor and 2× median).
 * Capped at 99 for copy; bar display capped separately at 95%.
 */
export function savingsComparisonForAge(
  totalSavings: number,
  age: number,
): SavingsComparisonCopy {
  if (!Number.isFinite(totalSavings) || totalSavings <= 0 || !Number.isFinite(age) || age < 18) {
    return {
      headline: '',
      percentile: 0,
      visualPercent: 0,
      showBar: false,
    }
  }

  const median = medianForAge(age)
  if (totalSavings >= median * 2) {
    const pct = Math.min(99, 90 + Math.round((totalSavings / (median * 2) - 1) * 5))
    return {
      headline: `You're ahead of ${pct}% of Americans your age`,
      percentile: pct,
      visualPercent: Math.min(95, pct),
      showBar: true,
    }
  }

  if (totalSavings >= median) {
    const span = median
    const pct = Math.min(
      89,
      50 + Math.round(((totalSavings - median) / span) * 39),
    )
    return {
      headline: `You're ahead of ${pct}% of Americans your age`,
      percentile: pct,
      visualPercent: Math.min(95, pct),
      showBar: true,
    }
  }

  const ratio = totalSavings / median
  const pct = Math.max(5, Math.round(ratio * 48))
  return {
    headline: "You're building toward the national average — there's still time.",
    percentile: pct,
    visualPercent: Math.min(95, pct),
    showBar: true,
  }
}
