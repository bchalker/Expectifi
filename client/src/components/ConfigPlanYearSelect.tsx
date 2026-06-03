import { useMemo } from 'react'
import { ListBox, Select } from '@heroui/react'
import { firstKeyFromSelectSelection } from '../lib/dateOfBirthSelect'
import './ConfigPlanYearSelect.scss'

type Props = {
  id: string
  label: string
  value: number
  from: number
  to: number
  onChange: (year: number) => void
  className?: string
}

export function ConfigPlanYearSelect({ id, label, value, from, to, onChange, className }: Props) {
  const labelId = `${id}-label`
  const years = useMemo(() => {
    const list: number[] = []
    for (let y = from; y <= to; y++) list.push(y)
    return list
  }, [from, to])

  const rootClass = ['config-plan-field', 'config-plan-year-select', className].filter(Boolean).join(' ')

  return (
    <div className={rootClass}>
      <label className="config-plan-label" id={labelId} htmlFor={id}>
        {label}
      </label>
      <Select
        className="config-plan-year-select__control"
        variant="secondary"
        aria-labelledby={labelId}
        selectedKey={String(value)}
        onSelectionChange={(keys) => {
          const key = firstKeyFromSelectSelection(keys)
          if (!key) return
          const year = Number(key)
          if (Number.isFinite(year)) onChange(year)
        }}
      >
        <Select.Trigger id={id}>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover className="app-select-import-menu__popover">
          <ListBox className="app-select-import-menu__list config-plan-year-select__list">
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
