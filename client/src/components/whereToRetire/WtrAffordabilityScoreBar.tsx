import type { CSSProperties } from 'react'
import { IconShieldCheckFilled } from '@tabler/icons-react'
import type { BudgetFitBand } from '../../lib/whereToRetire/mapPinDisplay'
import type { RetirementScoreBand } from '../../utils/retirementScore'
import './WtrAffordabilityScoreBar.scss'

type Props = {
  score: number
  band: RetirementScoreBand | BudgetFitBand
  bandColor: string
  className?: string
}

export function WtrAffordabilityScoreBar({ score, band, bandColor, className }: Props) {
  const clamped = Math.max(0, Math.min(100, score))
  const isPerfect = clamped >= 100

  return (
    <div
      className={['wtr-afford-score', `wtr-afford-score--${band}`, className]
        .filter(Boolean)
        .join(' ')}
      style={
        {
          '--wtr-afford-pct': `${clamped}%`,
          '--wtr-band-color': bandColor,
        } as CSSProperties
      }
    >
      <div
        className="wtr-afford-score__bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        aria-label={`Retirement score: ${clamped}`}
      />
      <span className="wtr-afford-score__num">{clamped}</span>
      {isPerfect ? (
        <span className="wtr-afford-score__verified" aria-label="Perfect retirement score">
          <IconShieldCheckFilled size={14} aria-hidden />
        </span>
      ) : null}
    </div>
  )
}
