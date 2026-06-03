import { Checkbox, Label } from '@heroui/react'
import { IconCheck } from '@tabler/icons-react'
import './ConfigPlanCheckbox.scss'

type Props = {
  id: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  className?: string
}

export function ConfigPlanCheckbox({ id, label, checked, onChange, className }: Props) {
  const rootClass = ['config-plan-checkbox', 'app-checkbox', className].filter(Boolean).join(' ')

  return (
    <Checkbox
      id={id}
      className={rootClass}
      isSelected={checked}
      onChange={onChange}
      variant="secondary"
    >
      <Checkbox.Control>
        <Checkbox.Indicator>
          <IconCheck size={12} stroke={2.5} aria-hidden />
        </Checkbox.Indicator>
      </Checkbox.Control>
      <Checkbox.Content>
        <Label className="config-plan-checkbox__label" htmlFor={id}>
          {label}
        </Label>
      </Checkbox.Content>
    </Checkbox>
  )
}
