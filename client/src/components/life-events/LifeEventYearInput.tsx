import { LifeEventFloatingYearField } from './LifeEventFloatingField'

type Props = {
  id: string
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  className?: string
}

export function LifeEventYearInput(props: Props) {
  return <LifeEventFloatingYearField {...props} />
}

export type { Props as LifeEventYearInputProps }
