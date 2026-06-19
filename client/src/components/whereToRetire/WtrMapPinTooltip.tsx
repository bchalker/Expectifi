import type { MapFilters, ScoredMapCity } from '../../lib/whereToRetire/cityMapScoring'
import type { MapPinColorView } from '../../lib/whereToRetire/mapPinDisplay'
import { RetirementDestinationCard } from './RetirementDestinationCard'
import './WtrMapPinTooltip.scss'

type Props = {
  scored: ScoredMapCity
  monthlyIncome: number
  pinColorView: MapPinColorView
  filters: Pick<MapFilters, 'lifestyle'>
  isFavoritePin?: boolean
}

export function WtrMapPinTooltip({
  scored,
  monthlyIncome,
  pinColorView,
  filters,
  isFavoritePin = false,
}: Props) {
  return (
    <div className="wtr-pin-tooltip">
      <RetirementDestinationCard
        variant="tooltip"
        scored={scored}
        monthlyIncome={monthlyIncome}
        pinColorView={pinColorView}
        mapFilters={filters}
        isFavoritePin={isFavoritePin}
      />
      <span className="wtr-pin-tooltip__arrow" aria-hidden />
    </div>
  )
}
