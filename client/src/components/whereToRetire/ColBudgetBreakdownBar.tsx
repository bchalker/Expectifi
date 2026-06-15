import type { BudgetBarCategoryKey, BudgetBreakdownDisplay } from '../../utils/costOfLiving'
import './ColBudgetBreakdownBar.scss'

const LEGEND_ITEMS: {
  key: BudgetBarCategoryKey
  label: string
  barClass: string
  dotClass: string
}[] = [
  { key: 'rent', label: 'Rent', barClass: 'rent', dotClass: 'rent' },
  { key: 'foodAndDrink', label: 'Food & Drink', barClass: 'food', dotClass: 'food' },
  { key: 'transport', label: 'Transport', barClass: 'transport', dotClass: 'transport' },
  {
    key: 'utilitiesAndMobile',
    label: 'Utilities & Mobile',
    barClass: 'utilities',
    dotClass: 'utilities',
  },
  { key: 'lifestyle', label: 'Lifestyle', barClass: 'lifestyle', dotClass: 'lifestyle' },
  {
    key: 'healthInsurance',
    label: 'Health insurance',
    barClass: 'health',
    dotClass: 'health',
  },
  { key: 'incidentals', label: 'Incidentals', barClass: 'misc', dotClass: 'misc' },
]

type Props = {
  breakdown: BudgetBreakdownDisplay
  className?: string
  showTitle?: boolean
}

export function ColBudgetBreakdownBar({
  breakdown,
  className,
  showTitle = false,
}: Props) {
  const { barPercents } = breakdown
  const segments = [
    { key: 'rent', className: 'rent', pct: barPercents.rent },
    { key: 'foodAndDrink', className: 'food', pct: barPercents.foodAndDrink },
    { key: 'transport', className: 'transport', pct: barPercents.transport },
    {
      key: 'utilitiesAndMobile',
      className: 'utilities',
      pct: barPercents.utilitiesAndMobile,
    },
    { key: 'lifestyle', className: 'lifestyle', pct: barPercents.lifestyle },
    { key: 'healthInsurance', className: 'health', pct: barPercents.healthInsurance },
    { key: 'incidentals', className: 'misc', pct: barPercents.incidentals },
    { key: 'remaining', className: 'remaining', pct: barPercents.remaining },
  ].filter((segment) => segment.pct > 0)

  return (
    <section
      className={['wtr-col-budget-bar', className].filter(Boolean).join(' ')}
      aria-label="Monthly budget breakdown"
    >
      {showTitle ? (
        <p className="wtr-col-budget-bar__title">Monthly budget breakdown</p>
      ) : null}
      <div className="wtr-col-budget-bar__track" role="img" aria-hidden>
        {segments.map((segment) => (
          <span
            key={segment.key}
            className={`wtr-col-budget-bar__segment wtr-col-budget-bar__segment--${segment.className}`}
            style={{ width: `${segment.pct}%` }}
          />
        ))}
      </div>
      <ul className="wtr-col-budget-bar__legend">
        {LEGEND_ITEMS.filter((item) => barPercents[item.key] > 0).map((item) => (
          <li key={item.key} className="wtr-col-budget-bar__legend-item">
            <span
              className={`wtr-col-budget-bar__dot wtr-col-budget-bar__dot--${item.dotClass}`}
              aria-hidden
            />
            <span className="wtr-col-budget-bar__legend-text">
              {item.label} {barPercents[item.key]}%
            </span>
          </li>
        ))}
        {barPercents.remaining > 0 ? (
          <li className="wtr-col-budget-bar__legend-item">
            <span
              className="wtr-col-budget-bar__dot wtr-col-budget-bar__dot--remaining"
              aria-hidden
            />
            <span className="wtr-col-budget-bar__legend-text">
              Remaining {barPercents.remaining}%
            </span>
          </li>
        ) : null}
      </ul>
    </section>
  )
}
