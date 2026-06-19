import {
  EXPAT_PIN_LEGEND,
  BUDGET_PIN_LEGEND,
  SCORE_PIN_LEGEND,
  type MapPinColorView,
} from '../../lib/whereToRetire/mapPinDisplay'
import './WtrMapPinLegend.scss'

type Props = {
  view: MapPinColorView
  /** `bar` — inline row beside description; `overlay` — floating card on map (legacy). */
  variant?: 'bar' | 'overlay'
  className?: string
  activeBands?: readonly string[]
  onToggleBand?: (bandClass: string) => void
}

function legendToggleLabel(view: MapPinColorView, label: string, isActive: boolean): string {
  const action = isActive ? 'Hide' : 'Show'
  if (view === 'score') return `${action} ${label} retirement scores`
  if (view === 'budget') return `${action} ${label} budget fit`
  return `${action} ${label} expat communities`
}

export function WtrMapPinLegend({
  view,
  variant = 'overlay',
  className,
  activeBands,
  onToggleBand,
}: Props) {
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

  const interactive = onToggleBand != null

  return (
    <div
      className={[
        'wtr-map-pin-legend',
        variant === 'bar' && 'wtr-map-pin-legend--bar',
        interactive && 'wtr-map-pin-legend--interactive',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="list"
      aria-label={ariaLabel}
    >
      {items.map((item) => {
        const isActive =
          !interactive ||
          !activeBands ||
          activeBands.includes(item.bandClass)

        if (interactive) {
          return (
            <button
              key={item.bandClass}
              type="button"
              role="listitem"
              className={[
                'wtr-map-pin-legend__item',
                'wtr-map-pin-legend__item--button',
                isActive ? 'wtr-map-pin-legend__item--on' : 'wtr-map-pin-legend__item--off',
              ].join(' ')}
              aria-pressed={isActive}
              aria-label={legendToggleLabel(view, item.label, isActive)}
              onClick={() => onToggleBand(item.bandClass)}
            >
              <span
                className="wtr-map-pin-legend__dot"
                style={{ background: item.color }}
                aria-hidden
              />
              <span className="wtr-map-pin-legend__label">{item.label}</span>
            </button>
          )
        }

        return (
          <span key={item.bandClass} className="wtr-map-pin-legend__item" role="listitem">
            <span
              className="wtr-map-pin-legend__dot"
              style={{ background: item.color }}
              aria-hidden
            />
            <span className="wtr-map-pin-legend__label">{item.label}</span>
          </span>
        )
      })}
    </div>
  )
}
