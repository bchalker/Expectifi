import { useEffect, useMemo, useRef, useState } from "react";
import { isValidIsoDateString } from "../lib/ageFromDob";
import type { OnboardingRegionId } from "../lib/onboardingRegions";
import {
  onboardingRetireAgePastValidation,
  onboardingRetireAgeStartForDob,
} from "../lib/onboardingRetireAgeValidation";
import { retirementYearFromAge } from "../lib/retirementYearFromAge";
import { OnboardingRegionStep } from "./OnboardingRegionStep";
import { DateOfBirthSelects } from "./DateOfBirthSelects";
import { CurrencyAmountInput } from "./ui/CurrencyAmountInput";
import "./WelcomeProfileStepFields.scss";
import "./ui/CurrencyAmountInput.scss";
import "./OnboardingRegionStep.scss";
import "./DateOfBirthSelects.scss";

export const ONBOARDING_RETIRE_AGE_MIN = 50;
export const ONBOARDING_RMD_AGE = 73;
export const ONBOARDING_RETIRE_AGE_MAX = ONBOARDING_RMD_AGE;
export const ONBOARDING_DEFAULT_RETIRE_AGE = 62;

function clampOnboardingRetireAge(age: number): number {
  if (!Number.isFinite(age)) return ONBOARDING_RETIRE_AGE_MIN;
  return Math.min(
    ONBOARDING_RETIRE_AGE_MAX,
    Math.max(ONBOARDING_RETIRE_AGE_MIN, Math.round(age)),
  );
}

type Props = {
  regionId: OnboardingRegionId | null | undefined;
  onRegionSelect: (regionId: OnboardingRegionId) => void;
  dateOfBirth: string;
  onDateOfBirth: (iso: string) => void;
  retireAge?: number;
  onRetireAgeChange?: (age: number) => void;
  /** Onboarding step 1 — blocks Continue when retirement year is in the past. */
  onRetireAgePastInvalidChange?: (invalid: boolean) => void;
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
  onRetireAgePastInvalidChange,
  onboardingLayout = false,
  householdIncome = 0,
  onHouseholdIncome,
  monthlyContribution = 0,
  onMonthlyContribution,
  showHouseholdIncome = false,
  showFillState = false,
  className,
}: Props) {
  const [retireValidationActive, setRetireValidationActive] = useState(false);

  const dobComplete = onboardingLayout && isValidIsoDateString(dateOfBirth);

  const prevDobRef = useRef(dateOfBirth);

  const onboardingRetireStartAge = useMemo(() => {
    if (!dobComplete) return null;
    const start = onboardingRetireAgeStartForDob(dateOfBirth);
    if (start == null) return null;
    return clampOnboardingRetireAge(start);
  }, [dobComplete, dateOfBirth]);

  useEffect(() => {
    if (!onboardingLayout || !onRetireAgeChange || onboardingRetireStartAge == null) {
      return;
    }
    if (!isValidIsoDateString(dateOfBirth)) {
      prevDobRef.current = dateOfBirth;
      return;
    }

    const dobChanged = prevDobRef.current !== dateOfBirth;
    prevDobRef.current = dateOfBirth;

    if (dobChanged) {
      onRetireAgeChange(onboardingRetireStartAge);
      return;
    }

    if (retireAge <= 0) {
      onRetireAgeChange(onboardingRetireStartAge);
      return;
    }

    const validation = onboardingRetireAgePastValidation(
      dateOfBirth,
      clampOnboardingRetireAge(retireAge),
    );
    if (validation.isInvalid) {
      onRetireAgeChange(onboardingRetireStartAge);
    }
  }, [
    dateOfBirth,
    onboardingLayout,
    onboardingRetireStartAge,
    onRetireAgeChange,
    retireAge,
  ]);

  const sliderRetireAge = useMemo(() => {
    if (Number.isFinite(retireAge) && retireAge > 0) {
      return clampOnboardingRetireAge(retireAge);
    }
    if (onboardingRetireStartAge != null) return onboardingRetireStartAge;
    return ONBOARDING_DEFAULT_RETIRE_AGE;
  }, [retireAge, onboardingRetireStartAge]);

  const pastRetireValidation = useMemo(() => {
    if (!dobComplete || !Number.isFinite(retireAge) || retireAge <= 0) {
      return { retirementYear: null, minValidAge: null, isInvalid: false };
    }
    return onboardingRetireAgePastValidation(
      dateOfBirth,
      clampOnboardingRetireAge(retireAge),
    );
  }, [dobComplete, dateOfBirth, retireAge]);

  useEffect(() => {
    if (!onboardingLayout) return;
    onRetireAgePastInvalidChange?.(pastRetireValidation.isInvalid);
  }, [
    onboardingLayout,
    onRetireAgePastInvalidChange,
    pastRetireValidation.isInvalid,
  ]);

  const retirementYear = useMemo(
    () =>
      pastRetireValidation.retirementYear ??
      retirementYearFromAge(dateOfBirth, sliderRetireAge),
    [pastRetireValidation.retirementYear, dateOfBirth, sliderRetireAge],
  );

  const showRetireAgeError =
    onboardingLayout &&
    retireValidationActive &&
    pastRetireValidation.isInvalid &&
    pastRetireValidation.minValidAge != null;

  const handleDateOfBirth = (iso: string) => {
    onDateOfBirth(iso);
    if (onboardingLayout && retireAge > 0) {
      setRetireValidationActive(true);
    }
  };

  const handleRetireAgeSlider = (nextAge: number) => {
    setRetireValidationActive(true);
    onRetireAgeChange?.(clampOnboardingRetireAge(nextAge));
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
          <div className="config-plan-field welcome-profile-fields__dob-block">
            <span className="config-plan-label">When were you born?</span>
            <DateOfBirthSelects
              value={dateOfBirth}
              onChange={handleDateOfBirth}
              includeDay={false}
            />
          </div>

          {dobComplete && onRetireAgeChange ? (
            <div className="welcome-profile-fields__retire-card">
              <span className="config-plan-label welcome-profile-fields__retire-card-label">
                What age do you want to retire?
              </span>
              <div className="welcome-profile-fields__retire-card-readout">
                <span
                  className="welcome-profile-fields__retire-card-age"
                  aria-hidden
                >
                  {sliderRetireAge}
                </span>
                {retirementYear != null ? (
                  <span
                    className={[
                      "welcome-profile-fields__retire-card-year",
                      showRetireAgeError
                        ? "welcome-profile-fields__retire-card-year--invalid"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-live="polite"
                  >
                    {retirementYear}
                  </span>
                ) : null}
              </div>
              <div className="welcome-profile-fields__retire-card-slider">
                <input
                  id="welcome-profile-retire-age"
                  type="range"
                  className="welcome-profile-fields__retire-card-range"
                  min={ONBOARDING_RETIRE_AGE_MIN}
                  max={ONBOARDING_RETIRE_AGE_MAX}
                  step={1}
                  value={sliderRetireAge}
                  onChange={(e) => handleRetireAgeSlider(Number(e.target.value))}
                  aria-valuemin={ONBOARDING_RETIRE_AGE_MIN}
                  aria-valuemax={ONBOARDING_RETIRE_AGE_MAX}
                  aria-valuenow={sliderRetireAge}
                  aria-label="Retirement age"
                />
                <div className="welcome-profile-fields__retire-card-ticks">
                  <span>{ONBOARDING_RETIRE_AGE_MIN}</span>
                  <span>{ONBOARDING_RETIRE_AGE_MAX}</span>
                </div>
              </div>
              <p className="welcome-profile-fields__retire-card-footnote">
                <strong>Why is the max age {ONBOARDING_RETIRE_AGE_MAX}?</strong>{" "}
                Required Minimum Distributions kick in at {ONBOARDING_RETIRE_AGE_MAX},
                forcing withdrawals from pre-tax accounts regardless of your plan.
              </p>
              {showRetireAgeError ? (
                <p
                  className="welcome-profile-fields__retire-age-error"
                  role="alert"
                >
                  That year has already passed. Minimum age is{" "}
                  {pastRetireValidation.minValidAge}.
                </p>
              ) : null}
            </div>
          ) : null}
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
