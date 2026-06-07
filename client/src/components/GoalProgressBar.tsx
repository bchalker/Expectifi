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
  onAddGoal?: () => void
  className?: string
}

/** Shown above the wave subheader when the user has portfolio balances. */
export function GoalProgressBar({
  phase,
  growthGoal,
  growthGoalProgressPct,
  monthlyIncomeGoal,
  incomeGoalProgressPct,
  hasPortfolioBalances,
  onAddGoal,
  className,
}: Props) {
  if (!hasPortfolioBalances) return null

  const isGrowth = phase === 'growth'
  const hasActiveGoal = isGrowth ? growthGoal > 0 : monthlyIncomeGoal > 0
  const showGrowth =
    isGrowth && hasActiveGoal && growthGoalProgressPct != null
  const showIncome =
    !isGrowth && hasActiveGoal && incomeGoalProgressPct != null

  const phaseClass = isGrowth
    ? 'goal-progress-bar--phase-growth'
    : 'goal-progress-bar--phase-income'

  if (!showGrowth && !showIncome) {
    const label = isGrowth ? 'Growth goal' : 'Income goal'

    return (
      <div
        className={['goal-progress-bar', 'goal-progress-bar--empty', phaseClass, className]
          .filter(Boolean)
          .join(' ')}
        role="region"
        aria-label={label}
      >
        <div className="goal-progress-bar__row">
          <p className="goal-progress-bar__copy">
            <span className="goal-progress-bar__label">{label}</span>
          </p>
          <div className="goal-progress-bar__meter">
            <div
              className="goal-progress-bar__track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={0}
              aria-label={`${label} not set`}
            />
            {onAddGoal ? (
              <button
                type="button"
                className="goal-progress-bar__add-goal"
                onClick={onAddGoal}
              >
                Add your goal
              </button>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

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
