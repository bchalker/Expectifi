import { useEffect, useMemo, useState } from 'react'
import { ListBox, Select } from '@heroui/react'
import { ageFromIsoDateString, isValidIsoDateString } from '../lib/ageFromDob'
import {
  clampDobParts,
  dayOptionsForParts,
  DOB_MONTHS,
  dobPartsToIso,
  firstKeyFromSelectSelection,
  isDobAgeInRange,
  partsFromIsoValue,
  validBirthYears,
  type DobParts,
} from '../lib/dateOfBirthSelect'
import './DateOfBirthSelects.scss'

type DobAgeTodayProps = {
  iso: string
  className?: string
}

/** Prominent current age after a complete date of birth is selected. */
export function DobAgeToday({ iso, className }: DobAgeTodayProps) {
  if (!iso || !isValidIsoDateString(iso)) return null
  const age = ageFromIsoDateString(iso)
  return (
    <p className={className ? `dob-age-today ${className}` : 'dob-age-today'} aria-live="polite">
      <span className="dob-age-today__label">Age today</span>
      <span className="dob-age-today__value">{age}</span>
    </p>
  )
}

type Props = {
  value: string
  onChange: (iso: string) => void
  className?: string
}

export function DateOfBirthSelects({ value, onChange, className }: Props) {
  const [parts, setParts] = useState<DobParts>(() => partsFromIsoValue(value))

  useEffect(() => {
    if (!value) return
    const fromParent = partsFromIsoValue(value)
    if (!fromParent.year) return
    setParts((prev) => {
      const prevIso = dobPartsToIso(prev)
      if (prevIso === value) return prev
      return fromParent
    })
  }, [value])

  const days = useMemo(() => dayOptionsForParts(parts), [parts.year, parts.month])
  const years = useMemo(
    () => validBirthYears({ month: parts.month, day: parts.day }),
    [parts.month, parts.day],
  )

  const applyParts = (patch: Partial<DobParts>) => {
    const next = clampDobParts({ ...parts, ...patch })
    setParts(next)
    const iso = dobPartsToIso(next)
    if (iso && isDobAgeInRange(iso)) {
      onChange(iso)
      return
    }
    if (value) onChange('')
  }

  return (
    <div className={className ? `dob-select-row ${className}` : 'dob-select-row'}>
      <Select
        className="dob-select-row__month"
        variant="secondary"
        aria-label="Birth month"
        placeholder="Month"
        selectedKey={parts.month || null}
        onSelectionChange={(keys) => {
          const id = firstKeyFromSelectSelection(keys)
          if (!id) return
          applyParts({ month: id })
        }}
      >
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover className="app-select-import-menu__popover">
          <ListBox className="app-select-import-menu__list">
            {DOB_MONTHS.map((mo) => (
              <ListBox.Item key={mo.id} id={mo.id} textValue={mo.label}>
                {mo.label}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
      <Select
        className="dob-select-row__day"
        variant="secondary"
        aria-label="Birth day"
        placeholder="Day"
        selectedKey={parts.day || null}
        onSelectionChange={(keys) => {
          const id = firstKeyFromSelectSelection(keys)
          if (!id) return
          applyParts({ day: id })
        }}
      >
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover className="app-select-import-menu__popover">
          <ListBox className="app-select-import-menu__list">
            {days.map((d) => (
              <ListBox.Item key={d} id={d} textValue={d}>
                {Number(d)}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
      <Select
        className="dob-select-row__year"
        variant="secondary"
        aria-label="Birth year"
        placeholder="Year"
        selectedKey={parts.year || null}
        onSelectionChange={(keys) => {
          const id = firstKeyFromSelectSelection(keys)
          if (!id) return
          applyParts({ year: id })
        }}
      >
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover className="app-select-import-menu__popover">
          <ListBox className="app-select-import-menu__list">
            {years.map((y) => (
              <ListBox.Item key={String(y)} id={String(y)} textValue={String(y)}>
                {y}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
  )
}
