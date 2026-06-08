import { useState, type ReactNode } from 'react'
import { Input, TextField } from '@heroui/react'
import { IconChevronDown } from '@tabler/icons-react'
import { currencySymbol } from '../../lib/displayCurrency'
import { fmtInput, parseNum } from '../../utils/format'
import '../WelcomeContributionsStepFields.scss'

type BoundedInputProps = {
  id: string
  value: number
  onChange: (value: number) => void
  onMax?: () => void
  showMax?: boolean
  ariaLabel?: string
}

export function ContributionBoundedInput({
  id,
  value,
  onChange,
  onMax,
  showMax = true,
  ariaLabel,
}: BoundedInputProps) {
  const [focused, setFocused] = useState(false)
  const display = focused ? fmtInput(value) : value > 0 ? fmtInput(value) : ''

  return (
    <div className="contrib-bounded-input">
      <span className="contrib-bounded-input__prefix" aria-hidden>
        {currencySymbol()}
      </span>
      <div className="contrib-bounded-input__field-wrap">
        <TextField
          className="contrib-bounded-input__text-field"
          variant="secondary"
          aria-label={ariaLabel}
          value={display}
          onChange={(v) => onChange(Math.max(0, Math.round(parseNum(v.replace(/[^\d,]/g, '')))))}
        >
          <Input
            id={id}
            type="text"
            inputMode="decimal"
            placeholder="0"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        </TextField>
        {showMax && onMax ? (
          <button type="button" className="contrib-bounded-input__max" onClick={onMax}>
            Max
          </button>
        ) : null}
      </div>
    </div>
  )
}

type PercentInputProps = {
  id: string
  value: number
  onChange: (value: number) => void
  ariaLabel?: string
}

export function ContributionPercentInput({
  id,
  value,
  onChange,
  ariaLabel,
}: PercentInputProps) {
  const [focused, setFocused] = useState(false)
  const display = focused ? String(value || '') : value > 0 ? String(value) : ''

  return (
    <div className="contrib-bounded-input contrib-bounded-input--percent">
      <div className="contrib-bounded-input__field-wrap">
        <TextField
          className="contrib-bounded-input__text-field"
          variant="secondary"
          aria-label={ariaLabel}
          value={display}
          onChange={(v) => {
            const raw = v.replace(/[^\d.]/g, '')
            const n = raw ? Number.parseFloat(raw) : 0
            onChange(Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0)
          }}
        >
          <Input
            id={id}
            type="text"
            inputMode="decimal"
            placeholder="0"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        </TextField>
        <span className="contrib-bounded-input__suffix" aria-hidden>
          %
        </span>
      </div>
    </div>
  )
}

type AccordionProps = {
  id: string
  title: string
  subLabel: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}

export function ContributionsAccordion({
  id,
  title,
  subLabel,
  open,
  onToggle,
  children,
}: AccordionProps) {
  const panelId = `${id}-panel`

  return (
    <div
      className={[
        'contrib-accordion',
        open && 'contrib-accordion--open',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        type="button"
        className="contrib-accordion__trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span className="contrib-accordion__trigger-main">
          <span className="contrib-accordion__title">{title}</span>
          <span className="contrib-accordion__sub">{subLabel}</span>
        </span>
        <IconChevronDown className="contrib-accordion__chevron" size={16} stroke={1.5} aria-hidden />
      </button>
      <div id={panelId} className="contrib-accordion__panel" hidden={!open}>
        <div className="contrib-accordion__panel-inner">{children}</div>
      </div>
    </div>
  )
}

type SplitPairProps = {
  idPrefix: string
  roth: number
  traditional: number
  limitMonthly: number
  onRothChange: (v: number) => void
  onTraditionalChange: (v: number) => void
}

export function ContributionSplitPair({
  idPrefix,
  roth,
  traditional,
  limitMonthly,
  onRothChange,
  onTraditionalChange,
}: SplitPairProps) {
  const over = roth + traditional > limitMonthly

  return (
    <div className="contrib-split-pair">
      <div className="contrib-split-pair__row">
        <div className="contrib-split-pair__field">
          <span className="contrib-split-pair__label">Roth</span>
          <ContributionBoundedInput
            id={`${idPrefix}-roth`}
            value={roth}
            onChange={onRothChange}
            onMax={() =>
              onRothChange(Math.max(0, limitMonthly - Math.round(traditional)))
            }
          />
        </div>
        <div className="contrib-split-pair__field">
          <span className="contrib-split-pair__label">Traditional</span>
          <ContributionBoundedInput
            id={`${idPrefix}-traditional`}
            value={traditional}
            onChange={onTraditionalChange}
            onMax={() =>
              onTraditionalChange(Math.max(0, limitMonthly - Math.round(roth)))
            }
          />
        </div>
      </div>
      {over ? (
        <p className="contrib-over-limit" role="alert">
          Over the ${fmtInput(limitMonthly)}/mo combined limit.
        </p>
      ) : null}
    </div>
  )
}
