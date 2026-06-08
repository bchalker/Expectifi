import { AppSelect, type AppSelectOption } from './ui/AppSelect'
import './ConfigPlanSelect.scss'

export type ConfigPlanSelectOption = AppSelectOption

type Props = {
  id: string
  label: string
  value: string
  options: ConfigPlanSelectOption[]
  onChange: (id: string) => void
  className?: string
}

/** Labeled select for config drawer fields. */
export function ConfigPlanSelect({ id, label, value, options, onChange, className }: Props) {
  const labelId = `${id}-label`
  const rootClass = ['config-plan-field', 'config-plan-select', className].filter(Boolean).join(' ')

  return (
    <div className={rootClass}>
      <span className="config-plan-label" id={labelId}>
        {label}
      </span>
      <AppSelect
        className="config-plan-select__control"
        triggerId={id}
        ariaLabelledBy={labelId}
        value={value}
        options={options}
        onChange={onChange}
        popoverClassName="app-select-import-menu__popover"
        listClassName="app-select-import-menu__list config-plan-select__list"
      />
    </div>
  )
}
