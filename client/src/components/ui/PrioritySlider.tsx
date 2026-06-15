import { useMemo } from 'react'
import type { PriorityBand } from '../../utils/preferenceBands'
import { bandForValue } from '../../utils/preferenceBands'
import './PrioritySlider.scss'

export interface PrioritySliderProps {
  value: number
  onChange: (value: number) => void
  bands: PriorityBand[]
  disabled?: boolean
  ariaLabel?: string
  className?: string
}

const TICK_VALUES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const
const RANGE_MAX = 10
const THUMB_PX = 18

/** Match native range thumb centering (inset by half thumb width at each end). */
export function rangeThumbPosition(value: number, max: number, thumbPx = THUMB_PX): string {
  const ratio = max > 0 ? value / max : 0
  const half = thumbPx / 2
  return `calc(${ratio} * (100% - ${thumbPx}px) + ${half}px)`
}

function rangeFillWidth(value: number, max: number, thumbPx = THUMB_PX): string {
  const ratio = max > 0 ? value / max : 0
  return `calc(${ratio} * (100% - ${thumbPx}px))`
}

export function PrioritySlider({
  value,
  onChange,
  bands,
  disabled = false,
  ariaLabel = 'Priority',
  className,
}: PrioritySliderProps) {
  const clamped = Math.max(0, Math.min(RANGE_MAX, Math.round(value)))
  const activeBand = useMemo(() => bandForValue(bands, clamped), [bands, clamped])

  return (
    <div
      className={['priority-slider', disabled && 'priority-slider--disabled', className]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="priority-slider__rail">
        <div className="priority-slider__track-wrap">
          <div className="priority-slider__track" aria-hidden />
          <div
            className="priority-slider__fill"
            style={{ width: rangeFillWidth(clamped, RANGE_MAX) }}
            aria-hidden
          />
          <input
            type="range"
            className="priority-slider__input"
            min={0}
            max={RANGE_MAX}
            step={1}
            value={clamped}
            disabled={disabled}
            aria-label={ariaLabel}
            aria-valuetext={`${activeBand.title}, ${clamped} out of 10`}
            onChange={(event) => onChange(Number(event.target.value))}
          />
        </div>
        <div className="priority-slider__ticks">
          {TICK_VALUES.map((tick) => (
            <button
              key={tick}
              type="button"
              className={[
                'priority-slider__tick',
                tick <= clamped && 'priority-slider__tick--in-range',
                tick === clamped && 'priority-slider__tick--active',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{ left: rangeThumbPosition(tick, RANGE_MAX) }}
              disabled={disabled}
              aria-label={`Set priority to ${tick} out of 10`}
              onClick={() => onChange(tick)}
            >
              <span className="priority-slider__tick-mark" />
              <span className="priority-slider__tick-label tabular-nums">{tick}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
