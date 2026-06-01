import { ListBox, Select } from '@heroui/react'
import { firstKeyFromSelectSelection } from '../lib/dateOfBirthSelect'
import {
  FILING_STATUS_OPTIONS,
  normalizeCalculatorFilingStatus,
  type FilingStatusId,
} from '../lib/filingStatus'
import './FilingStatusField.scss'

type Props = {
  value: FilingStatusId
  onChange: (value: FilingStatusId) => void
  id?: string
  className?: string
  variant?: 'default' | 'compact'
  showHint?: boolean
}

/** US federal filing status — saved via calculator inputs / profile. */
export function FilingStatusField({
  value,
  onChange,
  id = 'config-filing-status',
  className,
  variant = 'default',
  showHint,
}: Props) {
  const normalized = normalizeCalculatorFilingStatus(value)
  const labelId = `${id}-label`
  const rootClass = [
    'filing-status-field',
    variant === 'compact' && 'filing-status-field--compact',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  const selectClass = [
    'filing-status-field__select-control',
    variant === 'compact' && 'app-select--compact',
  ]
    .filter(Boolean)
    .join(' ')
  const hintVisible = showHint ?? variant === 'default'
  const showLabel = variant !== 'compact'

  return (
    <div className={rootClass}>
      {showLabel ? (
        <span id={labelId} className="filing-status-field__label config-plan-label">
          Filing status
        </span>
      ) : null}
      <Select
        className={selectClass}
        variant="secondary"
        aria-labelledby={showLabel ? labelId : undefined}
        aria-label={showLabel ? undefined : 'Filing status'}
        selectedKey={normalized}
        onSelectionChange={(keys) => {
          const next = firstKeyFromSelectSelection(keys)
          if (!next) return
          onChange(normalizeCalculatorFilingStatus(next))
        }}
      >
        <Select.Trigger id={id}>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover className="app-select-import-menu__popover">
          <ListBox className="app-select-import-menu__list filing-status-field__list">
            {FILING_STATUS_OPTIONS.map((opt) => (
              <ListBox.Item key={opt.id} id={opt.id} textValue={opt.label}>
                {opt.label}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
      {hintVisible ? (
        <p className="filing-status-field__hint">
          Used for federal tax estimates, Social Security taxation, and Roth conversion room on your
          dashboard.
        </p>
      ) : null}
    </div>
  )
}
