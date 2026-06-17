import type { MouseEvent } from 'react'
import { IconAlertTriangle, IconMapExclamation } from '@tabler/icons-react'
import {
  formatTravelAdvisorySummary,
  getDoNotTravelAdvisory,
  getReconsiderTravelAdvisory,
} from '../../lib/travelAdvisories'
import { requestHideLevel3CautionedCities } from '../../lib/whereToRetire/wtrHideLevel3Cautions'
import { Tooltip } from '../Tooltip'
import './WtrTravelAdvisoryCautionChip.scss'

type Props = {
  country: string
  className?: string
  /** List cards use the shorter label; detail header can use the longer one. */
  variant?: 'caution' | 'do-not-travel' | 'icon' | 'inline'
}

export function WtrTravelAdvisoryCautionChip({
  country,
  className,
  variant = 'caution',
}: Props) {
  const entry =
    variant === 'do-not-travel'
      ? getDoNotTravelAdvisory(country)
      : getReconsiderTravelAdvisory(country)

  if (!entry) return null

  const label =
    entry.level === 4
      ? 'Do not travel'
      : 'Increased caution'

  const handleHideLevel3 = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    requestHideLevel3CautionedCities()
  }

  const tooltipContent = (
    <>
      <span className="wtr-travel-caution-chip__tooltip-title">{entry.title}</span>
      <span className="wtr-travel-caution-chip__tooltip-meta">
        {formatTravelAdvisorySummary(entry)} Source: US State Department.
      </span>
      {entry.level === 3 ? (
        <button
          type="button"
          className="wtr-travel-caution-chip__tooltip-action"
          onClick={handleHideLevel3}
        >
          Hide all Level 3 cities
        </button>
      ) : null}
    </>
  )

  if (variant === 'icon') {
    return (
      <Tooltip
        content={tooltipContent}
        placement="top"
        showArrow
        contentClassName="wtr-travel-caution-chip__tooltip"
        triggerClassName={['wtr-travel-caution-chip__trigger', className]
          .filter(Boolean)
          .join(' ')}
      >
        <span
          className={[
            'wtr-travel-caution-chip',
            'wtr-travel-caution-chip--icon',
            entry.level === 4
              ? 'wtr-travel-caution-chip--severe'
              : 'wtr-travel-caution-chip--caution',
          ].join(' ')}
          aria-label={label}
        >
          <IconMapExclamation size={14} stroke={1.5} aria-hidden />
        </span>
      </Tooltip>
    )
  }

  if (variant === 'inline') {
    return (
      <Tooltip
        content={tooltipContent}
        placement="top"
        showArrow
        contentClassName="wtr-travel-caution-chip__tooltip"
        triggerClassName={['wtr-travel-caution-chip__trigger', className]
          .filter(Boolean)
          .join(' ')}
      >
        <span
          className={[
            'wtr-travel-caution-chip',
            'wtr-travel-caution-chip--inline',
            entry.level === 4 && 'wtr-travel-caution-chip--inline-severe',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          Travel advisory
        </span>
      </Tooltip>
    )
  }

  return (
    <Tooltip
      content={tooltipContent}
      placement="top"
      showArrow
      contentClassName="wtr-travel-caution-chip__tooltip"
      triggerClassName={['wtr-travel-caution-chip__trigger', className].filter(Boolean).join(' ')}
    >
      <span
        className={[
          'wtr-travel-caution-chip',
          entry.level === 4
            ? 'wtr-travel-caution-chip--severe'
            : 'wtr-travel-caution-chip--caution',
        ].join(' ')}
      >
        <IconAlertTriangle size={14} stroke={1.5} aria-hidden />
        {label}
      </span>
    </Tooltip>
  )
}
