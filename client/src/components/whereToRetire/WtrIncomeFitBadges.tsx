import { IconArrowNarrowRightDashed } from '@tabler/icons-react'
import type { MapIncomeFitDisplay } from '../../lib/whereToRetire/mapIncomeFit'
import './RetirementFitCalculator.scss'

type Props = {
  fit: MapIncomeFitDisplay
  className?: string
  /** Map list cards: render tax or visa in separate slots on the card. */
  variant?: 'inline' | 'list'
  part?: 'tax' | 'visa'
}

/** Tax + visa pills shared by map list cards and income-fit cards. */
export function WtrIncomeFitBadges({ fit, className, variant = 'inline', part }: Props) {
  if (variant === 'list') {
    if (part === 'tax') {
      return (
        <span
          className={[
            'wtr-dest-card__tax-pill',
            `wtr-dest-card__tax-pill--${fit.taxTone}`,
            className,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {fit.taxLabel}
        </span>
      )
    }

    if (part === 'visa') {
      return (
        <span
          className={[
            'wtr-dest-card__visa-inline',
            fit.visaQualifies && 'wtr-dest-card__visa-inline--friendly',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <IconArrowNarrowRightDashed
            className="wtr-dest-card__visa-inline-icon"
            size={14}
            stroke={1.5}
            aria-hidden
          />
          {fit.visaLabel}
        </span>
      )
    }

    return null
  }

  return (
    <div className={['wtr-fit-card__badges', className].filter(Boolean).join(' ')}>
      <span className={`wtr-fit-card__badge wtr-fit-card__badge--tax-${fit.taxTone}`}>
        {fit.taxLabel}
      </span>
      <span
        className={[
          'wtr-fit-card__badge',
          'wtr-fit-card__badge--visa',
          !fit.visaQualifies && 'wtr-fit-card__badge--visa-fail',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {fit.visaLabel}
      </span>
    </div>
  )
}
