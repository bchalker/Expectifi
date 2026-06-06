import { IconShieldCheckFilled } from '@tabler/icons-react'
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
  className?: string
}

/** Shown above the wave subheader when the active phase has a goal set in Configure. */
export function GoalProgressBar({
  phase,
  growthGoal,
  growthGoalProgressPct,
  monthlyIncomeGoal,
  incomeGoalProgressPct,
  hasPortfolioBalances,
  className,
}: Props) {
  if (!hasPortfolioBalances) return null

  const isGrowth = phase === 'growth'
  const showGrowth = isGrowth && growthGoal > 0 && growthGoalProgressPct != null
  const showIncome = !isGrowth && monthlyIncomeGoal > 0 && incomeGoalProgressPct != null

  if (!showGrowth && !showIncome) return null

  const label = showGrowth ? 'Growth goal' : 'Income goal'
  const target = showGrowth ? growthGoal : monthlyIncomeGoal
  const pct = showGrowth ? growthGoalProgressPct! : incomeGoalProgressPct!
  const formatValue = showGrowth ? fmt : fmtMon
  const fillPct = Math.min(100, pct)
  const displayPct = Math.min(100, Math.round(pct))
  const met = pct >= 100
  const regionLabel = showGrowth
    ? 'Portfolio at retirement goal progress'
    : 'After-tax monthly income goal progress'

  return (
    <div
      className={[
        'goal-progress-bar',
        showGrowth ? 'goal-progress-bar--phase-growth' : 'goal-progress-bar--phase-income',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
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
            aria-valuenow={displayPct}
            aria-label={`${displayPct}% of ${label.toLowerCase()}`}
          >
            <div
              className={`goal-progress-bar__fill${met ? ' goal-progress-bar__fill--met' : ''}`}
              style={{ width: `${fillPct}%` }}
            />
          </div>
          {met ? (
            <span className="goal-progress-bar__met" aria-label="Goal reached">
              <span className="goal-progress-bar__pct goal-progress-bar__pct--met">{displayPct}%</span>
              <IconShieldCheckFilled className="goal-progress-bar__met-icon" size={16} aria-hidden />
            </span>
          ) : (
            <span className="goal-progress-bar__pct">{displayPct}%</span>
          )}
        </div>
      </div>
    </div>
  )
}
