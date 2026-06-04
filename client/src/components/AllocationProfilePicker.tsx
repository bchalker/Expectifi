import {
  ALLOCATION_PROFILE_OPTIONS,
  type AllocationProfile,
} from '../lib/allocationProfile'
import './AllocationProfilePicker.scss'

type Props = {
  value: AllocationProfile | null | undefined
  onChange: (value: AllocationProfile | null) => void
  className?: string
}

/** Optional investment mix for manual accounts (card picker). */
export function AllocationProfilePicker({ value, onChange, className }: Props) {
  const rootClass = ['allocation-profile-picker', className].filter(Boolean).join(' ')

  return (
    <fieldset className={rootClass}>
      <legend className="allocation-profile-picker__legend">How is this account invested?</legend>
      <div className="allocation-profile-picker__options" role="group" aria-label="Investment mix">
        {ALLOCATION_PROFILE_OPTIONS.map((opt) => {
          const selected = value === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              className={[
                'allocation-profile-picker__card',
                selected && 'allocation-profile-picker__card--selected',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-pressed={selected}
              onClick={() => onChange(selected ? null : opt.id)}
            >
              <span className="allocation-profile-picker__card-title">{opt.title}</span>
              <span className="allocation-profile-picker__card-desc">{opt.description}</span>
            </button>
          )
        })}
      </div>
      <p className="allocation-profile-picker__hint">Optional — helps calibrate scenario ranges.</p>
    </fieldset>
  )
}
