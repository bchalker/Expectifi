import { IconArrowNarrowRightDashed } from '@tabler/icons-react'
import type { MapIncomeFitDisplay } from '../../lib/whereToRetire/mapIncomeFit'
import { AppChip } from '../ui/AppChip'
import { wtrTaxChipColor } from '../../lib/whereToRetire/wtrChipColors'
import './WtrIncomeFitBadges.scss'

type Props = {
  fit: MapIncomeFitDisplay
  className?: string
  /** Map list cards: render tax or visa in separate slots on the card. */
  variant?: 'inline' | 'list'
  part?: 'tax' | 'visa'
}

/** Tax + visa chips shared by map list cards and income-fit cards. */
export function WtrIncomeFitBadges({ fit, className, variant = 'inline', part }: Props) {
  if (variant === 'list') {
    if (part === 'tax') {
      return (
        <AppChip
          className={className}
          color={wtrTaxChipColor(fit.taxTone)}
          variant="soft"
        >
          {fit.taxLabel}
        </AppChip>
      )
    }

    if (part === 'visa') {
      return (
        <AppChip
          className={[
            'wtr-dest-card__visa-inline',
            'app-chip--visa',
            fit.visaQualifies && 'app-chip--visa-friendly',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          variant="secondary"
          color={fit.visaQualifies ? 'success' : 'default'}
        >
          <IconArrowNarrowRightDashed
            className="wtr-dest-card__visa-inline-icon"
            size={14}
            stroke={1.5}
            aria-hidden
          />
          {fit.visaLabel}
        </AppChip>
      )
    }

    return null
  }

  return (
    <div className={['wtr-fit-card__badges', className].filter(Boolean).join(' ')}>
      <AppChip color={wtrTaxChipColor(fit.taxTone)} variant="soft">
        {fit.taxLabel}
      </AppChip>
      <AppChip
        variant="soft"
        color={fit.visaQualifies ? 'accent' : 'danger'}
      >
        {fit.visaLabel}
      </AppChip>
    </div>
  )
}
