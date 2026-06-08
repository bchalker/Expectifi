import { IconShieldCheckFilled } from "@tabler/icons-react";
import { fmt, fmtMon } from "../utils/format";
import "./GoalProgressBar.scss";

type Phase = "growth" | "income";

type Props = {
  phase: Phase;
  growthGoal: number;
  growthGoalProgressPct: number | null;
  monthlyIncomeGoal: number;
  incomeGoalProgressPct: number | null;
  hasPortfolioBalances: boolean;
  onAddGoal?: () => void;
  className?: string;
};

const GOAL_LABEL = "Goal";

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
  if (!hasPortfolioBalances) return null;

  const isGrowth = phase === "growth";
  const hasActiveGoal = isGrowth ? growthGoal > 0 : monthlyIncomeGoal > 0;
  const showGrowth = isGrowth && hasActiveGoal && growthGoalProgressPct != null;
  const showIncome =
    !isGrowth && hasActiveGoal && incomeGoalProgressPct != null;

  const phaseClass = isGrowth
    ? "goal-progress-bar--phase-growth"
    : "goal-progress-bar--phase-income";

  if (!showGrowth && !showIncome) {
    return (
      <div
        className={[
          "goal-progress-bar",
          "goal-progress-bar--empty",
          phaseClass,
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        role="region"
        aria-label={GOAL_LABEL}
      >
        <div className="goal-progress-bar__row">
          <span className="goal-progress-bar__label">{GOAL_LABEL}</span>
          <div className="goal-progress-bar__meter">
            <div
              className="goal-progress-bar__track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={0}
              aria-label={`${GOAL_LABEL} not set`}
            />
          </div>
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
    );
  }

  const target = showGrowth ? growthGoal : monthlyIncomeGoal;
  const pct = showGrowth ? growthGoalProgressPct! : incomeGoalProgressPct!;
  const formatValue = showGrowth ? fmt : fmtMon;
  const goalMet = pct >= 100;
  const fillPct = Math.min(100, pct);
  const displayPct = goalMet ? 100 : Math.round(pct);
  const statText = `${displayPct}% of ${formatValue(target)}`;
  const regionLabel = showGrowth
    ? "Portfolio at retirement goal progress"
    : "After-tax monthly income goal progress";

  return (
    <div
      className={[
        "goal-progress-bar",
        showGrowth
          ? "goal-progress-bar--phase-growth"
          : "goal-progress-bar--phase-income",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="region"
      aria-label={regionLabel}
    >
      <div className="goal-progress-bar__row">
        <span className="goal-progress-bar__label">{GOAL_LABEL}</span>
        <div className="goal-progress-bar__meter">
          <div
            className="goal-progress-bar__track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={displayPct}
            aria-label={statText}
          >
            <div
              className={`goal-progress-bar__fill${goalMet ? " goal-progress-bar__fill--met" : ""}`}
              style={{ width: `${fillPct}%` }}
            />
          </div>
        </div>
        <span
          className={[
            "goal-progress-bar__stat",
            goalMet && "goal-progress-bar__stat--met",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <span className="goal-progress-bar__stat-text tabular-nums">
            {statText}
          </span>
          {goalMet ? (
            <IconShieldCheckFilled
              className="goal-progress-bar__met-icon"
              size={16}
              aria-hidden
            />
          ) : null}
        </span>
      </div>
    </div>
  );
}
