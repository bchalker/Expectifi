import { fmt, fmtMon } from '../utils/format'
import './GoalProgressBar.scss'

type Phase = 'growth' | 'income'

type Props = {
  phase: Phase
  growthGoal: number
  growthGoalProgressPct: number | null
  monthlyIncomeGoal: number
  incomeGoalProgressPct: number | null
  hasPortfolioBalances: boolean
}

/** Shown above the wave subheader when a phase-appropriate goal is set in Configure. */
export function GoalProgressBar({
  phase,
  growthGoal,
  growthGoalProgressPct,
  monthlyIncomeGoal,
  incomeGoalProgressPct,
  hasPortfolioBalances,
}: Props) {
  if (!hasPortfolioBalances) return null

  const isGrowth = phase === 'growth'
  const pct = isGrowth ? growthGoalProgressPct : incomeGoalProgressPct
  const target = isGrowth ? growthGoal : monthlyIncomeGoal
  const label = isGrowth ? 'Growth goal' : 'Monthly income goal'

  if (target <= 0 || pct == null) return null

  const fillPct = Math.min(100, pct)
  const met = pct >= 100
  const formatValue = isGrowth ? fmt : fmtMon
  const regionLabel = isGrowth
    ? 'Portfolio at retirement goal progress'
    : 'After-tax monthly income goal progress'

  return (
    <div
      className={`goal-progress-bar${isGrowth ? '' : ' goal-progress-bar--phase-income'}`}
      role="region"
      aria-label={regionLabel}
    >
      <div className="goal-progress-bar__row">
        <p className="goal-progress-bar__copy">
          <span className="goal-progress-bar__label">{label}</span>
          <span className="goal-progress-bar__target">{formatValue(target)}</span>
        </p>
        <div className="goal-progress-bar__meter">
          <div
            className="goal-progress-bar__track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(fillPct)}
            aria-label={`${pct}% of ${label.toLowerCase()}`}
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
