import { useCallback, useRef, useState } from 'react'
import { IconChevronDown } from '@tabler/icons-react'
import { useClickOutside } from '../hooks/useClickOutside'

type Props = {
  incomeMode: boolean
  onIncomeMode: (incomeMode: boolean) => void
}

export function IncomeModeDropdown({ incomeMode, onIncomeMode }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useClickOutside(rootRef, close, open)

  const label = incomeMode ? 'DIVIDEND' : 'WITHDRAW'

  return (
    <div ref={rootRef} className="yield-mode-dropdown">
      <button
        type="button"
        className="dd-trigger"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((prev) => !prev)}
      >
        {label}
        <IconChevronDown className="dd-trigger__chevron" size={14} stroke={1.5} aria-hidden />
      </button>
      {open ? (
        <ul className="yield-mode-dropdown__menu" role="listbox" aria-label="Income mode">
          <li>
            <button
              type="button"
              role="option"
              aria-selected={incomeMode}
              className="yield-mode-dropdown__option"
              onClick={() => {
                onIncomeMode(true)
                setOpen(false)
              }}
            >
              Dividend
            </button>
          </li>
          <li>
            <button
              type="button"
              role="option"
              aria-selected={!incomeMode}
              className="yield-mode-dropdown__option"
              onClick={() => {
                onIncomeMode(false)
                setOpen(false)
              }}
            >
              Withdraw
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  )
}
