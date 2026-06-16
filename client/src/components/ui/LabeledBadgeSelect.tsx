import { useCallback, useId, useRef, useState, type ReactNode } from 'react'
import { IconChevronDown } from '@tabler/icons-react'
import { useClickOutside } from '../../hooks/useClickOutside'
import './LabelWithHelperPill.scss'
import './LabeledBadgeSelect.scss'

export type LabeledBadgeSelectOption<T extends string> = {
  id: T
  label: string
  disabled?: boolean
}

type Props<T extends string> = {
  value: T
  options: readonly LabeledBadgeSelectOption<T>[]
  onChange: (value: T) => void
  label: ReactNode
  helper?: ReactNode
  helperPlacement?: 'above' | 'below'
  ariaLabel?: string
  className?: string
}

export function LabeledBadgeSelect<T extends string>({
  value,
  options,
  onChange,
  label,
  helper,
  helperPlacement = 'below',
  ariaLabel,
  className = '',
}: Props<T>) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const labelId = useId()
  const close = useCallback(() => setOpen(false), [])
  useClickOutside(rootRef, close, open)

  return (
    <div
      ref={rootRef}
      className={['labeled-badge-select', className].filter(Boolean).join(' ')}
    >
      <button
        type="button"
        className={[
          'labeled-badge-select__trigger',
          'label-with-helper-pill',
          helperPlacement === 'above' && 'label-with-helper-pill--helper-above',
          helperPlacement === 'below' && 'label-with-helper-pill--helper-below',
          open && 'labeled-badge-select__trigger--open',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-labelledby={labelId}
        aria-label={ariaLabel}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="labeled-badge-select__copy" id={labelId}>
          {helper && helperPlacement === 'above' ? (
            <span className="label-with-helper-pill__helper">{helper}</span>
          ) : null}
          <span className="label-with-helper-pill__label">{label}</span>
          {helper && helperPlacement === 'below' ? (
            <span className="label-with-helper-pill__helper">{helper}</span>
          ) : null}
        </span>
        <span className="labeled-badge-select__trail" aria-hidden>
          <IconChevronDown size={14} stroke={1.5} />
        </span>
      </button>
      {open ? (
        <ul
          className="labeled-badge-select__menu"
          role="listbox"
          aria-labelledby={labelId}
        >
          {options.map((option) => {
            const selected = option.id === value
            return (
              <li key={option.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  disabled={option.disabled}
                  className={[
                    'labeled-badge-select__option',
                    selected && 'labeled-badge-select__option--selected',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => {
                    if (option.disabled) return
                    onChange(option.id)
                    setOpen(false)
                  }}
                >
                  {option.label}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
