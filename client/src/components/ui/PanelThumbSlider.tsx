import { useCallback, useRef, useState } from 'react'
import './PanelThumbSlider.scss'

export type PanelThumbSliderProps = {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  label?: string
  ticks?: number[]
  /** Override thumb label (e.g. "Any" at min). */
  formatThumbValue?: (value: number) => string
  className?: string
  'aria-label'?: string
}

export function PanelThumbSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  label,
  ticks = [25, 50, 75],
  formatThumbValue,
  className = '',
  'aria-label': ariaLabel,
}: PanelThumbSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [draftValue, setDraftValue] = useState<number | null>(null)
  const clamped = Math.max(min, Math.min(max, Math.round(value)))
  const displayValue = draftValue ?? clamped
  const span = max - min
  const percent = span > 0 ? ((displayValue - min) / span) * 100 : 0
  const thumbLabel = formatThumbValue
    ? formatThumbValue(displayValue)
    : String(displayValue)

  const thumbPositionStyle = (() => {
    if (percent <= 0) {
      return { left: '0%', transform: 'translate(0, -50%)' } as const
    }
    if (percent >= 100) {
      return { left: '100%', transform: 'translate(-100%, -50%)' } as const
    }
    return { left: `${percent}%`, transform: 'translate(-50%, -50%)' } as const
  })()

  const valueFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current
      if (!track || span <= 0) return clamped
      const rect = track.getBoundingClientRect()
      if (rect.width <= 0) return clamped
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      return Math.round(min + pct * span)
    },
    [clamped, min, span],
  )

  const commitValue = useCallback(
    (next: number) => {
      const bounded = Math.max(min, Math.min(max, Math.round(next)))
      setDraftValue(null)
      if (bounded !== clamped) onChange(bounded)
    },
    [clamped, max, min, onChange],
  )

  const handleThumbPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handleThumbPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    setDraftValue(valueFromClientX(e.clientX))
  }

  const handleThumbPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragging) {
      commitValue(valueFromClientX(e.clientX))
    }
    setDragging(false)
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.panel-slider__thumb')) return
    commitValue(valueFromClientX(e.clientX))
  }

  const handleThumbKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      commitValue(Math.min(max, displayValue + 1))
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      commitValue(Math.max(min, displayValue - 1))
    }
  }

  return (
    <div className={['panel-slider', className].filter(Boolean).join(' ')}>
      {label ? (
        <span className="panel-slider__label font-xs">{label}</span>
      ) : null}
      <div
        ref={trackRef}
        className="panel-slider__track"
        onPointerDown={handleTrackPointerDown}
      >
        <div className="panel-slider__fill" style={{ width: `${percent}%` }} />
        {ticks.map((t) => (
          <span
            key={t}
            className="panel-slider__tickmark"
            style={{ left: `${span > 0 ? ((t - min) / span) * 100 : 0}%` }}
          />
        ))}
        <div
          className="panel-slider__thumb"
          style={thumbPositionStyle}
          onPointerDown={handleThumbPointerDown}
          onPointerMove={handleThumbPointerMove}
          onPointerUp={handleThumbPointerUp}
          onPointerCancel={handleThumbPointerUp}
          role="slider"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={displayValue}
          aria-label={ariaLabel ?? label ?? 'Slider'}
          tabIndex={0}
          onKeyDown={handleThumbKeyDown}
        >
          <span className="panel-slider__thumb-value tabular-nums">{thumbLabel}</span>
        </div>
      </div>
    </div>
  )
}
