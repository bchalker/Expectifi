import type { CSSProperties } from 'react'
import { NarrativeWhyLine } from '../ui/NarrativeWhyLine'
import {
  clampQoLScore,
  formatQoLDisplayScore,
  resolveQoLMetricBand,
  type HealthcareBand,
  type QoLMetricKey,
} from '../../utils/qualityOfLife'
import './QoLBandedScoreMeter.scss'

type Props = {
  metricKey: QoLMetricKey
  score: number
  /** Override band styling when parent badge uses a different tier system. */
  visualBand?: HealthcareBand
  /** Smaller layout — score row omitted (parent supplies headline score). */
  compact?: boolean
  /** Full healthcare card only — "Why it matters" copy. */
  description?: string
  className?: string
  meterAriaLabel?: string
}

export function QoLBandedScoreMeter({
  metricKey,
  score,
  visualBand,
  compact = false,
  description,
  className,
  meterAriaLabel,
}: Props) {
  const scoreValue = formatQoLDisplayScore(score)
  const resolved = resolveQoLMetricBand(metricKey, score)
  const band = visualBand ?? resolved.visualClass
  const bandLabel = resolved.label
  const fillPct = clampQoLScore(score)

  return (
    <div
      className={[
        'qol-banded-meter',
        compact && 'qol-banded-meter--compact',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {!compact ? (
        <div className="qol-banded-meter__score-row">
          <p className="qol-banded-meter__score tabular-nums">
            <span className="qol-banded-meter__score-value">{scoreValue}</span>
            <span className="qol-banded-meter__score-denom"> / 100</span>
          </p>
          <span
            className={`qol-banded-meter__badge qol-banded-meter__badge--${band}`}
          >
            {bandLabel}
          </span>
        </div>
      ) : null}

      {description ? (
        <NarrativeWhyLine className="qol-banded-meter__wimfy">
          {description}
        </NarrativeWhyLine>
      ) : null}

      <div
        className={`qol-banded-meter__bar qol-banded-meter__bar--${band}`}
        role="img"
        aria-label={
          meterAriaLabel ??
          `${bandLabel}, score ${scoreValue} out of 100`
        }
      >
        <div
          className="qol-banded-meter__bar-fill"
          style={{ width: `${fillPct}%` } as CSSProperties}
        />
      </div>
    </div>
  )
}

export type { HealthcareBand }
