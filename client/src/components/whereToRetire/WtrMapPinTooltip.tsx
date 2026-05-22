import { formatUsd } from '../../utils/costOfLiving'
import type { MapPinDisplay } from '../../lib/whereToRetire/mapPinDisplay'
import type { ScoredMapCity } from '../../lib/whereToRetire/cityMapScoring'
import './WtrMapPinTooltip.scss'

type Props = {
  scored: ScoredMapCity
  display: MapPinDisplay
}

export function WtrMapPinTooltip({ scored, display }: Props) {
  const { city, monthlyBudget } = scored

  return (
    <div className="wtr-pin-tooltip">
      <p className="wtr-pin-tooltip__name">{city.city}</p>
      <p className="wtr-pin-tooltip__country">{city.country}</p>
      <p className="wtr-pin-tooltip__budget">
        {formatUsd(monthlyBudget)}
        <span className="wtr-pin-tooltip__budget-suffix">/mo</span>
      </p>
      <span
        className="wtr-pin-tooltip__badge"
        style={{ background: display.pinColor }}
      >
        {display.displayScore > 0 ? (
          <span className="wtr-pin-tooltip__badge-score">{display.displayScore}</span>
        ) : null}
        <span className="wtr-pin-tooltip__badge-label">{display.bandLabel}</span>
      </span>
    </div>
  )
}
