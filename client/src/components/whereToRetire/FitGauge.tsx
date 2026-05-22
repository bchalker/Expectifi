import type { CSSProperties, ReactNode } from 'react'
import type { RetirementScoreBand } from '../../utils/retirementScore'
import './FitGauge.scss'

type Props = {
  label: string
  score: number
  explanation?: ReactNode
  band: RetirementScoreBand
  bandColor: string
  className?: string
}

export function FitGauge({ label, score, explanation, band, bandColor, className }: Props) {
  const fillPct = Math.max(0, Math.min(100, score))

  return (
    <div
      className={['wtr-fit-gauge', `wtr-fit-gauge--${band}`, className].filter(Boolean).join(' ')}
      style={{ '--wtr-band-color': bandColor } as CSSProperties}
    >
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
          <div className="wtr-fit-gauge__fill" style={{ width: `${fillPct}%` }} />
        </div>
        <span className="wtr-fit-gauge__score">{fillPct}</span>
      </div>
      {explanation ? <div className="wtr-fit-gauge__explanation">{explanation}</div> : null}
    </div>
  )
}
