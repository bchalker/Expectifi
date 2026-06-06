import { ListBox, Select } from '@heroui/react'
import { firstKeyFromSelectSelection } from '../lib/dateOfBirthSelect'
import './ConfigPlanSelect.scss'

export type ConfigPlanSelectOption = {
  id: string
  label: string
}

type Props = {
  id: string
  label: string
  value: string
  options: ConfigPlanSelectOption[]
  onChange: (id: string) => void
  className?: string
}

/** Labeled HeroUI select for config drawer fields. */
export function ConfigPlanSelect({ id, label, value, options, onChange, className }: Props) {
  const labelId = `${id}-label`
  const rootClass = ['config-plan-field', 'config-plan-select', className].filter(Boolean).join(' ')

  return (
    <div className={rootClass}>
      <span className="config-plan-label" id={labelId}>
        {label}
      </span>
      <Select
        className="config-plan-select__control"
        variant="secondary"
        aria-labelledby={labelId}
        selectedKey={value}
        onSelectionChange={(keys) => {
          const next = firstKeyFromSelectSelection(keys)
          if (!next) return
          onChange(next)
        }}
      >
        <Select.Trigger id={id}>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover className="app-select-import-menu__popover">
          <ListBox className="app-select-import-menu__list config-plan-select__list">
            {options.map((opt) => (
              <ListBox.Item key={opt.id} id={opt.id} textValue={opt.label}>
                {opt.label}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
  )
}
