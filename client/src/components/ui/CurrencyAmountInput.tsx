import { useState } from 'react'
import { fmt, fmtInput, parseNum } from '../../utils/format'
import './CurrencyAmountInput.scss'

type Props = {
  id: string
  label: string
  value: number
  onChange: (amount: number) => void
  /** When true, show annual equivalent beneath the field. */
  showAnnualEquivalent?: boolean
  /** When true, value is already annual — hint shows $X/year without multiplying. */
  valueIsAnnual?: boolean
  /** Warm helper copy beneath the field. */
  hint?: string
  className?: string
  disabled?: boolean
}

export function CurrencyAmountInput({
  id,
  label,
  value,
  onChange,
  showAnnualEquivalent = false,
  valueIsAnnual = false,
  hint,
  className,
  disabled = false,
}: Props) {
  const [focused, setFocused] = useState(false)
  const display = focused ? fmtInput(value) : fmt(value).replace(/^\$/, '')

  return (
    <div className={['currency-amount-input', className].filter(Boolean).join(' ')}>
      <label className="currency-amount-input__label" htmlFor={id}>
        {label}
      </label>
      <div className="num-input-wrap currency-amount-input__wrap">
        <span className="num-input-prefix">$</span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          className="num-input currency-amount-input__field"
          value={display}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false)
            onChange(Math.round(parseNum(display)))
          }}
          onChange={(e) => onChange(Math.round(parseNum(e.target.value)))}
        />
      </div>
      {showAnnualEquivalent ? (
        <p className="currency-amount-input__annual-hint">
          {fmt(Math.round(value) * 12)}
          /year
        </p>
      ) : null}
      {valueIsAnnual ? (
        <p className="currency-amount-input__annual-hint">{fmt(Math.round(value))}/year</p>
      ) : null}
      {hint ? <p className="currency-amount-input__hint">{hint}</p> : null}
    </div>
  )
}
