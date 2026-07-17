import { IconArrowNarrowRightDashed } from '@tabler/icons-react'
import type { MapIncomeFitDisplay } from '../../lib/whereToRetire/mapIncomeFit'
import { AppChip } from '../ui/AppChip'
import { Tooltip } from '../Tooltip'
import { wtrTaxChipColor } from '../../lib/whereToRetire/wtrChipColors'
import './WtrIncomeFitBadges.scss'

type Props = {
  fit: MapIncomeFitDisplay
  className?: string
  /** Map list cards: render tax or visa in separate slots on the card. */
  variant?: 'inline' | 'list'
  part?: 'tax' | 'visa'
}

function TaxChip({
  fit,
  className,
}: {
  fit: MapIncomeFitDisplay
  className?: string
}) {
  const chip = (
    <AppChip
      className={className}
      color={wtrTaxChipColor(fit.taxTone)}
      variant="soft"
    >
      {fit.taxLabel}
    </AppChip>
  )
  if (!fit.taxTooltip) return chip
  return (
    <Tooltip content={fit.taxTooltip} placement="top">
      {chip}
    </Tooltip>
  )
}

/** Tax + visa chips shared by map list cards and income-fit cards. */
export function WtrIncomeFitBadges({ fit, className, variant = 'inline', part }: Props) {
  if (variant === 'list') {
    if (part === 'tax') {
      return <TaxChip fit={fit} className={className} />
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
      <TaxChip fit={fit} />
      <AppChip
        variant="soft"
        color={fit.visaQualifies ? 'accent' : 'danger'}
      >
        {fit.visaLabel}
      </AppChip>
    </div>
  )
}
