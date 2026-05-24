import { ListBox, Select } from '@heroui/react'
import { firstKeyFromSelectSelection } from '../../lib/dateOfBirthSelect'
import './WtrToolbarSelect.scss'

export type WtrToolbarSelectOption<T extends string> = {
  id: T
  label: string
  disabled?: boolean
}

type Props<T extends string> = {
  ariaLabel: string
  value: T
  options: readonly WtrToolbarSelectOption<T>[]
  onChange: (id: T) => void
  className?: string
}

export function WtrToolbarSelect<T extends string>({
  ariaLabel,
  value,
  options,
  onChange,
  className,
}: Props<T>) {
  return (
    <Select
      className={['wtr-toolbar-select', className].filter(Boolean).join(' ')}
      variant="secondary"
      aria-label={ariaLabel}
      selectedKey={value}
      onSelectionChange={(keys) => {
        const id = firstKeyFromSelectSelection(keys)
        if (!id) return
        const opt = options.find((o) => o.id === id)
        if (opt?.disabled) return
        onChange(id as T)
      }}
    >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover
        placement="bottom start"
        className="wtr-toolbar-select__popover app-select-import-menu__popover"
      >
        <ListBox className="wtr-toolbar-select__list app-select-import-menu__list">
          {options.map((opt) => (
            <ListBox.Item
              key={opt.id}
              id={opt.id}
              textValue={opt.label}
              isDisabled={opt.disabled}
            >
              {opt.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  )
}
