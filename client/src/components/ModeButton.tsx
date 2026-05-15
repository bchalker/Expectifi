import type { ReactNode } from 'react'
import './ModeButton.scss'

export type ModeButtonOption<T extends string> = {
  id: T
  label: string
  icon?: ReactNode
}

type Props<T extends string> = {
  value: T
  options: readonly ModeButtonOption<T>[]
  onChange: (id: T) => void
  ariaLabel: string
}

/** Small pill group for Flat | Per-year | Scenario style selectors. */
export function ModeButtonGroup<T extends string>({ value, options, onChange, ariaLabel }: Props<T>) {
  return (
    <div className="mode-button-group" role="group" aria-label={ariaLabel}>
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          className={`mode-button${value === opt.id ? ' mode-button--active' : ''}`}
          aria-pressed={value === opt.id}
          onClick={() => onChange(opt.id)}
        >
          {opt.icon ? <span className="mode-button__icon">{opt.icon}</span> : null}
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  )
}
