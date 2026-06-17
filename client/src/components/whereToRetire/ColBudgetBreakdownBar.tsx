import type { BudgetBreakdownDisplay } from '../../utils/costOfLiving'
import './ColBudgetBreakdownBar.scss'

export type ColBudgetCategoryDot = 'rent' | 'groceries' | 'dining' | 'utilities' | 'transport' | 'lifestyle' | 'other'

export const COL_BUDGET_CARD_CATEGORY_DOT: Record<string, ColBudgetCategoryDot> = {
  rent: 'rent',
  'dining-drinks': 'dining',
  'utilities-internet': 'utilities',
  transport: 'transport',
  lifestyle: 'lifestyle',
  'health-misc': 'other',
}

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
    { key: 'groceries', className: 'groceries', pct: barPercents.groceries },
    { key: 'diningAndDrinks', className: 'dining', pct: barPercents.diningAndDrinks },
    { key: 'utilities', className: 'utilities', pct: barPercents.utilities },
    { key: 'transport', className: 'transport', pct: barPercents.transport },
    { key: 'lifestyle', className: 'lifestyle', pct: barPercents.lifestyle },
    { key: 'other', className: 'other', pct: barPercents.other },
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
    </section>
  )
}
