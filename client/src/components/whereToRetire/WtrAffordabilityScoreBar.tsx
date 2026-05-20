import type { CSSProperties } from 'react'
import { IconShieldCheck } from '@tabler/icons-react'
import type { MatchTier } from '../../lib/whereToRetire/cityMapScoring'
import './WtrAffordabilityScoreBar.scss'

type Props = {
  score: number
  tier: MatchTier
  className?: string
}

export function WtrAffordabilityScoreBar({ score, tier, className }: Props) {
  const clamped = Math.max(0, Math.min(100, score))
  const isPerfect = clamped >= 100

  return (
    <div
      className={['wtr-afford-score', `wtr-afford-score--${tier}`, className]
        .filter(Boolean)
        .join(' ')}
      style={{ '--wtr-afford-pct': `${clamped}%` } as CSSProperties}
    >
      <div
        className="wtr-afford-score__bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        aria-label={`Retirement income fit score: ${clamped}`}
      />
      <span className="wtr-afford-score__num">{clamped}</span>
      {isPerfect ? (
        <span className="wtr-afford-score__verified" aria-label="Perfect retirement income fit score">
          <IconShieldCheck size={12} stroke={2} aria-hidden />
        </span>
      ) : null}
    </div>
  )
}
