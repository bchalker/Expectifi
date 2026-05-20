import type { ReactNode } from 'react'
import type { MatchTier } from '../../lib/whereToRetire/cityMapScoring'
import './FitGauge.scss'

type Props = {
  label: string
  score: number
  explanation: ReactNode
  tier: MatchTier
  className?: string
}

export function FitGauge({ label, score, explanation, tier, className }: Props) {
  return (
    <div className={['wtr-fit-gauge', className].filter(Boolean).join(' ')}>
      <div className="wtr-fit-gauge__head">
        <span className="wtr-fit-gauge__label">{label}</span>
        <span className={`wtr-fit-gauge__score wtr-fit-gauge__score--${tier}`}>{score}</span>
      </div>
      <div className="wtr-fit-gauge__track" aria-hidden>
        <div
          className={`wtr-fit-gauge__fill wtr-fit-gauge__fill--${tier}`}
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>
      <div className="wtr-fit-gauge__explanation">{explanation}</div>
    </div>
  )
}
