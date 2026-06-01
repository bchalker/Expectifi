import type { EventImpactStripProps } from './types'
import { formatStripPortfolioValue } from './utils'
import './EventImpactStrip.scss'

export { formatStripPortfolioValue } from './utils'

export function EventImpactStrip({
  baselinePortfolio,
  afterEventPortfolio,
  monthlyIncomeLost,
  isOutflow,
  className = '',
}: EventImpactStripProps & { className?: string }) {
  const incomePrefix = isOutflow ? '-' : '+'
  const incomeClass = isOutflow
    ? 'event-impact-strip__value--outflow'
    : 'event-impact-strip__value--inflow'

  return (
    <div className={['event-impact-strip', className].filter(Boolean).join(' ')}>
      <div className="event-impact-strip__section event-impact-strip__section--baseline">
        <span className="event-impact-strip__label">Retirement portfolio</span>
        <span className="event-impact-strip__value">{formatStripPortfolioValue(baselinePortfolio)}</span>
        <span className="event-impact-strip__sublabel">projected at retirement</span>
      </div>

      <span className="event-impact-strip__divider" aria-hidden />

      <div className="event-impact-strip__section event-impact-strip__section--after">
        <span className="event-impact-strip__label">After this event</span>
        <span className="event-impact-strip__value">{formatStripPortfolioValue(afterEventPortfolio)}</span>
        <span className="event-impact-strip__sublabel">projected at retirement</span>
      </div>

      <span className="event-impact-strip__divider" aria-hidden />

      <div className="event-impact-strip__section event-impact-strip__section--income">
        <span className="event-impact-strip__label">Income impact</span>
        <span className={['event-impact-strip__value', 'event-impact-strip__value--income', incomeClass].join(' ')}>
          {incomePrefix}${monthlyIncomeLost.toLocaleString()}/mo for life
        </span>
        <span className="event-impact-strip__sublabel">based on your withdrawal rate</span>
      </div>
    </div>
  )
}
