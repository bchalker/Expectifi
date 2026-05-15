import { fmtMon } from '../utils/format'
import './GoalProgressBar.scss'

type Props = {
  monthlyIncomeGoal: number
  afterTaxMon: number
  goalProgressPct: number | null
}

/** Shown above the wave subheader when Configure → after-tax monthly goal is set (> 0). */
export function GoalProgressBar({
  monthlyIncomeGoal,
  afterTaxMon,
  goalProgressPct,
}: Props) {
  if (monthlyIncomeGoal <= 0 || goalProgressPct == null) return null

  const pct = goalProgressPct
  const fillPct = Math.min(100, pct)
  const met = pct >= 100

  return (
    <div className="goal-progress-bar" role="region" aria-label="After-tax monthly income goal progress">
      <div className="goal-progress-bar__row">
        <p className="goal-progress-bar__copy">
          <span className="goal-progress-bar__label">Goal</span>
          <span className="goal-progress-bar__values">
            <span className="goal-progress-bar__current">{fmtMon(afterTaxMon)}</span>
            <span className="goal-progress-bar__sep" aria-hidden>
              /
            </span>
            <span className="goal-progress-bar__target">{fmtMon(monthlyIncomeGoal)}</span>
          </span>
        </p>
        <div className="goal-progress-bar__meter">
          <div
            className="goal-progress-bar__track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(fillPct)}
            aria-label={`${pct}% of after-tax monthly goal`}
          >
            <div
              className={`goal-progress-bar__fill${met ? ' goal-progress-bar__fill--met' : ''}`}
              style={{ width: `${fillPct}%` }}
            />
          </div>
          <span className={`goal-progress-bar__pct${met ? ' goal-progress-bar__pct--met' : ''}`}>
            {pct}%
          </span>
        </div>
      </div>
    </div>
  )
}
