import type { WtrDealbreaker, WtrPreferences, WtrPriority, WtrRegionScope } from '../../lib/whereToRetire/preferences'

export const REGION_OPTIONS: { value: WtrRegionScope; label: string }[] = [
  { value: 'us-only', label: 'In the US only' },
  { value: 'international-only', label: 'International only' },
  { value: 'both', label: 'Both' },
]

export const PRIORITY_OPTIONS: { value: WtrPriority; label: string }[] = [
  { value: 'lowest-tax', label: 'Lowest tax burden' },
  { value: 'lowest-col', label: 'Lowest cost of living' },
  { value: 'highest-surplus', label: 'Highest monthly surplus' },
  { value: 'quality-of-life', label: 'Quality of life' },
  { value: 'healthcare-access', label: 'Healthcare access' },
  { value: 'dollar-strength', label: 'Keeping my dollar strong' },
]

export const DEALBREAKER_OPTIONS: { value: WtrDealbreaker; label: string; hint?: string }[] = [
  { value: 'english-speaking', label: 'Must be English-speaking primarily' },
  {
    value: 'medicare',
    label: 'Must have Medicare access',
    hint: 'Removes international destinations',
  },
  { value: 'none', label: 'No dealbreakers' },
]

type Draft = Pick<WtrPreferences, 'regionScope' | 'priorities' | 'dealbreakers'>

type Props = {
  draft: Draft
  onChange: (draft: Draft) => void
  step: 1 | 2 | 3
}

export function PreferenceQuestions({ draft, onChange, step }: Props) {
  const togglePriority = (value: WtrPriority) => {
    const has = draft.priorities.includes(value)
    if (has) {
      onChange({ ...draft, priorities: draft.priorities.filter((p) => p !== value) })
      return
    }
    if (draft.priorities.length >= 2) return
    onChange({ ...draft, priorities: [...draft.priorities, value] })
  }

  const toggleDealbreaker = (value: WtrDealbreaker) => {
    if (value === 'none') {
      onChange({ ...draft, dealbreakers: ['none'] })
      return
    }
    const withoutNone = draft.dealbreakers.filter((d) => d !== 'none')
    const has = withoutNone.includes(value)
    const next = has ? withoutNone.filter((d) => d !== value) : [...withoutNone, value]
    onChange({ ...draft, dealbreakers: next })
  }

  if (step === 1) {
    return (
      <fieldset className="wtr-prefs__fieldset">
        <legend className="wtr-prefs__legend">Where are you open to retiring?</legend>
        <div className="wtr-prefs__options wtr-prefs__options--radio">
          {REGION_OPTIONS.map((opt) => (
            <label key={opt.value} className="wtr-prefs__option">
              <input
                type="radio"
                name="wtr-region"
                checked={draft.regionScope === opt.value}
                onChange={() => onChange({ ...draft, regionScope: opt.value })}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    )
  }

  if (step === 2) {
    return (
      <fieldset className="wtr-prefs__fieldset">
        <legend className="wtr-prefs__legend">What matters most to you?</legend>
        <p className="wtr-prefs__hint">Pick up to 2</p>
        <div className="wtr-prefs__options">
          {PRIORITY_OPTIONS.map((opt) => {
            const checked = draft.priorities.includes(opt.value)
            const disabled = !checked && draft.priorities.length >= 2
            return (
              <label
                key={opt.value}
                className={`wtr-prefs__option wtr-prefs__option--check${disabled ? ' wtr-prefs__option--disabled' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => togglePriority(opt.value)}
                />
                <span>{opt.label}</span>
              </label>
            )
          })}
        </div>
      </fieldset>
    )
  }

  return (
    <fieldset className="wtr-prefs__fieldset">
      <legend className="wtr-prefs__legend">Any dealbreakers?</legend>
      <p className="wtr-prefs__hint">Optional — select any that apply</p>
      <div className="wtr-prefs__options">
        {DEALBREAKER_OPTIONS.map((opt) => {
          const checked =
            opt.value === 'none'
              ? draft.dealbreakers.includes('none') || draft.dealbreakers.length === 0
              : draft.dealbreakers.includes(opt.value)
          return (
            <label key={opt.value} className="wtr-prefs__option wtr-prefs__option--check">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleDealbreaker(opt.value)}
              />
              <span>
                {opt.label}
                {opt.hint ? <span className="wtr-prefs__option-hint">{opt.hint}</span> : null}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
