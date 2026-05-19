import { useEffect, useMemo, useRef, useState } from 'react'
import { IconArrowNarrowRightDashed } from '@tabler/icons-react'
import { ListBox, Select } from '@heroui/react'
import { ageFromIsoDateString, isValidIsoDateString } from '../lib/ageFromDob'
import {
  clampDobParts,
  dayOptionsForParts,
  DOB_MONTHS,
  DOB_YEAR_LIST_SCROLL_ANCHOR,
  defaultDobPartsForPicker,
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
  const rootClass = ['dob-age-today', 'dob-age-today--enter', className].filter(Boolean).join(' ')
  return (
    <div className={rootClass} aria-live="polite" aria-label={`Age ${age}`}>
      <span className="dob-age-today__icon-wrap" aria-hidden>
        <IconArrowNarrowRightDashed size={18} strokeWidth={1.5} className="dob-age-today__icon" />
      </span>
      <span className="dob-age-today__value">{age}</span>
    </div>
  )
}

type Props = {
  value: string
  onChange: (iso: string) => void
  className?: string
  /** When false, only month and year are shown; day defaults to the 1st. */
  includeDay?: boolean
}

export function DateOfBirthSelects({ value, onChange, className, includeDay = true }: Props) {
  const [parts, setParts] = useState<DobParts>(() => partsFromIsoValue(value))
  const defaultYearItemRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!value) {
      setParts(defaultDobPartsForPicker())
      return
    }
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
    let next = clampDobParts({ ...parts, ...patch })
    if (!includeDay && next.year && next.month) {
      next = { ...next, day: '01' }
    }
    setParts(next)
    const iso = dobPartsToIso(next)
    if (iso && isDobAgeInRange(iso)) {
      onChange(iso)
      return
    }
    if (value) onChange('')
  }

  const rowClass = ['dob-select-row', !includeDay && 'dob-select-row--no-day', className]
    .filter(Boolean)
    .join(' ')

  function scrollYearListToDefault() {
    if (parts.year) return
    requestAnimationFrame(() => {
      defaultYearItemRef.current?.scrollIntoView({ block: 'center' })
    })
  }

  return (
    <div className={rowClass}>
      <Select
        className={['dob-select-row__month', parts.month ? 'dob-select--filled' : ''].filter(Boolean).join(' ')}
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
      {includeDay ? (
        <Select
          className={['dob-select-row__day', parts.day ? 'dob-select--filled' : ''].filter(Boolean).join(' ')}
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
      ) : null}
      <Select
        className={['dob-select-row__year', parts.year ? 'dob-select--filled' : ''].filter(Boolean).join(' ')}
        variant="secondary"
        aria-label="Birth year"
        placeholder="Year"
        selectedKey={parts.year || null}
        onOpenChange={(isOpen) => {
          if (isOpen) scrollYearListToDefault()
        }}
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
              <ListBox.Item
                key={String(y)}
                id={String(y)}
                textValue={String(y)}
                ref={y === DOB_YEAR_LIST_SCROLL_ANCHOR ? defaultYearItemRef : undefined}
              >
                {y}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
  )
}
