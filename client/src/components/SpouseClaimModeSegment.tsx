import './SpouseClaimModeSegment.scss'

export type SpouseClaimMode = 'own' | 'spousal'

type Props = {
  value: SpouseClaimMode
  onChange: (mode: SpouseClaimMode) => void
  spousalHint?: string
  disabled?: boolean
}

const OPTIONS: { id: SpouseClaimMode; label: string }[] = [
  { id: 'own', label: 'Their own benefit' },
  { id: 'spousal', label: 'Spousal (50% of yours)' },
]

export function SpouseClaimModeSegment({ value, onChange, spousalHint, disabled = false }: Props) {
  return (
    <div
      className={`spouse-claim-mode-group${disabled ? ' spouse-claim-mode-group--disabled' : ''}`}
      role="radiogroup"
      aria-label="How your spouse will claim Social Security"
    >
      <div className="spouse-claim-mode-group__buttons">
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={value === opt.id}
            className={`spouse-claim-mode-group__btn${value === opt.id ? ' spouse-claim-mode-group__btn--on' : ''}`}
            disabled={disabled}
            onClick={() => onChange(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {spousalHint && value === 'spousal' ? (
        <p className="spouse-claim-mode-group__hint">{spousalHint}</p>
      ) : null}
    </div>
  )
}
