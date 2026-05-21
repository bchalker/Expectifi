import {
  IconArrowNarrowRightDashed,
  IconCheck,
  IconCircleDashedPlus,
  IconCirclePlusFilled,
} from '@tabler/icons-react'
import { Tooltip } from '../Tooltip'
import './WtrCompareToggleButton.scss'

type Props = {
  selected: boolean
  atMax: boolean
  cityName?: string
  onToggle: () => void
  className?: string
}

export function WtrCompareToggleButton({
  selected,
  atMax,
  cityName = 'city',
  onToggle,
  className,
}: Props) {
  const disabled = atMax && !selected
  const isPanel = className?.includes('wtr-compare-corner--panel') ?? false
  const label = selected
    ? `Remove ${cityName} from comparison`
    : `Add ${cityName} to comparison`

  const corner = (
    <div
      className={[
        'wtr-compare-corner',
        selected && 'wtr-compare-corner--selected',
        disabled && 'wtr-compare-corner--disabled',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="wtr-compare-corner__wedge" aria-hidden />
      <button
        type="button"
        className="wtr-compare-toggle"
        disabled={disabled}
        aria-pressed={selected}
        aria-label={disabled ? 'Compare city (maximum 5 cities)' : label}
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
      >
        <span className="wtr-compare-toggle__label-group">
          <span className="wtr-compare-toggle__label">Compare</span>
          <span className="wtr-compare-toggle__arrow" aria-hidden>
            <IconArrowNarrowRightDashed size={14} stroke={1.5} />
          </span>
        </span>
        {selected ? (
          isPanel ? (
            <IconCheck size={18} stroke={2} aria-hidden />
          ) : (
            <IconCirclePlusFilled size={18} aria-hidden />
          )
        ) : (
          <IconCircleDashedPlus size={18} stroke={1} aria-hidden />
        )}
      </button>
    </div>
  )

  if (disabled) {
    return (
      <Tooltip content="Remove a city to add another (max 5)" placement="bottom">
        <span className="wtr-compare-corner__wrap">{corner}</span>
      </Tooltip>
    )
  }

  return corner
}
