import type { KeyboardEvent } from 'react'
import { IconEyeOff } from '@tabler/icons-react'
import { Tooltip } from '../Tooltip'
import './WtrExcludeCountryIcon.scss'

export const EXCLUDE_COUNTRY_TOOLTIP =
  'Exclude this country from all results.'

type Props = {
  country: string
  onExclude: () => void
  disabled?: boolean
  className?: string
}

export function WtrExcludeCountryIcon({
  country,
  onExclude,
  disabled = false,
  className,
}: Props) {
  const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (disabled) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onExclude()
    }
  }

  return (
    <Tooltip
      content={EXCLUDE_COUNTRY_TOOLTIP}
      placement="bottom"
      contentClassName="wtr-exclude-country-icon__tooltip"
    >
      <span
        role="button"
        tabIndex={disabled ? -1 : 0}
        className={[
          'wtr-exclude-country-icon',
          disabled && 'wtr-exclude-country-icon--disabled',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label={`${EXCLUDE_COUNTRY_TOOLTIP} (${country})`}
        aria-disabled={disabled}
        onClick={(e) => {
          e.stopPropagation()
          if (!disabled) onExclude()
        }}
        onKeyDown={handleKeyDown}
      >
        <IconEyeOff size={16} stroke={1.5} aria-hidden />
      </span>
    </Tooltip>
  )
}
