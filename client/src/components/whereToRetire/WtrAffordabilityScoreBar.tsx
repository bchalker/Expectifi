import type { BudgetFitBand } from '../../lib/whereToRetire/mapPinDisplay'
import { ScoreMeterRow } from '../ui/ScoreMeterRow'
import type { RetirementScoreBand } from '../../utils/retirementScore'

type Props = {
  score: number
  band: RetirementScoreBand | BudgetFitBand
  bandColor: string
  /** When set (e.g. "%"), shown after the score for budget-style meters. */
  valueSuffix?: string
  className?: string
}

/** Compact score meter (bar + value) for map list cards and compare table. */
export function WtrAffordabilityScoreBar({
  score,
  band,
  bandColor,
  valueSuffix,
  className,
}: Props) {
  const clamped = Math.max(0, Math.min(100, score))

  return (
    <ScoreMeterRow
      score={clamped}
      color={bandColor}
      valueColor={bandColor}
      valueSuffix={valueSuffix}
      showPerfectBadge={valueSuffix == null}
      className={['wtr-afford-score', `wtr-afford-score--${band}`, className]
        .filter(Boolean)
        .join(' ')}
    />
  )
}
