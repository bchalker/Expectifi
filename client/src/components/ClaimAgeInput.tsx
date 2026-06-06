import { useState } from 'react'
import { clampClaimAgeInRange } from '../lib/socialSecurity'
import './ClaimAgeInput.scss'

type Props = {
  id: string
  value: number
  onChange: (age: number) => void
  ariaLabel: string
  disabled?: boolean
  claimAgeMin?: number
  claimAgeMax?: number
}

export function ClaimAgeInput({
  id,
  value,
  onChange,
  ariaLabel,
  disabled = false,
  claimAgeMin = 62,
  claimAgeMax = 70,
}: Props) {
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState('')
  const min = claimAgeMin
  const max = claimAgeMax
  const age = clampClaimAgeInRange(value, min, max)
  const maxDigits = String(max).length

  const commitDraft = (raw: string) => {
    const n = Math.round(Number(raw.replace(/,/g, '')))
    if (!Number.isFinite(n) || raw.trim() === '') {
      onChange(age)
      return
    }
    onChange(clampClaimAgeInRange(n, min, max))
  }

  const stepAge = (delta: number) => {
    const next = clampClaimAgeInRange(age + delta, min, max)
    if (next === age) return
    onChange(next)
    if (focused) setDraft(String(next))
  }

  return (
    <div className={`claim-age-input${disabled ? ' claim-age-input--disabled' : ''}`}>
      <div className="onboarding-field-shell claim-age-input__shell">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          className="onboarding-field-shell__input claim-age-input__field"
          value={focused ? draft : String(age)}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={age}
          aria-valuetext={`Age ${age}`}
          onFocus={() => {
            setFocused(true)
            setDraft(String(age))
          }}
          onChange={(e) =>
            setDraft(e.target.value.replace(/[^\d]/g, '').slice(0, maxDigits))
          }
          onBlur={() => {
            setFocused(false)
            commitDraft(draft)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault()
              stepAge(1)
            } else if (e.key === 'ArrowDown') {
              e.preventDefault()
              stepAge(-1)
            }
          }}
        />
      </div>
    </div>
  )
}
