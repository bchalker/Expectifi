import type { BudgetBreakdownDisplay } from '../../utils/costOfLiving'
import './ColBudgetBreakdownBar.scss'

const LEGEND_ITEMS: {
  key: keyof BudgetBreakdownDisplay['barPercents']
  label: string
  barClass: string
  dotClass: string
}[] = [
  { key: 'rent', label: 'Rent', barClass: 'rent', dotClass: 'rent' },
  { key: 'food', label: 'Food', barClass: 'food', dotClass: 'food' },
  { key: 'transport', label: 'Transport', barClass: 'transport', dotClass: 'transport' },
  {
    key: 'utilitiesInternet',
    label: 'Utilities & Internet',
    barClass: 'utilities',
    dotClass: 'utilities',
  },
]

type Props = {
  breakdown: BudgetBreakdownDisplay
  className?: string
}

export function ColBudgetBreakdownBar({ breakdown, className }: Props) {
  const { barPercents } = breakdown
  const segments = [
    { key: 'rent', className: 'rent', pct: barPercents.rent },
    { key: 'food', className: 'food', pct: barPercents.food },
    { key: 'transport', className: 'transport', pct: barPercents.transport },
    { key: 'utilitiesInternet', className: 'utilities', pct: barPercents.utilitiesInternet },
    { key: 'remaining', className: 'remaining', pct: barPercents.remaining },
  ].filter((segment) => segment.pct > 0)

  return (
    <section
      className={['wtr-col-budget-bar', className].filter(Boolean).join(' ')}
      aria-label="Monthly budget breakdown"
    >
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
