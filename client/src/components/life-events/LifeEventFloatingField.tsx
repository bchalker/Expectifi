import { useEffect, useState } from 'react'
import { currencySymbol } from '../../lib/displayCurrency'
import { fmtInput, parseNum } from '../../utils/format'
import { AppSelect, type AppSelectOption } from '../ui/AppSelect'
import './LifeEventFloatingField.scss'

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

interface WidthSizerProps {
  label: string
  valueText: string
  prefix?: string
  suffix?: string
}

function LifeEventFloatingWidthSizer({
  label,
  valueText,
  prefix,
  suffix,
}: WidthSizerProps) {
  return (
    <span className="life-event-floating-field__width-sizer" aria-hidden>
      <span className="life-event-floating-field__width-sizer-label">{label}</span>
      <span className="life-event-floating-field__width-sizer-value">
        {prefix ? (
          <span className="life-event-floating-field__width-sizer-prefix">{prefix}</span>
        ) : null}
        <span>{valueText || '0'}</span>
        {suffix ? (
          <span className="life-event-floating-field__width-sizer-suffix">{suffix}</span>
        ) : null}
      </span>
    </span>
  )
}

interface BaseProps {
  id: string
  label: string
  className?: string
}

interface TextProps extends BaseProps {
  value: string
  placeholder?: string
  onChange: (value: string) => void
  inputMode?: 'text' | 'decimal' | 'numeric'
}

export function LifeEventFloatingTextField({
  id,
  label,
  value,
  placeholder,
  onChange,
  inputMode = 'text',
  className = '',
}: TextProps) {
  const [focused, setFocused] = useState(false)
  const hasValue = value.trim().length > 0
  const isActive = focused || hasValue
  const hintPlaceholder = focused && !hasValue && placeholder ? placeholder : ' '

  return (
    <div
      className={[
        'life-event-floating-field',
        isActive && 'life-event-floating-field--active',
        hasValue && 'life-event-floating-field--filled',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="life-event-floating-field__control">
        <input
          id={id}
          type="text"
          inputMode={inputMode}
          className="life-event-floating-field__input"
          value={value}
          placeholder={hintPlaceholder}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        <label className="life-event-floating-field__label" htmlFor={id}>
          {label}
        </label>
      </div>
    </div>
  )
}

interface TextareaProps extends BaseProps {
  value: string
  placeholder?: string
  onChange: (value: string) => void
  rows?: number
}

export function LifeEventFloatingTextareaField({
  id,
  label,
  value,
  placeholder,
  onChange,
  rows = 3,
  className = '',
}: TextareaProps) {
  const [focused, setFocused] = useState(false)
  const hasValue = value.trim().length > 0
  const isActive = focused || hasValue

  return (
    <div
      className={[
        'life-event-floating-field',
        isActive && 'life-event-floating-field--active',
        hasValue && 'life-event-floating-field--filled',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="life-event-floating-field__control life-event-floating-field__control--textarea">
        <textarea
          id={id}
          className="life-event-floating-field__textarea"
          value={value}
          rows={rows}
          placeholder={focused && !hasValue && placeholder ? placeholder : ' '}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        <label className="life-event-floating-field__label" htmlFor={id}>
          {label}
        </label>
      </div>
    </div>
  )
}

interface CurrencyProps extends BaseProps {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}

export function LifeEventFloatingCurrencyField({
  id,
  label,
  value,
  min,
  max,
  onChange,
  className = '',
}: CurrencyProps) {
  const [focused, setFocused] = useState(false)
  const [text, setText] = useState(() => fmtInput(value))
  const isActive = focused || value > 0

  useEffect(() => {
    if (!focused) setText(fmtInput(value))
  }, [value, focused])

  const commit = () => {
    const next = clampNumber(Math.round(parseNum(text)), min, max)
    onChange(next)
    setText(fmtInput(next))
  }

  return (
    <div
      className={[
        'life-event-floating-field',
        'life-event-floating-field--hug',
        isActive && 'life-event-floating-field--active',
        value > 0 && 'life-event-floating-field--filled',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="life-event-floating-field__control life-event-floating-field__control--affixed">
        <LifeEventFloatingWidthSizer
          label={label}
          valueText={focused ? text : fmtInput(value)}
          prefix={currencySymbol()}
        />
        <div className="life-event-floating-field__input-row">
          <span className="life-event-floating-field__prefix" aria-hidden>
            {currencySymbol()}
          </span>
          <input
            id={id}
            type="text"
            inputMode="decimal"
            className="life-event-floating-field__input"
            value={focused ? text : fmtInput(value)}
            placeholder=" "
            onChange={(e) => setText(e.target.value)}
            onFocus={() => {
              setFocused(true)
              setText(fmtInput(value))
            }}
            onBlur={() => {
              commit()
              setFocused(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commit()
                e.currentTarget.blur()
              }
            }}
          />
        </div>
        <label className="life-event-floating-field__label" htmlFor={id}>
          {label}
        </label>
      </div>
    </div>
  )
}

interface PercentProps extends BaseProps {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  decimals?: number
}

export function LifeEventFloatingPercentField({
  id,
  label,
  value,
  min,
  max,
  onChange,
  decimals = 2,
  className = '',
}: PercentProps) {
  const [focused, setFocused] = useState(false)
  const [text, setText] = useState(() => value.toFixed(decimals))
  const isActive = focused || value > 0

  useEffect(() => {
    if (!focused) setText(value.toFixed(decimals))
  }, [value, focused, decimals])

  const commit = () => {
    const next = clampNumber(Math.round(parseNum(text) * 100) / 100, min, max)
    onChange(next)
    setText(next.toFixed(decimals))
  }

  return (
    <div
      className={[
        'life-event-floating-field',
        'life-event-floating-field--hug',
        isActive && 'life-event-floating-field--active',
        value > 0 && 'life-event-floating-field--filled',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="life-event-floating-field__control life-event-floating-field__control--affixed">
        <LifeEventFloatingWidthSizer label={label} valueText={text} suffix="%" />
        <div className="life-event-floating-field__input-row">
          <input
            id={id}
            type="text"
            inputMode="decimal"
            className="life-event-floating-field__input"
            value={text}
            placeholder=" "
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              commit()
              setFocused(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commit()
                e.currentTarget.blur()
              }
            }}
          />
          <span className="life-event-floating-field__suffix" aria-hidden>
            %
          </span>
        </div>
        <label className="life-event-floating-field__label" htmlFor={id}>
          {label}
        </label>
      </div>
    </div>
  )
}

interface YearProps extends BaseProps {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}

export function LifeEventFloatingYearField({
  id,
  label,
  value,
  min,
  max,
  onChange,
  className = '',
}: YearProps) {
  const [focused, setFocused] = useState(false)
  const [text, setText] = useState(() => String(value))
  const isActive = focused || Number.isFinite(value)

  useEffect(() => {
    if (!focused) setText(String(value))
  }, [value, focused])

  const commit = () => {
    const parsed = parseInt(text.replace(/,/g, ''), 10)
    const next = clampNumber(Number.isFinite(parsed) ? parsed : value, min, max)
    onChange(next)
    setText(String(next))
  }

  return (
    <div
      className={[
        'life-event-floating-field',
        'life-event-floating-field--hug',
        isActive && 'life-event-floating-field--active',
        'life-event-floating-field--filled',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="life-event-floating-field__control">
        <LifeEventFloatingWidthSizer label={label} valueText={text} />
        <input
          id={id}
          type="text"
          inputMode="numeric"
          className="life-event-floating-field__input"
          value={text}
          placeholder=" "
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            commit()
            setFocused(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
              e.currentTarget.blur()
            }
          }}
        />
        <label className="life-event-floating-field__label" htmlFor={id}>
          {label}
        </label>
      </div>
    </div>
  )
}

interface SelectProps extends BaseProps {
  value: string
  options: AppSelectOption[]
  onChange: (id: string) => void
}

export function LifeEventFloatingSelectField({
  id,
  label,
  value,
  options,
  onChange,
  className = '',
}: SelectProps) {
  return (
    <div
      className={[
        'life-event-floating-field',
        'life-event-floating-field--active',
        'life-event-floating-field--filled',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="life-event-floating-field__control life-event-floating-field__control--select">
        <div className="life-event-floating-field__select-row">
          <AppSelect
            id={id}
            triggerId={id}
            ariaLabel={label}
            value={value}
            onChange={onChange}
            options={options}
            layout="auto"
            className="life-event-floating-field__select app-select--life-event-floating"
          />
        </div>
        <label className="life-event-floating-field__label" htmlFor={id}>
          {label}
        </label>
      </div>
    </div>
  )
}

export function LifeEventCurrencyInput({
  id,
  label,
  value,
  onChange,
  min = 0,
  max = 999_999_999,
  className = '',
}: CurrencyProps) {
  return (
    <LifeEventFloatingCurrencyField
      id={id}
      label={label}
      value={value}
      min={min}
      max={max}
      onChange={onChange}
      className={className}
    />
  )
}
