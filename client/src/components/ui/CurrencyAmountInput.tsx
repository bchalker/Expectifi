import { useState } from 'react'
import { IconCheck } from '@tabler/icons-react'
import { fmt, fmtInput, parseNum } from '../../utils/format'
import './CurrencyAmountInput.scss'
import '../OnboardingFieldShell.scss'

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
  /** When true, show value as read-only text instead of an input. */
  readOnly?: boolean
  /** When true, render the $ prefix outside the input box (sibling to the left). */
  externalPrefix?: boolean
  /** Optional suffix outside the input box (e.g. "/mo"). */
  externalSuffix?: string
  /** Example-scale copy shown when value is 0 (field stays empty until the user types). */
  placeholder?: string
  /** Welcome/onboarding: grey when empty, white + checkmark when value > 0. */
  showFillState?: boolean
  /** Inline validation message shown beneath the input row. */
  error?: string
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
  readOnly = false,
  externalPrefix = false,
  externalSuffix,
  placeholder,
  showFillState = false,
  error,
}: Props) {
  const [focused, setFocused] = useState(false)
  const showPlaceholder = placeholder != null && value === 0
  const filled = showFillState && value > 0
  const display = showPlaceholder
    ? ''
    : focused
      ? fmtInput(value)
      : fmt(value).replace(/^\$/, '')

  if (readOnly) {
    const readonlyValue = fmt(value).replace(/^\$/, '')
    const readonlyBody = showFillState ? (
      <div
        className={[
          'onboarding-field-shell',
          'onboarding-field-shell--readonly',
          filled ? 'onboarding-field-shell--filled' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <p className="onboarding-field-shell__readonly-value" aria-labelledby={id}>
          {externalPrefix ? readonlyValue : fmt(value)}
        </p>
        {filled ? (
          <span className="onboarding-field-shell__check" aria-hidden>
            <IconCheck size={14} strokeWidth={2} />
          </span>
        ) : null}
      </div>
    ) : (
      <p className="currency-amount-input__readonly-value" aria-labelledby={id}>
        {externalPrefix ? readonlyValue : fmt(value)}
      </p>
    )

    return (
      <div className={['currency-amount-input', 'currency-amount-input--readonly', className].filter(Boolean).join(' ')}>
        <span className="currency-amount-input__label" id={id}>
          {label}
        </span>
        {externalPrefix || externalSuffix ? (
          <div className="currency-amount-input__value-group">
            <div className="currency-amount-input__amount-row currency-amount-input__amount-row--external-affixes">
              <span className="currency-amount-input__prefix-outside">$</span>
              {readonlyBody}
              {externalSuffix ? (
                <span className="currency-amount-input__suffix-outside">{externalSuffix}</span>
              ) : null}
            </div>
          </div>
        ) : (
          readonlyBody
        )}
        {hint ? <p className="currency-amount-input__hint">{hint}</p> : null}
      </div>
    )
  }

  const annualHint = showAnnualEquivalent ? (
    <p
      className={[
        'currency-amount-input__annual-hint',
        value > 0 ? 'currency-amount-input__annual-hint--visible' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden={value <= 0}
    >
      {fmt(Math.round(value) * 12)}
      /year
    </p>
  ) : valueIsAnnual ? (
    <p
      className={[
        'currency-amount-input__annual-hint',
        value > 0 ? 'currency-amount-input__annual-hint--visible' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden={value <= 0}
    >
      {fmt(Math.round(value))}/year
    </p>
  ) : null

  const amountRow = (
    <div
      className={[
        'currency-amount-input__amount-row',
        externalPrefix || externalSuffix
          ? 'currency-amount-input__amount-row--external-affixes'
          : '',
        externalPrefix ? 'currency-amount-input__amount-row--external-prefix' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {externalPrefix ? <span className="currency-amount-input__prefix-outside">$</span> : null}
      <div
        className={[
          showFillState ? 'onboarding-field-shell' : 'num-input-wrap',
          'currency-amount-input__wrap',
          showFillState && filled ? 'onboarding-field-shell--filled' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {!externalPrefix ? <span className="num-input-prefix">$</span> : null}
        <input
          id={id}
          type="text"
          inputMode="decimal"
          className={
            showFillState
              ? 'onboarding-field-shell__input currency-amount-input__field'
              : 'num-input currency-amount-input__field'
          }
          value={display}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false)
            onChange(Math.round(parseNum(display)))
          }}
          onChange={(e) => onChange(Math.round(parseNum(e.target.value)))}
        />
        {showFillState && filled ? (
          <span className="onboarding-field-shell__check" aria-hidden>
            <IconCheck size={14} strokeWidth={2} />
          </span>
        ) : null}
      </div>
      {externalSuffix ? (
        <span className="currency-amount-input__suffix-outside">{externalSuffix}</span>
      ) : null}
    </div>
  )

  return (
    <div className={['currency-amount-input', className].filter(Boolean).join(' ')}>
      <label className="currency-amount-input__label" htmlFor={id}>
        {label}
      </label>
      {externalPrefix || externalSuffix ? (
        <div className="currency-amount-input__value-group">
          {amountRow}
          {annualHint}
        </div>
      ) : (
        <>
          {amountRow}
          {annualHint}
        </>
      )}
      {error ? <p className="currency-amount-input__error" role="alert">{error}</p> : null}
      {hint ? <p className="currency-amount-input__hint">{hint}</p> : null}
    </div>
  )
}
