import { useEffect, useState } from 'react'
import { Input, Label, TextField } from '@heroui/react'
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

export function LifeEventYearInput({
  id,
  label,
  value,
  min,
  max,
  onChange,
  className = '',
}: Props) {
  const [focused, setFocused] = useState(false)
  const [text, setText] = useState(() => String(value))

  useEffect(() => {
    if (!focused) setText(String(value))
  }, [value, focused])

  const commit = () => {
    const parsed = parseInt(text.replace(/,/g, ''), 10)
    const next = clampNumber(Number.isFinite(parsed) ? parsed : value, min, max)
    onChange(next)
    setText(String(next))
  }

  const labelId = `${id}-label`

  return (
    <div className={['life-event-hero-field', className].filter(Boolean).join(' ')}>
      <Label className="life-event-hero-field__label" id={labelId} htmlFor={id}>
        {label}
      </Label>
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
          inputMode="numeric"
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
    </div>
  )
}
