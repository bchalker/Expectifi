import {
  FILING_STATUS_OPTIONS,
  filingStatusDisplayLabel,
  normalizeCalculatorFilingStatus,
  type FilingStatusId,
} from '../lib/filingStatus'
import './FilingStatusField.scss'

type Props = {
  value: FilingStatusId
  onChange: (value: FilingStatusId) => void
  id?: string
  className?: string
}

/** US federal filing status — saved via calculator inputs / profile. */
export function FilingStatusField({ value, onChange, id = 'config-filing-status', className }: Props) {
  const normalized = normalizeCalculatorFilingStatus(value)
  const rootClass = ['filing-status-field', className].filter(Boolean).join(' ')

  return (
    <div className={rootClass}>
      <label className="filing-status-field__label config-plan-label" htmlFor={id}>
        Filing status
      </label>
      <select
        id={id}
        className="filing-status-field__select"
        value={normalized}
        onChange={(e) => onChange(normalizeCalculatorFilingStatus(e.target.value))}
        aria-label={`Filing status, currently ${filingStatusDisplayLabel(normalized)}`}
      >
        {FILING_STATUS_OPTIONS.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
      <p className="filing-status-field__hint">
        Used for federal tax estimates, Social Security taxation, and Roth conversion room on your
        dashboard.
      </p>
    </div>
  )
}
