import {
  EXPAT_PIN_LEGEND,
  BUDGET_PIN_LEGEND,
  SCORE_PIN_LEGEND,
  type ExpatLegendTierId,
  type MapPinColorView,
} from '../../lib/whereToRetire/mapPinDisplay'
import './WtrMapPinLegend.scss'

type Props = {
  view: MapPinColorView
  /** `bar` — inline row beside description; `overlay` — floating card on map (legacy). */
  variant?: 'bar' | 'overlay'
  className?: string
  activeExpatTiers?: ExpatLegendTierId[]
  onToggleExpatTier?: (tier: ExpatLegendTierId) => void
}

export function WtrMapPinLegend({
  view,
  variant = 'overlay',
  className,
  activeExpatTiers,
  onToggleExpatTier,
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

  const expatInteractive = view === 'expat' && onToggleExpatTier != null

  return (
    <div
      className={[
        'wtr-map-pin-legend',
        variant === 'bar' && 'wtr-map-pin-legend--bar',
        expatInteractive && 'wtr-map-pin-legend--interactive',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="list"
      aria-label={ariaLabel}
    >
      {items.map((item) => {
        const tier = item.bandClass as ExpatLegendTierId
        const isActive =
          !expatInteractive ||
          !activeExpatTiers ||
          activeExpatTiers.includes(tier)

        if (expatInteractive) {
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
              aria-label={`${isActive ? 'Hide' : 'Show'} ${item.label} expat communities`}
              onClick={() => onToggleExpatTier(tier)}
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
