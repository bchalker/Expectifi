import { useEffect, useState } from 'react'
import { Input, Label, TextField } from '@heroui/react'
import { parseNum } from '../../utils/format'
import './LifeEventHeroField.scss'

type Props = {
  id: string
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  className?: string
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function LifeEventPercentInput({
  id,
  label,
  value,
  min,
  max,
  onChange,
  className = '',
}: Props) {
  const [focused, setFocused] = useState(false)
  const [text, setText] = useState(() => value.toFixed(2))

  useEffect(() => {
    if (!focused) setText(value.toFixed(2))
  }, [value, focused])

  const commit = () => {
    const next = clampNumber(Math.round(parseNum(text) * 100) / 100, min, max)
    onChange(next)
    setText(next.toFixed(2))
  }

  const labelId = `${id}-label`

  return (
    <div className={['life-event-hero-field', className].filter(Boolean).join(' ')}>
      <Label className="life-event-hero-field__label" id={labelId} htmlFor={id}>
        {label}
      </Label>
      <div className="life-event-hero-field__affix-row">
        <TextField
          className="life-event-hero-field__control life-event-hero-field__control--hug"
          variant="secondary"
          aria-labelledby={labelId}
          value={text}
          onChange={setText}
        >
          <Input
            id={id}
            type="text"
            inputMode="decimal"
            className="life-event-hero-field__input"
            onFocus={() => setFocused(true)}
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
        </TextField>
        <span className="life-event-hero-field__suffix" aria-hidden>
          %
        </span>
      </div>
    </div>
  )
}
