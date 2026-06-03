import { Button } from '@heroui/react'
import './ConfigPlanNumberStepper.scss'

type Props = {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  ariaLabel: string
}

export function ConfigPlanNumberStepper({ value, min, max, onChange, ariaLabel }: Props) {
  return (
    <div className="config-plan-stepper" role="group" aria-label={ariaLabel}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="config-plan-stepper__btn"
        isDisabled={value <= min}
        onPress={() => onChange(value - 1)}
        aria-label="Decrease"
      >
        −
      </Button>
      <span className="config-plan-stepper__value tabular-nums">{value}</span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="config-plan-stepper__btn"
        isDisabled={value >= max}
        onPress={() => onChange(value + 1)}
        aria-label="Increase"
      >
        +
      </Button>
    </div>
  )
}
