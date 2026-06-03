import { Button, ButtonGroup } from '@heroui/react'
import './ConfigPlanButtonGroup.scss'

export type ConfigPlanButtonGroupOption<T extends string> = {
  value: T
  label: string
}

type Props<T extends string> = {
  options: readonly ConfigPlanButtonGroupOption<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
}

/** HeroUI segmented control for Your Plans / Life tab choices. */
export function ConfigPlanButtonGroup<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: Props<T>) {
  const rootClass = ['config-plan-button-group', className].filter(Boolean).join(' ')

  return (
    <ButtonGroup size="sm" className={rootClass} role="group" aria-label={ariaLabel}>
      {options.map((opt) => (
        <Button
          key={opt.value}
          variant="outline"
          className={value === opt.value ? 'config-plan-button-group__btn--active' : undefined}
          onPress={() => onChange(opt.value)}
        >
          {opt.label}
        </Button>
      ))}
    </ButtonGroup>
  )
}
