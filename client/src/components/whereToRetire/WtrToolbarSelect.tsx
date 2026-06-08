import { AppSelect } from '../ui/AppSelect'
import './WtrToolbarSelect.scss'

export type WtrToolbarSelectOption<T extends string> = {
  id: T
  label: string
  disabled?: boolean
}

type Props<T extends string> = {
  ariaLabel: string
  value: T
  options: WtrToolbarSelectOption<T>[]
  onChange: (id: T) => void
  className?: string
  /** `auto` = HeroUI on desktop, native OS picker on mobile. */
  layout?: 'auto' | 'native' | 'hero'
}

export function WtrToolbarSelect<T extends string>({
  ariaLabel,
  value,
  options,
  onChange,
  className,
  layout = 'auto',
}: Props<T>) {
  return (
    <AppSelect
      className={['wtr-toolbar-select', className].filter(Boolean).join(' ')}
      ariaLabel={ariaLabel}
      value={value}
      options={options}
      layout={layout}
      onChange={(id) => {
        const opt = options.find((o) => o.id === id)
        if (opt?.disabled) return
        onChange(id as T)
      }}
      popoverClassName="wtr-toolbar-select__popover app-select-import-menu__popover"
      listClassName="wtr-toolbar-select__list app-select-import-menu__list"
    />
  )
}
