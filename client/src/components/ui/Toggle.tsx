import { useId, type ReactNode } from 'react'
import './Toggle.scss'

export type ToggleProps = {
  value: boolean
  onChange: (value: boolean) => void
  label: ReactNode
  className?: string
  id?: string
}

/** Labeled on/off switch for settings rows. */
export function Toggle({ value, onChange, label, className = '', id }: ToggleProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <label className={['ui-toggle', className].filter(Boolean).join(' ')} htmlFor={inputId}>
      <span className="ui-toggle__label">{label}</span>
      <span className="ui-toggle__switch-wrap">
        <input
          id={inputId}
          type="checkbox"
          className="ui-toggle__input"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="ui-toggle__track" aria-hidden />
      </span>
    </label>
  )
}
