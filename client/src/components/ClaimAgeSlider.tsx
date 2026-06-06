import { isValidIsoDateString } from '../lib/ageFromDob'
import {
  clampClaimAgeInRange,
  formatSsAgeLabel,
  SS_CLAIM_AGE_MAX,
  SS_CLAIM_AGE_MIN,
} from '../lib/socialSecurity'
import './ClaimAgeSlider.scss'

/** Onboarding SS step: show only these tick labels; slider still selects every age 62–70. */
export const SS_CLAIM_SLIDER_MILESTONES = [62, 64, 67, 70] as const

type Props = {
  value: number
  onChange: (age: number) => void
  ariaLabel: string
  dateOfBirth?: string
  disabled?: boolean
  claimAgeMin?: number
  claimAgeMax?: number
  /** Tick labels only; range input still spans min–max. */
  milestoneAges?: readonly number[]
}

export function ClaimAgeSlider({
  value,
  onChange,
  ariaLabel,
  dateOfBirth,
  disabled = false,
  claimAgeMin = SS_CLAIM_AGE_MIN,
  claimAgeMax = SS_CLAIM_AGE_MAX,
  milestoneAges,
}: Props) {
  const min = claimAgeMin
  const max = claimAgeMax
  const age = clampClaimAgeInRange(value, min, max)
  const tickAges =
    milestoneAges ??
    Array.from({ length: max - min + 1 }, (_, i) => min + i)
  const usePositionedTicks = tickAges.length > 0 && max > min
  const tickPosition = (tickAge: number) =>
    ((tickAge - min) / (max - min)) * 100
  const valueLabel =
    dateOfBirth && isValidIsoDateString(dateOfBirth)
      ? formatSsAgeLabel(dateOfBirth, age)
      : `At ${age}`

  return (
    <div className={`claim-age-slider${disabled ? ' claim-age-slider--disabled' : ''}`}>
      <p className="claim-age-slider__value" aria-live="polite">
        {valueLabel}
      </p>
      <div className="claim-age-slider__row">
        <input
          type="range"
          className="claim-age-slider__input"
          min={min}
          max={max}
          step={1}
          value={age}
          disabled={disabled}
          onChange={(e) => onChange(clampClaimAgeInRange(Number(e.target.value), min, max))}
          aria-label={ariaLabel}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={age}
          aria-valuetext={valueLabel}
        />
      </div>
      <div
        className={[
          'claim-age-slider__ticks',
          usePositionedTicks ? 'claim-age-slider__ticks--positioned' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-hidden
      >
        {tickAges.map((tickAge) => {
          const pct = tickPosition(tickAge)
          const edge =
            tickAge === min ? 'start' : tickAge === max ? 'end' : 'center'
          return (
            <span
              key={tickAge}
              className={[
                'claim-age-slider__tick',
                age === tickAge ? ' claim-age-slider__tick--on' : '',
                milestoneAges || tickAge === 62 || tickAge === 67 || tickAge === 70
                  ? ' claim-age-slider__tick--milestone'
                  : '',
                edge !== 'center' ? ` claim-age-slider__tick--${edge}` : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={usePositionedTicks ? { left: `${pct}%` } : undefined}
            >
              {tickAge}
            </span>
          )
        })}
      </div>
    </div>
  )
}
