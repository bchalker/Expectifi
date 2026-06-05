import { useEffect, useMemo, useState } from "react";
import type { OnboardingRegionId } from "../lib/onboardingRegions";
import { retirementYearFromAge } from "../lib/retirementYearFromAge";
import { parseNum } from "../utils/format";
import { OnboardingRegionStep } from "./OnboardingRegionStep";
import { DateOfBirthSelects } from "./DateOfBirthSelects";
import { CurrencyAmountInput } from "./ui/CurrencyAmountInput";
import "./WelcomeProfileStepFields.scss";
import "./ui/CurrencyAmountInput.scss";
import "./OnboardingFieldShell.scss";
import "./OnboardingRegionStep.scss";
import "./DateOfBirthSelects.scss";

export const ONBOARDING_RETIRE_AGE_MIN = 55;
export const ONBOARDING_RETIRE_AGE_MAX = 75;

function clampOnboardingRetireAge(age: number): number {
  if (!Number.isFinite(age)) return ONBOARDING_RETIRE_AGE_MIN;
  return Math.min(ONBOARDING_RETIRE_AGE_MAX, Math.max(ONBOARDING_RETIRE_AGE_MIN, Math.round(age)));
}

type Props = {
  regionId: OnboardingRegionId | null | undefined;
  onRegionSelect: (regionId: OnboardingRegionId) => void;
  dateOfBirth: string;
  onDateOfBirth: (iso: string) => void;
  retireAge?: number;
  onRetireAgeChange?: (age: number) => void;
  /** Onboarding step 1 layout. */
  onboardingLayout?: boolean;
  /** Configure drawer only — hidden in onboarding step 1. */
  householdIncome?: number;
  onHouseholdIncome?: (amount: number) => void;
  monthlyContribution?: number;
  onMonthlyContribution?: (amount: number) => void;
  showHouseholdIncome?: boolean;
  showFillState?: boolean;
  className?: string;
};

export function WelcomeProfileStepFields({
  regionId,
  onRegionSelect,
  dateOfBirth,
  onDateOfBirth,
  retireAge = 0,
  onRetireAgeChange,
  onboardingLayout = false,
  householdIncome = 0,
  onHouseholdIncome,
  monthlyContribution = 0,
  onMonthlyContribution,
  showHouseholdIncome = false,
  showFillState = false,
  className,
}: Props) {
  const [ageFocused, setAgeFocused] = useState(false);
  const [ageDraft, setAgeDraft] = useState("");

  useEffect(() => {
    if (ageFocused) return;
    setAgeDraft(retireAge > 0 ? String(retireAge) : "");
  }, [retireAge, ageFocused]);

  const retirementYear = useMemo(
    () => retirementYearFromAge(dateOfBirth, retireAge),
    [dateOfBirth, retireAge],
  );

  const retireAgeFilled = Number.isFinite(retireAge) && retireAge > 0;
  const ageDisplay = ageFocused ? ageDraft : retireAge > 0 ? String(retireAge) : "";

  const commitRetireAgeDraft = () => {
    if (!onRetireAgeChange) return;
    const raw = ageDraft.trim();
    if (!raw) {
      const fallback = retireAge > 0 ? retireAge : 67;
      const next = clampOnboardingRetireAge(fallback);
      onRetireAgeChange(next);
      setAgeDraft(String(next));
      return;
    }
    const next = clampOnboardingRetireAge(parseNum(raw));
    onRetireAgeChange(next);
    setAgeDraft(String(next));
  };

  return (
    <div
      className={[
        "welcome-profile-fields",
        onboardingLayout ? "welcome-profile-fields--onboarding" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="welcome-profile-fields__section welcome-profile-fields__section--region">
        <div className="config-plan-field">
          <span className="config-plan-label" id="welcome-profile-region-label">
            Where are you based?
          </span>
          <OnboardingRegionStep
            embedded
            selectedRegionId={regionId}
            onSelect={onRegionSelect}
          />
        </div>
      </div>

      {onboardingLayout ? (
        <div className="welcome-profile-fields__section welcome-profile-fields__section--birth-retire">
          <div className="welcome-profile-fields__birth-retire-row">
            <div className="config-plan-field planning-profile-fields__dob welcome-profile-fields__dob-col">
              <span className="config-plan-label">When were you born?</span>
              <DateOfBirthSelects
                value={dateOfBirth}
                onChange={onDateOfBirth}
                includeDay={false}
                segmented
                yearInput
              />
            </div>

            {onRetireAgeChange ? (
              <div className="config-plan-field welcome-profile-fields__retire-col">
                  <label className="config-plan-label" htmlFor="welcome-profile-retire-age">
                    Retire at age
                  </label>
                  <div
                    className={[
                      "onboarding-field-shell",
                      "welcome-profile-fields__retire-shell",
                      retireAgeFilled ? "onboarding-field-shell--filled" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <input
                      id="welcome-profile-retire-age"
                      type="text"
                      inputMode="numeric"
                      className="onboarding-field-shell__input welcome-profile-fields__retire-input"
                      value={ageDisplay}
                      aria-valuemin={ONBOARDING_RETIRE_AGE_MIN}
                      aria-valuemax={ONBOARDING_RETIRE_AGE_MAX}
                      aria-valuenow={retireAge > 0 ? retireAge : undefined}
                      onFocus={() => {
                        setAgeFocused(true);
                        setAgeDraft(retireAge > 0 ? String(retireAge) : "");
                      }}
                      onChange={(e) => setAgeDraft(e.target.value.replace(/[^\d]/g, "").slice(0, 2))}
                      onBlur={() => {
                        setAgeFocused(false);
                        commitRetireAgeDraft();
                      }}
                    />
                    {retirementYear != null ? (
                      <span className="welcome-profile-fields__retire-year" aria-live="polite">
                        = {retirementYear}
                      </span>
                    ) : null}
                  </div>
                </div>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <div className="welcome-profile-fields__section">
            <div className="config-plan-field planning-profile-fields__dob">
              <span className="config-plan-label">When were you born?</span>
              <DateOfBirthSelects
                value={dateOfBirth}
                onChange={onDateOfBirth}
                includeDay={false}
                segmented
                showAgeHint
              />
            </div>
          </div>

          <div className="welcome-profile-fields__stack">
            {showHouseholdIncome && onHouseholdIncome ? (
              <CurrencyAmountInput
                id="welcome-planning-household-income"
                label="Household income"
                value={householdIncome}
                onChange={onHouseholdIncome}
                externalPrefix
                showFillState={showFillState}
              />
            ) : null}
            {onMonthlyContribution ? (
              <CurrencyAmountInput
                id="welcome-planning-monthly-contribution"
                label="Monthly contribution"
                value={monthlyContribution}
                onChange={onMonthlyContribution}
                externalPrefix
                showFillState={showFillState}
              />
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
