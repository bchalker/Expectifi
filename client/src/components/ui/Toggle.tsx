import { useId, type ReactNode } from 'react'
import './Toggle.scss'

export type ToggleProps = {
  value: boolean
  onChange: (value: boolean) => void
  /** Omit for switch-only layouts; set `accessibilityLabel` when hidden. */
  label?: ReactNode
  accessibilityLabel?: string
  className?: string
  id?: string
}

/** Labeled on/off switch for settings rows. */
export function Toggle({
  value,
  onChange,
  label,
  accessibilityLabel,
  className = '',
  id,
}: ToggleProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const showLabel = label != null && label !== ''

  return (
    <label
      className={['ui-toggle', !showLabel && 'ui-toggle--switch-only', className].filter(Boolean).join(' ')}
      htmlFor={inputId}
      aria-label={!showLabel ? accessibilityLabel : undefined}
    >
      {showLabel ? <span className="ui-toggle__label">{label}</span> : null}
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
