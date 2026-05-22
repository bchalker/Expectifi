import { IconShieldCheckFilled } from '@tabler/icons-react'
import type { MapIncomeFitDisplay } from '../../lib/whereToRetire/mapIncomeFit'
import './RetirementFitCalculator.scss'

type Props = {
  fit: MapIncomeFitDisplay
  className?: string
  /** Map list cards: tax left, visa right below score bar. */
  variant?: 'inline' | 'list'
}

/** Tax + visa pills shared by map list cards and income-fit cards. */
export function WtrIncomeFitBadges({ fit, className, variant = 'inline' }: Props) {
  if (variant === 'list') {
    return (
      <div className={['wtr-dest-card__meta', className].filter(Boolean).join(' ')}>
        <span
          className={[
            'wtr-dest-card__meta-pill',
            'wtr-dest-card__meta-pill--tax',
            `wtr-dest-card__meta-pill--tax-${fit.taxTone}`,
          ].join(' ')}
        >
          {fit.taxLabel}
        </span>
        <span
          className={[
            'wtr-dest-card__meta-pill',
            'wtr-dest-card__meta-pill--visa',
            fit.visaQualifies && 'wtr-dest-card__meta-pill--visa-friendly',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {fit.visaQualifies ? (
            <IconShieldCheckFilled className="wtr-dest-card__meta-visa-icon" size={14} aria-hidden />
          ) : null}
          {fit.visaLabel}
        </span>
      </div>
    )
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
