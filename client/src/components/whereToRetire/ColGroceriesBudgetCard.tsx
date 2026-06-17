import { useId, useState } from 'react'
import { IconChevronDown, IconShoppingCart } from '@tabler/icons-react'
import {
  GROCERY_BASKET_STAPLE_COUNT,
  GROCERY_BASKET_STAPLES,
  formatUsd,
} from '../../utils/costOfLiving'
import { COL_CATEGORY_ICON_SIZE } from './ColCategoryCard'
import './ColGroceriesBudgetCard.scss'
import './ColBudgetCategoryIcon.scss'

type Props = {
  amount: number
  className?: string
}

export function ColGroceriesBudgetCard({ amount, className }: Props) {
  const [expanded, setExpanded] = useState(false)
  const bodyId = useId()
  const headerAmount =
    Number.isFinite(amount) && amount > 0 ? formatUsd(amount) : 'varies'

  return (
    <article
      className={['wtr-col-groceries-card', className].filter(Boolean).join(' ')}
    >
      <button
        type="button"
        className="wtr-col-groceries-card__head"
        aria-expanded={expanded}
        aria-controls={bodyId}
        onClick={() => setExpanded((open) => !open)}
      >
        <div className="wtr-col-groceries-card__head-main">
          <div className="wtr-col-groceries-card__head-intro">
            <span
              className="wtr-col-groceries-card__icon wtr-col-budget-category-icon wtr-col-budget-category-icon--groceries"
              aria-hidden
            >
              <IconShoppingCart size={COL_CATEGORY_ICON_SIZE} stroke={1.5} />
            </span>
            <div className="wtr-col-groceries-card__head-text">
              <span className="wtr-col-groceries-card__title">Groceries</span>
              <span className="wtr-col-groceries-card__subtitle">
                Monthly basket · {GROCERY_BASKET_STAPLE_COUNT} staples
              </span>
            </div>
          </div>
          <div className="wtr-col-groceries-card__head-end">
            <span className="wtr-col-groceries-card__head-amount tabular-nums">
              {headerAmount}
            </span>
            <span
              className={[
                'wtr-col-groceries-card__chevron',
                expanded && 'wtr-col-groceries-card__chevron--open',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-hidden
            >
              <IconChevronDown size={16} stroke={1.5} />
            </span>
          </div>
        </div>
      </button>

      {expanded ? (
        <div id={bodyId} className="wtr-col-groceries-card__body">
          <ul className="wtr-col-groceries-card__items">
            {GROCERY_BASKET_STAPLES.map((item) => (
              <li key={item.label} className="wtr-col-groceries-card__item">
                {item.label}
              </li>
            ))}
          </ul>
          <p className="wtr-col-groceries-card__caption">
            A single adult who cooks most meals, not a minimal subsistence basket.
          </p>
        </div>
      ) : null}
    </article>
  )
}
