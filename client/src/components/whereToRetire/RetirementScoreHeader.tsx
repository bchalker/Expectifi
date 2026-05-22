import type { CSSProperties } from 'react'
import {
  retirementScoreBandFromScore,
  type RetirementScoreBand,
} from '../../utils/retirementScore'
import './RetirementScoreHeader.scss'

type Props = {
  /** Capped score for badge, main bar, and band. */
  displayScore: number
  incomeFitScore: number
  qolNormalized: number
  band: RetirementScoreBand
  bandColor: string
  bandLabel: string
  warnings?: string[]
  className?: string
}

type MiniRowProps = {
  label: string
  score: number
}

function ScoreMiniRow({ label, score }: MiniRowProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)))
  const { bandColor } = retirementScoreBandFromScore(clamped)

  return (
    <div className="wtr-score-header__mini">
      <span className="wtr-score-header__mini-label">{label}</span>
      <div
        className="wtr-score-header__mini-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        aria-label={`${label}: ${clamped} out of 100`}
      >
        {clamped > 0 ? (
          <div
            className="wtr-score-header__mini-fill"
            style={{ width: `${clamped}%`, background: bandColor }}
          />
        ) : null}
      </div>
      <span className="wtr-score-header__mini-value tabular-nums">{clamped}</span>
    </div>
  )
}

export function RetirementScoreHeader({
  displayScore,
  incomeFitScore,
  qolNormalized,
  band,
  bandColor,
  bandLabel,
  warnings = [],
  className,
}: Props) {
  const mainScore = Math.max(0, Math.min(100, Math.round(displayScore)))

  return (
    <div
      className={['wtr-score-header', `wtr-score-header--${band}`, className]
        .filter(Boolean)
        .join(' ')}
      style={{ '--wtr-band-color': bandColor } as CSSProperties}
    >
      <span className="wtr-score-header__title">Retirement score</span>

      <div className="wtr-score-header__body">
        <div className="wtr-score-header__detail">
          <div
            className="wtr-score-header__main-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={mainScore}
            aria-label={`Retirement score: ${mainScore} out of 100`}
          >
            <div
              className="wtr-score-header__main-fill"
              style={{ width: `${mainScore}%` }}
            />
          </div>

          <p className="wtr-score-header__band-label">{bandLabel}</p>

          {warnings.length > 0 ? (
            <ul className="wtr-score-header__cap-warnings">
              {warnings.map((warning) => (
                <li key={warning} className="wtr-score-header__cap-warning">
                  {warning}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="wtr-score-header__breakdown">
            <ScoreMiniRow label="Income fit" score={incomeFitScore} />
            <ScoreMiniRow label="Quality of life" score={qolNormalized} />
          </div>
        </div>

        <div className="wtr-score-header__badge-col">
          <div
            className="wtr-score-header__score-badge"
            style={{ background: bandColor }}
            aria-label={`Retirement score ${mainScore}, ${bandLabel}`}
          >
            <span className="wtr-score-header__score-badge-value">{mainScore}</span>
          </div>
          <span className="wtr-score-header__score-denom">/ 100</span>
        </div>
      </div>
    </div>
  )
}
