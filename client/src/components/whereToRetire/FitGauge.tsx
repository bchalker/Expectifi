import type { ReactNode } from 'react'
import type { MatchTier } from '../../lib/whereToRetire/cityMapScoring'
import './FitGauge.scss'

type Props = {
  label: string
  score: number
  explanation?: ReactNode
  tier: MatchTier
  className?: string
}

export function FitGauge({ label, score, explanation, tier, className }: Props) {
  const fillPct = Math.max(0, Math.min(100, score))

  return (
    <div className={['wtr-fit-gauge', className].filter(Boolean).join(' ')}>
      <div className="wtr-fit-gauge__row">
        <span className="wtr-fit-gauge__label">{label}</span>
        <div
          className="wtr-fit-gauge__track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={fillPct}
          aria-label={`${label}: ${fillPct} out of 100`}
        >
          <div
            className={`wtr-fit-gauge__fill wtr-fit-gauge__fill--${tier}`}
            style={{ width: `${fillPct}%` }}
          />
        </div>
        <span className={`wtr-fit-gauge__score wtr-fit-gauge__score--${tier}`}>{score}</span>
      </div>
      {explanation ? <div className="wtr-fit-gauge__explanation">{explanation}</div> : null}
    </div>
  )
}
