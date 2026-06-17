import type { CSSProperties } from 'react'
import { NarrativeWhyLine } from '../ui/NarrativeWhyLine'
import {
  formatQoLDisplayScore,
  qolMetricBandSegments,
  qolMetricMarkerPercent,
  resolveQoLMetricBand,
  type HealthcareBand,
  type QoLMetricKey,
} from '../../utils/qualityOfLife'
import './QoLBandedScoreMeter.scss'

type Props = {
  metricKey: QoLMetricKey
  score: number
  /** Smaller layout for sub-factor rows (no description). */
  compact?: boolean
  /** Full healthcare card only — "Why it matters" copy. */
  description?: string
  className?: string
  /** Override aria label for the banded meter. */
  meterAriaLabel?: string
}

export function QoLBandedScoreMeter({
  metricKey,
  score,
  compact = false,
  description,
  className,
  meterAriaLabel,
}: Props) {
  const scoreValue = formatQoLDisplayScore(score)
  const { visualClass: band, label: bandLabel, bandIndex } = resolveQoLMetricBand(
    metricKey,
    score,
  )
  const segments = qolMetricBandSegments(metricKey)
  const markerPct = qolMetricMarkerPercent(metricKey, score)

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
          <span className={`qol-banded-meter__badge qol-banded-meter__badge--${band}`}>
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
        className="qol-banded-meter__meter"
        role="img"
        aria-label={meterAriaLabel ?? `${bandLabel}, score ${scoreValue} out of 100`}
      >
        <div className="qol-banded-meter__meter-track">
          <div className="qol-banded-meter__meter-segments">
            {segments.map((segment) => (
              <div
                key={segment.band}
                className={[
                  'qol-banded-meter__meter-segment',
                  `qol-banded-meter__meter-segment--${segment.band}`,
                  segment.bandIndex === bandIndex
                    ? 'qol-banded-meter__meter-segment--active'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
            ))}
          </div>
          <span
            className={`qol-banded-meter__marker qol-banded-meter__marker--${band}`}
            style={{ '--qol-marker-pct': `${markerPct}%` } as CSSProperties}
            aria-hidden
          />
        </div>
        <div className="qol-banded-meter__meter-labels">
          {segments.map((segment) => (
            <span
              key={segment.band}
              className={[
                'qol-banded-meter__meter-label',
                segment.bandIndex === bandIndex
                  ? 'qol-banded-meter__meter-label--active'
                  : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {segment.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export type { HealthcareBand }
