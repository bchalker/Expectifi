import type { CSSProperties } from 'react'
import { IconShieldCheckFilled } from '@tabler/icons-react'
import { retirementScoreBandFromScore } from '../../utils/retirementScore'
import './ScoreMeterRow.scss'

export type ScoreMeterRowProps = {
  /** Left label; omit for compact bar + value only (list cards, compare). */
  label?: string
  score: number
  max?: number
  /** Progress fill color; defaults from score band. */
  color?: string
  /** Score number color; defaults to `color` or band color. */
  valueColor?: string
  showPerfectBadge?: boolean
  /** Appended to the numeric value (e.g. "%" for budget view). */
  valueSuffix?: string
  className?: string
  trackClassName?: string
}

/** Label + 3px progress track + score — shared by panel breakdown and map list cards. */
export function ScoreMeterRow({
  label,
  score,
  max = 100,
  color,
  valueColor,
  showPerfectBadge = false,
  valueSuffix,
  className,
  trackClassName,
}: ScoreMeterRowProps) {
  const clamped = Math.max(0, Math.min(max, Math.round(score)))
  const pct = max > 0 ? (clamped / max) * 100 : 0
  const { bandColor } = retirementScoreBandFromScore(clamped)
  const fillColor = color ?? bandColor
  const numColor = valueColor ?? color ?? bandColor
  const valueText = valueSuffix ? `${clamped}${valueSuffix}` : String(clamped)
  const ariaLabel = label
    ? `${label}: ${clamped} out of ${max}`
    : valueSuffix
      ? `${clamped}${valueSuffix} of projected income`
      : `Score: ${clamped} out of ${max}`

  return (
    <div
      className={[
        'score-meter-row',
        label ? 'score-meter-row--labeled' : 'score-meter-row--compact',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={
        {
          '--score-meter-pct': `${pct}%`,
          '--score-meter-fill': fillColor,
          '--score-meter-value': numColor,
        } as CSSProperties
      }
    >
      {label ? <span className="score-meter-row__label">{label}</span> : null}
      <div
        className={['score-meter-row__track', trackClassName].filter(Boolean).join(' ')}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={clamped}
        aria-label={ariaLabel}
      >
        {pct > 0 ? (
          <div
            className="score-meter-row__fill"
            style={
              {
                '--score-meter-pct': `${pct}%`,
                '--score-meter-fill': fillColor,
              } as CSSProperties
            }
          />
        ) : null}
      </div>
      <span className="score-meter-row__value tabular-nums">{valueText}</span>
      {showPerfectBadge && clamped >= max ? (
        <span className="score-meter-row__verified" aria-label="Perfect score">
          <IconShieldCheckFilled size={14} aria-hidden />
        </span>
      ) : null}
    </div>
  )
}
