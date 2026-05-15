import type { ReactNode } from 'react'

type Props = {
  name: ReactNode
  valueLabel: ReactNode
  min: number
  max: number
  step: number
  value: number
  onChange: (n: number) => void
  tickLeft: ReactNode
  tickMid?: ReactNode
  tickRight: ReactNode
  disabled?: boolean
  borderBottomNone?: boolean
  /**
   * When `min < 0` and `max > 0`, draw a vertical tick at numeric zero on the track (no mid label).
   * Ignores `tickMid` when set.
   */
  zeroHashMark?: boolean
}

export function InlineSliderRow({
  name,
  valueLabel,
  min,
  max,
  step,
  value,
  onChange,
  tickLeft,
  tickMid,
  tickRight,
  disabled,
  borderBottomNone,
  zeroHashMark,
}: Props) {
  const zeroLeftPct =
    zeroHashMark && min < 0 && max > 0 ? ((0 - min) / (max - min)) * 100 : null

  return (
    <div className="inline-slider-row" style={borderBottomNone ? { borderBottom: 'none' } : undefined}>
      <div className="isr-label">
        <span className="isr-name">{name}</span>
        <span className="isr-val">{valueLabel}</span>
      </div>
      <div className="isr-track">
        <div className={`range-inline-row${zeroLeftPct != null ? ' range-inline-row--zero-hash' : ''}`}>
          <div className="range-inline-track-wrap">
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={value}
              disabled={disabled}
              style={disabled ? { opacity: 0.25, cursor: 'not-allowed' } : undefined}
              onChange={(e) => onChange(Number(e.target.value))}
            />
            {zeroLeftPct != null ? (
              <div className="range-inline-zero-hash" style={{ left: `${zeroLeftPct}%` }} aria-hidden />
            ) : null}
          </div>
          <div className="range-inline-ticks">
            <span className="range-inline-tick">{tickLeft}</span>
            <span className="range-inline-tick range-inline-tick--end">{tickRight}</span>
          </div>
          {tickMid && zeroLeftPct == null ? <div className="range-inline-mid">{tickMid}</div> : null}
        </div>
      </div>
    </div>
  )
}
