import { useEffect, useMemo, useState } from "react";
import { IconCheck } from "@tabler/icons-react";
import {
  WELCOME_PLANNING_HINTS,
  WELCOME_PLANNING_PLACEHOLDERS,
} from "../lib/welcomePlanningFieldCopy";
import {
  clampTargetRetirementAge,
  retireAgeBoundsForDob,
} from "../lib/userPrefs";
import { parseNum } from "../utils/format";
import { CurrencyAmountInput } from "./ui/CurrencyAmountInput";
import "./WelcomeGoalStepFields.scss";
import "./ui/CurrencyAmountInput.scss";
import "./OnboardingFieldShell.scss";

type Props = {
  monthlyGoal: number;
  onMonthlyGoalChange: (amount: number) => void;
  growthGoal: number;
  onGrowthGoalChange: (amount: number) => void;
  monthlyContribution?: number;
  onMonthlyContributionChange?: (amount: number) => void;
  retireAge?: number;
  onRetireAgeChange?: (age: number) => void;
  dateOfBirth?: string;
  centered?: boolean;
  compactGoals?: boolean;
  embeddedInProfile?: boolean;
  /** Onboarding step 3 — goals only. */
  step3Layout?: boolean;
  /** @deprecated Use step3Layout; kept for legacy two-field onboarding layouts. */
  step2Layout?: boolean;
  showFillState?: boolean;
  className?: string;
};

export function WelcomeGoalStepFields({
  monthlyGoal,
  onMonthlyGoalChange,
  growthGoal,
  onGrowthGoalChange,
  monthlyContribution = 0,
  onMonthlyContributionChange,
  retireAge = 0,
  onRetireAgeChange,
  dateOfBirth = "",
  centered = false,
  compactGoals = false,
  embeddedInProfile = false,
  step3Layout = false,
  step2Layout = false,
  showFillState = false,
  className,
}: Props) {
  const [ageFocused, setAgeFocused] = useState(false);
  const [ageDraft, setAgeDraft] = useState("");
  const bounds = useMemo(
    () => retireAgeBoundsForDob(dateOfBirth),
    [dateOfBirth],
  );

  useEffect(() => {
    if (ageFocused) return;
    setAgeDraft(retireAge > 0 ? String(retireAge) : "");
  }, [retireAge, ageFocused]);

  const retireAgeFilled = Number.isFinite(retireAge) && retireAge > 0;
  const ageDisplay = ageFocused
    ? ageDraft
    : retireAge > 0
      ? String(retireAge)
      : "";

  const commitRetireAgeDraft = () => {
    if (!onRetireAgeChange) return;
    const raw = ageDraft.trim();
    if (!raw) {
      const fallback = retireAge > 0 ? retireAge : bounds.min;
      onRetireAgeChange(clampTargetRetirementAge(fallback, dateOfBirth));
      setAgeDraft(String(clampTargetRetirementAge(fallback, dateOfBirth)));
      return;
    }
    const next = clampTargetRetirementAge(parseNum(raw), dateOfBirth);
    onRetireAgeChange(next);
    setAgeDraft(String(next));
  };

  if (step3Layout || step2Layout) {
    const goalsOnly = step3Layout || !onMonthlyContributionChange;
    return (
      <div
        className={[
          "welcome-goal-fields",
          goalsOnly
            ? "welcome-goal-fields--step3"
            : "welcome-goal-fields--step2",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {!goalsOnly && onMonthlyContributionChange ? (
          <CurrencyAmountInput
            id="welcome-planning-monthly-contribution"
            className="welcome-goal-fields__step2-contribution"
            label="Monthly contribution to retirement accounts"
            value={monthlyContribution}
            onChange={onMonthlyContributionChange}
            placeholder={WELCOME_PLANNING_PLACEHOLDERS.monthlyContribution}
            hint={WELCOME_PLANNING_HINTS.monthlyContributionGoals}
            externalPrefix
            showFillState={showFillState}
          />
        ) : null}

        <div className="welcome-goal-fields__aiming-group">
          <div className="welcome-goal-fields__aiming-row">
            <CurrencyAmountInput
              id="welcome-planning-monthly-goal"
              className="welcome-goal-fields__aiming-income"
              label="Monthly income"
              labelMutedSuffix="— optional"
              value={monthlyGoal}
              onChange={onMonthlyGoalChange}
              placeholder="5,000"
              externalPrefix
              externalSuffix="/mo"
              showFillState={showFillState}
            />
            <CurrencyAmountInput
              id="welcome-planning-growth-goal"
              className="welcome-goal-fields__aiming-portfolio"
              label="Portfolio value"
              labelMutedSuffix="— optional"
              value={growthGoal}
              onChange={onGrowthGoalChange}
              placeholder="1,500,000"
              externalPrefix
              showFillState={showFillState}
            />
          </div>
          {/* <p className="welcome-goal-fields__aiming-hint">{WELCOME_PLANNING_HINTS.goalsAiming}</p> */}
        </div>
      </div>
    );
  }

  return (
    <div
      className={[
        "welcome-goal-fields",
        centered ? "welcome-goal-fields--centered" : "",
        compactGoals ? "welcome-goal-fields--compact-goals" : "",
        embeddedInProfile ? "welcome-goal-fields--embedded-profile" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="welcome-goal-fields__goals-section">
        <div className="welcome-goal-fields__goals-intro">
          <h3 className="welcome-goal-fields__goals-heading">
            Goals at Retirement
          </h3>
          <p className="welcome-goal-fields__goals-lead">
            {WELCOME_PLANNING_HINTS.goalsAtRetirement}
          </p>
        </div>
        <div className="welcome-goal-fields__goals-row">
          <CurrencyAmountInput
            id="welcome-planning-growth-goal"
            className="welcome-goal-fields__goal-input welcome-goal-fields__goal-input--growth"
            label="Growth"
            value={growthGoal}
            onChange={onGrowthGoalChange}
            externalPrefix
            showFillState={showFillState}
          />
          <CurrencyAmountInput
            id="welcome-planning-monthly-goal"
            className="welcome-goal-fields__goal-input welcome-goal-fields__goal-input--income"
            label="Income"
            value={monthlyGoal}
            onChange={onMonthlyGoalChange}
            externalPrefix
            externalSuffix="/mo"
            showFillState={showFillState}
          />
        </div>
      </div>
      {onRetireAgeChange ? (
        <div className="config-plan-field welcome-goal-fields__retire-age">
          <label
            className="config-plan-label"
            htmlFor="welcome-planning-retire-age"
          >
            ...and when would you like to retire?
          </label>
          <div
            className={[
              "onboarding-field-shell",
              "welcome-goal-fields__age-input-wrap",
              retireAgeFilled ? "onboarding-field-shell--filled" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <input
              id="welcome-planning-retire-age"
              type="text"
              inputMode="numeric"
              className="onboarding-field-shell__input welcome-goal-fields__age-input"
              value={ageDisplay}
              min={bounds.min}
              max={bounds.max}
              aria-valuemin={bounds.min}
              aria-valuemax={bounds.max}
              aria-valuenow={retireAge > 0 ? retireAge : undefined}
              onFocus={() => {
                setAgeFocused(true);
                setAgeDraft(retireAge > 0 ? String(retireAge) : "");
              }}
              onChange={(e) =>
                setAgeDraft(e.target.value.replace(/[^\d]/g, ""))
              }
              onBlur={() => {
                setAgeFocused(false);
                commitRetireAgeDraft();
              }}
            />
            {retireAgeFilled ? (
              <span className="onboarding-field-shell__check" aria-hidden>
                <IconCheck size={14} strokeWidth={2} />
              </span>
            ) : null}
          </div>
          <p className="welcome-goal-fields__hint">
            {WELCOME_PLANNING_HINTS.targetRetirementAge}
          </p>
        </div>
      ) : null}
    </div>
  );
}
