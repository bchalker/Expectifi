import {
  BUDGET_PIN_LEGEND,
  EXPAT_PIN_LEGEND,
  SCORE_PIN_LEGEND,
  type MapPinColorView,
} from '../../lib/whereToRetire/mapPinDisplay'
import './WtrMapPinLegend.scss'

type Props = {
  view: MapPinColorView
  /** `bar` — inline row beside description; `overlay` — floating card on map (legacy). */
  variant?: 'bar' | 'overlay'
  className?: string
}

export function WtrMapPinLegend({ view, variant = 'overlay', className }: Props) {
  const items =
    view === 'score'
      ? SCORE_PIN_LEGEND
      : view === 'budget'
        ? BUDGET_PIN_LEGEND
        : EXPAT_PIN_LEGEND

  const ariaLabel =
    view === 'score'
      ? 'Retirement score legend'
      : view === 'budget'
        ? 'Budget fit legend'
        : 'Expat community legend'

  return (
    <div
      className={[
        'wtr-map-pin-legend',
        variant === 'bar' && 'wtr-map-pin-legend--bar',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="list"
      aria-label={ariaLabel}
    >
      {items.map((item) => (
        <span key={item.bandClass} className="wtr-map-pin-legend__item" role="listitem">
          <span
            className="wtr-map-pin-legend__dot"
            style={{ background: item.color }}
            aria-hidden
          />
          <span className="wtr-map-pin-legend__label">{item.label}</span>
        </span>
      ))}
    </div>
  )
}
