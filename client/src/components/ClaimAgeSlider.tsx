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

type Props = {
  value: number
  onChange: (age: number) => void
  ariaLabel: string
  dateOfBirth?: string
}

export function ClaimAgeSlider({ value, onChange, ariaLabel, dateOfBirth }: Props) {
  const age = clampClaimAge(value)
  const valueLabel =
    dateOfBirth && isValidIsoDateString(dateOfBirth)
      ? formatSsAgeLabel(dateOfBirth, age)
      : `At ${age}`

  return (
    <div className="claim-age-slider">
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
          onChange={(e) => onChange(clampClaimAge(Number(e.target.value)))}
          aria-label={ariaLabel}
          aria-valuemin={SS_CLAIM_AGE_MIN}
          aria-valuemax={SS_CLAIM_AGE_MAX}
          aria-valuenow={age}
          aria-valuetext={valueLabel}
        />
      </div>
      <div className="claim-age-slider__ticks" aria-hidden>
        {SLIDER_AGES.map((tickAge) => (
          <span
            key={tickAge}
            className={`claim-age-slider__tick${age === tickAge ? ' claim-age-slider__tick--on' : ''}${
              tickAge === 62 || tickAge === 67 || tickAge === 70 ? ' claim-age-slider__tick--milestone' : ''
            }`}
          >
            {tickAge}
          </span>
        ))}
      </div>
    </div>
  )
}
