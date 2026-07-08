import { useId, type ReactNode, type Ref } from 'react'
import { ListBox, Select } from '@heroui/react'
import { firstKeyFromSelectSelection } from '../../lib/dateOfBirthSelect'
import { useNativeSelectLayout } from '../../hooks/useNativeSelectLayout'
import { AppSelectMenuScroll } from './AppSelectMenuScroll'
import './AppSelect.scss'

export type AppSelectOption = {
  id: string
  label: string
  disabled?: boolean
}

export type AppSelectPopoverPlacement =
  | 'bottom'
  | 'bottom start'
  | 'bottom end'
  | 'top'
  | 'top start'
  | 'top end'

export type AppSelectProps = {
  value: string | null
  onChange: (id: string) => void
  options: AppSelectOption[]
  className?: string
  placeholder?: string
  id?: string
  triggerId?: string
  ariaLabel?: string
  ariaLabelledBy?: string
  disabled?: boolean
  popoverClassName?: string
  listClassName?: string
  popoverPlacement?: AppSelectPopoverPlacement
  onOpenChange?: (open: boolean) => void
  label?: ReactNode
  labelClassName?: string
  getItemRef?: (optionId: string) => Ref<HTMLDivElement> | undefined
  /** `hero` always uses HeroUI; `native` always uses OS picker; `auto` follows viewport. */
  layout?: 'auto' | 'native' | 'hero'
}

/** HeroUI select on desktop; native `<select>` on mobile for OS picker UX. */
export function AppSelect({
  value,
  onChange,
  options,
  className,
  placeholder,
  id,
  triggerId,
  ariaLabel,
  ariaLabelledBy,
  disabled = false,
  popoverClassName,
  listClassName,
  popoverPlacement,
  onOpenChange,
  label,
  labelClassName,
  getItemRef,
  layout = 'auto',
}: AppSelectProps) {
  const autoNativeLayout = useNativeSelectLayout()
  const nativeLayout =
    layout === 'native' ? true : layout === 'hero' ? false : autoNativeLayout
  const autoId = useId()
  const controlId = triggerId ?? id ?? autoId
  const rootClass = [
    'app-select',
    !value && placeholder ? 'app-select--placeholder' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (nativeLayout) {
    return (
      <div className={rootClass} data-slot="select">
        {label ? (
          <span className={labelClassName ?? 'app-select__label'}>{label}</span>
        ) : null}
        <select
          id={controlId}
          className="app-select__native"
          value={value ?? ''}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          disabled={disabled}
          onChange={(event) => {
            const next = event.target.value
            if (!next) return
            onChange(next)
          }}
        >
          {placeholder ? (
            <option value="" disabled hidden={Boolean(value)}>
              {placeholder}
            </option>
          ) : null}
          {options.map((opt) => (
            <option key={opt.id} value={opt.id} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div className={rootClass} data-slot="select">
      {label ? (
        <span className={labelClassName ?? 'app-select__label'}>{label}</span>
      ) : null}
      <Select
        className="app-select__hero-control"
        variant="secondary"
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        selectedKey={value || null}
        isDisabled={disabled}
        onOpenChange={onOpenChange}
        onSelectionChange={(keys) => {
          const next = firstKeyFromSelectSelection(keys)
          if (!next) return
          onChange(next)
        }}
      >
        <Select.Trigger id={controlId}>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover
          placement={popoverPlacement}
          className={popoverClassName}
        >
          <AppSelectMenuScroll>
            <ListBox className={listClassName}>
              {options.map((opt) => (
                <ListBox.Item
                  key={opt.id}
                  id={opt.id}
                  textValue={opt.label}
                  isDisabled={opt.disabled}
                  ref={getItemRef?.(opt.id)}
                >
                  {opt.label}
                </ListBox.Item>
              ))}
            </ListBox>
          </AppSelectMenuScroll>
        </Select.Popover>
      </Select>
    </div>
  )
}
