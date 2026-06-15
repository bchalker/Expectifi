import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  CLIMATE_TEMP_MAX_F,
  CLIMATE_TEMP_MIN_F,
} from '../../types/preferences'
import { rangeThumbPosition } from './PrioritySlider'
import './TemperatureRangeGauge.scss'

export interface TemperatureRangeGaugeProps {
  minF: number
  maxF: number
  onChange: (minF: number, maxF: number) => void
  disabled?: boolean
  className?: string
}

const THUMB_PX = 18
const TEMP_SPAN = CLIMATE_TEMP_MAX_F - CLIMATE_TEMP_MIN_F

function clampTemp(value: number): number {
  return Math.max(CLIMATE_TEMP_MIN_F, Math.min(CLIMATE_TEMP_MAX_F, Math.round(value)))
}

function tempRatio(tempF: number): number {
  return (tempF - CLIMATE_TEMP_MIN_F) / TEMP_SPAN
}

function tempThumbPosition(tempF: number): string {
  return rangeThumbPosition(tempF - CLIMATE_TEMP_MIN_F, TEMP_SPAN, THUMB_PX)
}

function tempTrackShadeWidth(tempF: number): string {
  return `calc(${tempThumbPosition(tempF)} - var(--temp-range-thumb) / 2)`
}

export function TemperatureRangeGauge({
  minF,
  maxF,
  onChange,
  disabled = false,
  className,
}: TemperatureRangeGaugeProps) {
  const safeMin = clampTemp(minF)
  const safeMax = clampTemp(maxF)
  const orderedMin = Math.min(safeMin, safeMax)
  const orderedMax = Math.max(safeMin, safeMax)
  const rangeLabel = useMemo(
    () => `${orderedMin}°F – ${orderedMax}°F`,
    [orderedMin, orderedMax],
  )
  const splitRatio = tempRatio((orderedMin + orderedMax) / 2) * 100
  const trackStyle = {
    '--temp-range-split': `${splitRatio}%`,
  } as CSSProperties
  const [draggingThumb, setDraggingThumb] = useState<'min' | 'max' | null>(null)
  const minInputRef = useRef<HTMLInputElement>(null)
  const maxInputRef = useRef<HTMLInputElement>(null)

  const beginDrag = (thumb: 'min' | 'max') => {
    const minEl = minInputRef.current
    const maxEl = maxInputRef.current
    if (!minEl || !maxEl) return
    minEl.classList.toggle('temperature-range-gauge__input--dragging', thumb === 'min')
    maxEl.classList.toggle('temperature-range-gauge__input--dragging', thumb === 'max')
    setDraggingThumb(thumb)
  }

  const endDrag = () => {
    minInputRef.current?.classList.remove('temperature-range-gauge__input--dragging')
    maxInputRef.current?.classList.remove('temperature-range-gauge__input--dragging')
    setDraggingThumb(null)
  }

  useEffect(() => {
    if (!draggingThumb) return
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)
    return () => {
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
    }
  }, [draggingThumb])

  const setMin = (nextMin: number) => {
    const clamped = clampTemp(nextMin)
    onChange(Math.min(clamped, orderedMax), orderedMax)
  }

  const setMax = (nextMax: number) => {
    const clamped = clampTemp(nextMax)
    onChange(orderedMin, Math.max(clamped, orderedMin))
  }

  return (
    <div
      className={[
        'temperature-range-gauge',
        disabled && 'temperature-range-gauge--disabled',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="temperature-range-gauge__rail">
        <div className="temperature-range-gauge__heading">
          <span className="temperature-range-gauge__heading-label">Temp Range</span>
          <span className="temperature-range-gauge__heading-value tabular-nums">{rangeLabel}</span>
        </div>
        <div className="temperature-range-gauge__track-column">
          <div className="temperature-range-gauge__track-wrap" style={trackStyle}>
            <div className="temperature-range-gauge__track" aria-hidden />
            <div
              className="temperature-range-gauge__track-shade temperature-range-gauge__track-shade--left"
              style={{ width: tempTrackShadeWidth(orderedMin) }}
              aria-hidden
            />
            <div
              className="temperature-range-gauge__track-shade temperature-range-gauge__track-shade--right"
              style={{
                left: tempThumbPosition(orderedMax),
                width: `calc(100% - ${tempThumbPosition(orderedMax)} - var(--temp-range-thumb) / 2)`,
              }}
              aria-hidden
            />
            <input
              ref={minInputRef}
              type="range"
              className={[
                'temperature-range-gauge__input',
                'temperature-range-gauge__input--min',
                draggingThumb === 'min' && 'temperature-range-gauge__input--dragging',
              ]
                .filter(Boolean)
                .join(' ')}
              min={CLIMATE_TEMP_MIN_F}
              max={CLIMATE_TEMP_MAX_F}
              step={1}
              value={orderedMin}
              disabled={disabled}
              aria-label="Minimum preferred temperature"
              aria-valuetext={`${orderedMin} degrees Fahrenheit`}
              onPointerDown={() => beginDrag('min')}
              onChange={(event) => setMin(Number(event.target.value))}
            />
            <input
              ref={maxInputRef}
              type="range"
              className={[
                'temperature-range-gauge__input',
                'temperature-range-gauge__input--max',
                draggingThumb === 'max' && 'temperature-range-gauge__input--dragging',
              ]
                .filter(Boolean)
                .join(' ')}
              min={CLIMATE_TEMP_MIN_F}
              max={CLIMATE_TEMP_MAX_F}
              step={1}
              value={orderedMax}
              disabled={disabled}
              aria-label="Maximum preferred temperature"
              aria-valuetext={`${orderedMax} degrees Fahrenheit`}
              onPointerDown={() => beginDrag('max')}
              onChange={(event) => setMax(Number(event.target.value))}
            />
          </div>
        </div>
      </div>
      <p className="temperature-range-gauge__note">
        Cities with average temperatures within about 2–3° of this range are also included — this
        isn't an all-or-nothing cutoff.
      </p>
    </div>
  )
}
