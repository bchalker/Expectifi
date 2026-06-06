import { Input, Label, TextField } from '@heroui/react'
import './ConfigPlanTextField.scss'

type Props = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  inputMode?: 'text' | 'decimal'
  placeholder?: string
  className?: string
}

/** Labeled HeroUI text field for config drawer fields. */
export function ConfigPlanTextField({
  id,
  label,
  value,
  onChange,
  inputMode = 'text',
  placeholder,
  className,
}: Props) {
  const labelId = `${id}-label`
  const rootClass = ['config-plan-field', 'config-plan-text-field', className].filter(Boolean).join(' ')

  return (
    <div className={rootClass}>
      <Label className="config-plan-label" id={labelId} htmlFor={id}>
        {label}
      </Label>
      <TextField
        className="config-plan-text-field__control"
        variant="secondary"
        fullWidth
        aria-labelledby={labelId}
        value={value}
        onChange={onChange}
      >
        <Input id={id} type="text" inputMode={inputMode} placeholder={placeholder} />
      </TextField>
    </div>
  )
}
