import type { ImpactRating } from './types'
import { formatCurrency } from './utils'
import './LifeEventsSidebar.scss'

export type ActiveEventSummary = {
  id: string
  label: string
  futureValue: number
  rating: ImpactRating
}

type Props = {
  activeEvents: ActiveEventSummary[]
  totalImpact: number
}

export function LifeEventsSidebar({
  activeEvents,
  totalImpact,
}: Props) {
  return (
    <aside className="life-events-sidebar" aria-label="Life events summary">
      <div className="life-events-sidebar__section">
        <h3 className="life-events-sidebar__heading">Active events</h3>
        {activeEvents.length > 0 ? (
          <ul className="life-events-sidebar__active-list">
            {activeEvents.map((event) => (
              <li key={event.id} className="life-events-sidebar__active-item">
                <span className="life-events-sidebar__active-label">
                  {event.label}
                </span>
                <span className="life-events-sidebar__active-value">
                  -{formatCurrency(event.futureValue)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="life-events-sidebar__empty">
            No events applied yet. Toggle a card to include it in your
            projection.
          </p>
        )}
      </div>

      <div className="life-events-sidebar__section life-events-sidebar__total">
        <span className="life-events-sidebar__total-label">Total impact</span>
        <span className="life-events-sidebar__total-value">
          {totalImpact > 0
            ? `-${formatCurrency(totalImpact)}`
            : formatCurrency(0)}
        </span>
        <span className="life-events-sidebar__total-note">
          Portfolio reduction by retirement
        </span>
      </div>
    </aside>
  )
}
