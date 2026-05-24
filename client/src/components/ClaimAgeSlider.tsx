import { isValidIsoDateString } from '../lib/ageFromDob'
import {
  clampClaimAge,
  formatSsAgeLabel,
  SS_CLAIM_AGE_MAX,
  SS_CLAIM_AGE_MIN,
} from '../lib/socialSecurity'
import './ClaimAgeSlider.scss'

const SLIDER_AGES = Array.from(
  { length: SS_CLAIM_AGE_MAX - SS_CLAIM_AGE_MIN + 1 },
  (_, i) => SS_CLAIM_AGE_MIN + i,
)

/** Onboarding SS step: show only these tick labels; slider still selects every age 62–70. */
export const SS_CLAIM_SLIDER_MILESTONES = [62, 64, 67, 70] as const

type Props = {
  value: number
  onChange: (age: number) => void
  ariaLabel: string
  dateOfBirth?: string
  disabled?: boolean
  /** Tick labels only; range input still spans min–max. */
  milestoneAges?: readonly number[]
}

export function ClaimAgeSlider({
  value,
  onChange,
  ariaLabel,
  dateOfBirth,
  disabled = false,
  milestoneAges,
}: Props) {
  const age = clampClaimAge(value)
  const tickAges = milestoneAges ?? SLIDER_AGES
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
          min={SS_CLAIM_AGE_MIN}
          max={SS_CLAIM_AGE_MAX}
          step={1}
          value={age}
          disabled={disabled}
          onChange={(e) => onChange(clampClaimAge(Number(e.target.value)))}
          aria-label={ariaLabel}
          aria-valuemin={SS_CLAIM_AGE_MIN}
          aria-valuemax={SS_CLAIM_AGE_MAX}
          aria-valuenow={age}
          aria-valuetext={valueLabel}
        />
      </div>
      <div
        className={[
          'claim-age-slider__ticks',
          milestoneAges ? 'claim-age-slider__ticks--milestones' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-hidden
      >
        {tickAges.map((tickAge) => (
          <span
            key={tickAge}
            className={[
              'claim-age-slider__tick',
              age === tickAge ? ' claim-age-slider__tick--on' : '',
              milestoneAges || tickAge === 62 || tickAge === 67 || tickAge === 70
                ? ' claim-age-slider__tick--milestone'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {tickAge}
          </span>
        ))}
      </div>
    </div>
  )
}
