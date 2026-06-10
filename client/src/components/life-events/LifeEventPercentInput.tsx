import { LifeEventFloatingPercentField } from './LifeEventFloatingField'

type Props = {
  id: string
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  className?: string
}

export function LifeEventPercentInput(props: Props) {
  return <LifeEventFloatingPercentField {...props} />
}

export type { Props as LifeEventPercentInputProps }
