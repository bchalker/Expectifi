import { useMemo } from 'react'
import { AppSelect } from './ui/AppSelect'
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

  const options = useMemo(
    () => years.map((y) => ({ id: String(y), label: String(y) })),
    [years],
  )

  const rootClass = ['config-plan-field', 'config-plan-year-select', className].filter(Boolean).join(' ')

  return (
    <div className={rootClass}>
      <label className="config-plan-label" id={labelId} htmlFor={id}>
        {label}
      </label>
      <AppSelect
        className="config-plan-year-select__control"
        triggerId={id}
        ariaLabelledBy={labelId}
        value={String(value)}
        options={options}
        onChange={(key) => {
          const year = Number(key)
          if (Number.isFinite(year)) onChange(year)
        }}
        popoverClassName="app-select-import-menu__popover"
        listClassName="app-select-import-menu__list config-plan-year-select__list"
      />
    </div>
  )
}
