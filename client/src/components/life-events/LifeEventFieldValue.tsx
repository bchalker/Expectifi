import { useEffect, useState } from 'react'
import { parseNum } from '../../utils/format'

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export interface LifeEventFieldValueProps {
  id: string
  value: number
  onCommit: (value: number) => void
  min: number
  max: number
  ariaLabel: string
  prefix?: string
  suffix?: string
  formatDisplay: (value: number) => string
  parseDisplay?: (raw: string) => number
  round?: (value: number) => number
}

export function LifeEventFieldValue({
  id,
  value,
  onCommit,
  min,
  max,
  ariaLabel,
  prefix,
  suffix,
  formatDisplay,
  parseDisplay = parseNum,
  round = Math.round,
}: LifeEventFieldValueProps) {
  const [text, setText] = useState(() => formatDisplay(value))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setText(formatDisplay(value))
  }, [value, focused, formatDisplay])

  const commit = () => {
    const next = clampNumber(round(parseDisplay(text)), min, max)
    onCommit(next)
    setText(formatDisplay(next))
  }

  return (
    <div className="life-events-field__value-input-wrap">
      {prefix ? (
        <span className="life-events-field__value-affix" aria-hidden>
          {prefix}
        </span>
      ) : null}
      <input
        id={id}
        type="text"
        inputMode="decimal"
        className="life-events-field__value-input"
        value={text}
        size={Math.max(text.length, 1)}
        aria-label={ariaLabel}
        onFocus={() => setFocused(true)}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          commit()
          setFocused(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
            e.currentTarget.blur()
          }
        }}
      />
      {suffix ? (
        <span className="life-events-field__value-affix" aria-hidden>
          {suffix}
        </span>
      ) : null}
    </div>
  )
}
