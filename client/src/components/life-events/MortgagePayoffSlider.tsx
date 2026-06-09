import { useMemo, type CSSProperties } from 'react'
import { formatMortgagePayoffAriaLabel } from '../../lib/calc/mortgageLifeEvent'
import { lifeEventRangeFillStyle } from './utils'

type Props = {
  id: string
  min: number
  max: number
  value: number
  scheduledPayoffYear: number
  onChange: (year: number) => void
}

function calcThumbRatio(value: number, min: number, max: number): number {
  const span = max - min
  if (span <= 0) return 0
  return (value - min) / span
}

export function MortgagePayoffSlider({
  id,
  min,
  max,
  value,
  scheduledPayoffYear,
  onChange,
}: Props) {
  const thumbRatio = calcThumbRatio(value, min, max)
  const ariaLabel = formatMortgagePayoffAriaLabel(value, scheduledPayoffYear)

  const railStyle = useMemo(
    () =>
      ({
        ...lifeEventRangeFillStyle(value, min, max),
        '--thumb-ratio': String(thumbRatio),
      }) as CSSProperties,
    [value, min, max, thumbRatio],
  )

  return (
    <div className="life-events-mortgage-payoff-slider">
      <div className="life-events-mortgage-payoff-slider__track-wrap">
        <div className="life-events-mortgage-payoff-slider__rail" style={railStyle}>
          <div className="life-events-mortgage-payoff-slider__thumb-panel" aria-hidden>
            <div className="life-events-mortgage-payoff-slider__thumb-panel-body">
              <span className="life-events-mortgage-payoff-slider__thumb-panel-kicker">
                Pay off
              </span>
              <span className="life-events-mortgage-payoff-slider__thumb-panel-year tabular-nums">
                {value}
              </span>
            </div>
          </div>
          <input
            id={id}
            className="life-events-field__range life-events-mortgage-payoff-slider__range"
            type="range"
            min={min}
            max={max}
            step={1}
            value={value}
            style={lifeEventRangeFillStyle(value, min, max)}
            onChange={(e) => onChange(Number(e.target.value))}
            aria-label={ariaLabel}
            aria-valuetext={ariaLabel}
          />
        </div>
        <div className="life-events-mortgage-payoff-slider__track-ends" aria-hidden>
          <span className="life-events-mortgage-payoff-slider__track-end life-events-mortgage-payoff-slider__track-end--min">
            Today
          </span>
          <span className="life-events-mortgage-payoff-slider__track-end life-events-mortgage-payoff-slider__track-end--schedule tabular-nums">
            Retirement · {max}
          </span>
        </div>
      </div>
    </div>
  )
}
