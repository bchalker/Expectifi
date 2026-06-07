import { useEffect, useMemo, type ReactNode } from "react";
import { ClaimAgeSlider } from "./ClaimAgeSlider";
import { DateOfBirthSelects } from "./DateOfBirthSelects";
import {
  SpouseClaimModeSegment,
  type SpouseClaimMode,
} from "./SpouseClaimModeSegment";
import { CurrencyAmountInput } from "./ui/CurrencyAmountInput";
import type { LocalePensionConfig } from "../lib/localePensionConfig";
import { pensionConfigForLocale } from "../lib/localePensionConfig";
import type { OnboardingRegionId } from "../lib/onboardingRegions";
import {
  benefitAtClaimAgeFromMonthlyAt67,
  clampClaimAgeInRange,
  monthlyAt67FromBenefitAtClaimAge,
} from "../lib/socialSecurity";
import {
  isSpouseDobComplete,
  spouseCurrentAge,
  spouseSpousalClaimMinAge,
  spouseSsClaimUiScenario,
  userClaimYear,
} from "../lib/spouseSsClaimUi";
import { fmtInput } from "../utils/format";
import "./SocialSecuritySetupFields.scss";
import "./ClaimAgeSlider.scss";
import "./SpouseClaimModeSegment.scss";
import "./DateOfBirthSelects.scss";
import "./ui/CurrencyAmountInput.scss";
import "./OnboardingFieldShell.scss";

export type SocialSecuritySetupHints = Partial<
  Pick<
    LocalePensionConfig,
    | "benefitHint"
    | "claimAgeHint"
    | "includeSpouseHint"
    | "spouseClaimModeTooltip"
    | "includeToggleLabel"
    | "claimQuestionLabel"
    | "spouseClaimQuestionLabel"
    | "spouseClaimModeQuestionLabel"
    | "averageBadge"
  >
> & {
  includeSpouseToggleLabel?: string;
  benefitFieldLabel?: string;
  benefitHintLinkUrl?: string | null;
  benefitHintLinkLabel?: string;
};

type Props = {
  locale?: OnboardingRegionId | string | null;
  ssAge: number;
  onSsAgeChange: (age: number) => void;
  ssBenefitMonthly: number;
  onSsBenefitMonthlyChange: (amount: number) => void;
  dateOfBirth: string;
  includeSpouse: boolean;
  onIncludeSpouseChange: (value: boolean) => void;
  spouseClaimMode: SpouseClaimMode;
  onSpouseClaimModeChange: (mode: SpouseClaimMode) => void;
  spouseDob: string;
  onSpouseDobChange: (iso: string) => void;
  spouseSsAge: number;
  onSpouseSsAgeChange: (age: number) => void;
  spouseBenefitMonthly: number;
  onSpouseBenefitMonthlyChange: (amount: number) => void;
  hints?: SocialSecuritySetupHints;
  showFillState?: boolean;
  /** Inline validation for the primary expected-benefit field. */
  userBenefitError?: string;
  /** When set, claim-age slider shows only these tick labels (range still min–max). */
  claimAgeMilestoneTicks?: readonly number[];
  className?: string;
};

function claimAtAgeLabel(template: string, age: number): string {
  return template.replace(/\bage\b/, String(age));
}

function pensionBenefitHint(
  hint: string,
  linkUrl: string | null,
  linkLabel = "ssa.gov",
): ReactNode {
  if (!linkUrl) return hint;
  const parts = hint.split(linkLabel);
  if (parts.length !== 2) return hint;
  return (
    <>
      {parts[0]}
      <a
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="currency-amount-input__hint-link"
      >
        {linkLabel}
      </a>
      {parts[1]}
    </>
  );
}

type ClaimBenefitRowProps = {
  claimLabel: string;
  claimAgeHint?: string;
  claimControl: ReactNode;
  benefitField: ReactNode;
};

function ClaimBenefitRow({
  claimLabel,
  claimAgeHint,
  claimControl,
  benefitField,
}: ClaimBenefitRowProps) {
  return (
    <div className="ss-setup-fields__claim-row">
      <div className="config-plan-field ss-setup-fields__claim-field">
        <span className="config-plan-label ss-setup-fields__claim-label">
          {claimLabel}
        </span>
        {claimControl}
        {claimAgeHint ? (
          <p className="ss-setup-fields__hint">{claimAgeHint}</p>
        ) : null}
      </div>
      <div className="ss-setup-fields__benefit-field">{benefitField}</div>
    </div>
  );
}

type SpouseReadOnlyBenefitProps = {
  label: string;
  amount: number;
};

function SpouseReadOnlyBenefitDisplay({
  label,
  amount,
}: SpouseReadOnlyBenefitProps) {
  return (
    <div className="ss-setup-fields__spouse-benefit-display">
      <span className="config-plan-label">{label}</span>
      <div className="ss-setup-fields__spouse-benefit-value-row">
        <span className="ss-setup-fields__spouse-benefit-prefix" aria-hidden>
          $
        </span>
        <div
          className="onboarding-field-shell onboarding-field-shell--readonly ss-setup-fields__spouse-benefit-readonly"
          aria-label={label}
        >
          <p className="onboarding-field-shell__readonly-value">
            {fmtInput(amount)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function SocialSecuritySetupFields({
  locale,
  ssAge,
  onSsAgeChange,
  ssBenefitMonthly,
  onSsBenefitMonthlyChange,
  dateOfBirth,
  includeSpouse,
  onIncludeSpouseChange,
  spouseClaimMode,
  onSpouseClaimModeChange,
  spouseDob,
  onSpouseDobChange,
  spouseSsAge,
  onSpouseSsAgeChange,
  spouseBenefitMonthly,
  onSpouseBenefitMonthlyChange,
  hints: hintsProp,
  showFillState = true,
  userBenefitError,
  claimAgeMilestoneTicks,
  className,
}: Props) {
  const base = pensionConfigForLocale(locale);
  const hints = {
    includeSpouseToggleLabel:
      hintsProp?.includeSpouseToggleLabel ?? "Include my spouse",
    benefitFieldLabel: hintsProp?.benefitFieldLabel ?? base.benefitFieldLabel,
    spouseBenefitFieldLabel: base.spouseBenefitFieldLabel,
    claimQuestionLabel: hintsProp?.claimQuestionLabel ?? base.claimQuestionLabel,
    spouseClaimQuestionLabel:
      hintsProp?.spouseClaimQuestionLabel ?? base.spouseClaimQuestionLabel,
    spouseClaimModeQuestionLabel:
      hintsProp?.spouseClaimModeQuestionLabel ?? base.spouseClaimModeQuestionLabel,
    benefitHint: hintsProp?.benefitHint ?? base.benefitHint,
    benefitHintLinkUrl: hintsProp?.benefitHintLinkUrl ?? base.benefitHintLinkUrl,
    benefitHintLinkLabel: hintsProp?.benefitHintLinkLabel,
    claimAgeHint: hintsProp?.claimAgeHint ?? base.claimAgeHint,
    includeSpouseHint: hintsProp?.includeSpouseHint ?? base.includeSpouseHint,
    spouseClaimModeTooltip:
      hintsProp?.spouseClaimModeTooltip ?? base.spouseClaimModeTooltip,
    averageBadge: hintsProp?.averageBadge ?? base.averageBadge,
  };
  const claimMin = base.claimAgeMin;
  const claimMax = base.claimAgeMax;
  const milestones = claimAgeMilestoneTicks ?? base.claimMilestoneTicks;
  const ssAgeClamped = clampClaimAgeInRange(ssAge, claimMin, claimMax);
  const spouseDobComplete = isSpouseDobComplete(spouseDob);
  const spouseScenario = spouseSsClaimUiScenario({
    spouseDob,
    userDob: dateOfBirth,
    userClaimAge: ssAgeClamped,
    claimAgeMin: claimMin,
    claimAgeMax: claimMax,
  });
  const spouseAgeNow = spouseCurrentAge(spouseDob);
  const spouseSpousalMinAge = useMemo(
    () =>
      spouseSpousalClaimMinAge(
        spouseDob,
        dateOfBirth,
        ssAgeClamped,
        claimMin,
        claimMax,
      ),
    [spouseDob, dateOfBirth, ssAgeClamped, claimMin, claimMax],
  );
  const userClaimYearValue = useMemo(
    () => userClaimYear(dateOfBirth, ssAgeClamped),
    [dateOfBirth, ssAgeClamped],
  );
  const spouseClaimMin =
    spouseClaimMode === "spousal" ? spouseSpousalMinAge : claimMin;
  const spouseSsAgeClamped = clampClaimAgeInRange(
    spouseSsAge,
    spouseClaimMin,
    claimMax,
  );
  const userMonthlyAt67ForEstimate =
    ssBenefitMonthly > 0 ? ssBenefitMonthly : base.defaultBenefitMonthlyAt67;
  const spouseMonthlyAt67ForEstimate =
    spouseBenefitMonthly > 0 ? spouseBenefitMonthly : base.defaultBenefitMonthlyAt67;

  const handleUserAgeChange = (age: number) => {
    const next = clampClaimAgeInRange(age, claimMin, claimMax);
    onSsAgeChange(next);
    if (spouseScenario === "claimable" && spouseClaimMode === "spousal") {
      const nextMin = spouseSpousalClaimMinAge(
        spouseDob,
        dateOfBirth,
        next,
        claimMin,
        claimMax,
      );
      if (spouseSsAge < nextMin) {
        onSpouseSsAgeChange(nextMin);
      }
    }
  };

  const handleSpouseClaimModeChange = (mode: SpouseClaimMode) => {
    onSpouseClaimModeChange(mode);
    if (spouseScenario === "claimable" && mode === "spousal") {
      if (spouseSsAge < spouseSpousalMinAge) {
        onSpouseSsAgeChange(spouseSpousalMinAge);
      }
    }
  };

  const handleSpouseAgeChange = (age: number) => {
    onSpouseSsAgeChange(clampClaimAgeInRange(age, spouseClaimMin, claimMax));
  };

  useEffect(() => {
    if (!includeSpouse || spouseScenario !== "claimable") return;
    if (spouseClaimMode !== "spousal") return;
    if (spouseSsAge < spouseSpousalMinAge) {
      onSpouseSsAgeChange(spouseSpousalMinAge);
    }
  }, [
    includeSpouse,
    spouseScenario,
    spouseClaimMode,
    spouseSpousalMinAge,
    spouseSsAge,
    onSpouseSsAgeChange,
  ]);

  const ssBenefitInputValue = benefitAtClaimAgeFromMonthlyAt67(
    ssBenefitMonthly,
    ssAgeClamped,
  );
  const spouseBenefitAtClaimAge = useMemo(
    () =>
      benefitAtClaimAgeFromMonthlyAt67(
        spouseMonthlyAt67ForEstimate,
        spouseSsAgeClamped,
      ),
    [spouseMonthlyAt67ForEstimate, spouseSsAgeClamped],
  );
  const spouseSpousalBenefitDisplay = useMemo(
    () =>
      Math.round(
        benefitAtClaimAgeFromMonthlyAt67(
          userMonthlyAt67ForEstimate,
          spouseSsAgeClamped,
        ) * 0.5,
      ),
    [userMonthlyAt67ForEstimate, spouseSsAgeClamped],
  );
  const spouseManualBenefitDisplay = benefitAtClaimAgeFromMonthlyAt67(
    spouseMonthlyAt67ForEstimate,
    Math.min(spouseAgeNow ?? claimMax, claimMax),
  );

  return (
    <div className={["ss-setup-fields", className].filter(Boolean).join(" ")}>
      <ClaimBenefitRow
        claimLabel={claimAtAgeLabel(hints.claimQuestionLabel, ssAgeClamped)}
        claimAgeHint={hints.claimAgeHint}
        claimControl={
          <ClaimAgeSlider
            value={ssAgeClamped}
            onChange={handleUserAgeChange}
            ariaLabel={claimAtAgeLabel(hints.claimQuestionLabel, ssAgeClamped)}
            claimAgeMin={claimMin}
            claimAgeMax={claimMax}
            milestoneAges={milestones}
          />
        }
        benefitField={
          <CurrencyAmountInput
            id="ss-setup-user-benefit"
            label={hints.benefitFieldLabel}
            value={ssBenefitInputValue}
            onChange={(amount) =>
              onSsBenefitMonthlyChange(
                monthlyAt67FromBenefitAtClaimAge(amount, ssAgeClamped),
              )
            }
            hint={pensionBenefitHint(
              hints.benefitHint,
              hints.benefitHintLinkUrl ?? base.benefitHintLinkUrl,
              hints.benefitHintLinkLabel ?? "ssa.gov",
            )}
            averageBadge={hints.averageBadge}
            externalPrefix
            showFillState={showFillState}
            error={userBenefitError}
            errorVariant="label"
          />
        }
      />

      <div className="ss-setup-fields__section ss-setup-fields__section--spouse">
        <div className="ss-setup-fields__toggle-row">
          <div className="ss-setup-fields__toggle-copy">
            <span className="config-plan-label" id="ss-setup-include-spouse-label">
              {hints.includeSpouseToggleLabel}
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-labelledby="ss-setup-include-spouse-label"
            aria-checked={includeSpouse}
            className={`ss-setup-fields__toggle${includeSpouse ? " ss-setup-fields__toggle--on" : ""}`}
            onClick={() => onIncludeSpouseChange(!includeSpouse)}
          >
            <span className="ss-setup-fields__toggle-track" aria-hidden />
          </button>
        </div>

        {includeSpouse ? (
          <div className="ss-setup-fields__spouse-panel">
            <div className="config-plan-field planning-profile-fields__dob ss-setup-fields__spouse-dob">
              <span className="config-plan-label">Spouse date of birth</span>
              <DateOfBirthSelects
                value={spouseDob}
                onChange={onSpouseDobChange}
                includeDay={false}
              />
              {!spouseDobComplete ? (
                <p className="ss-setup-fields__spouse-dob-prompt">
                  Enter your spouse&apos;s date of birth to continue.
                </p>
              ) : null}
            </div>

            {spouseDobComplete ? (
              <>
                {spouseScenario === "under-62" ? (
                  <p className="ss-setup-fields__spouse-scenario-note">
                    Your spouse won&apos;t be 62 yet when you file at{" "}
                    {ssAgeClamped}.
                  </p>
                ) : (
                  <>
                    <div className="ss-setup-fields__spouse-block">
                      <span
                        className="config-plan-label"
                        id="ss-setup-spouse-claim-mode-label"
                      >
                        {hints.spouseClaimModeQuestionLabel}
                      </span>
                      <SpouseClaimModeSegment
                        value={spouseClaimMode}
                        onChange={handleSpouseClaimModeChange}
                        spousalHint={hints.spouseClaimModeTooltip}
                      />
                    </div>

                    {spouseScenario === "manual-benefit" ? (
                      <div className="ss-setup-fields__spouse-manual-benefit">
                        <p className="ss-setup-fields__spouse-scenario-note">
                          {spouseAgeNow != null && spouseAgeNow > claimMax
                            ? "Your spouse has already passed the maximum claiming age."
                            : "Your spouse is already past the age when they would claim with your filing plan."}
                        </p>
                        <CurrencyAmountInput
                          id="ss-setup-spouse-benefit-manual"
                          label="Their current monthly SS benefit"
                          value={
                            spouseBenefitMonthly > 0
                              ? spouseManualBenefitDisplay
                              : 0
                          }
                          onChange={(amount) =>
                            onSpouseBenefitMonthlyChange(
                              monthlyAt67FromBenefitAtClaimAge(
                                amount,
                                Math.min(spouseAgeNow ?? claimMax, claimMax),
                              ),
                            )
                          }
                          externalPrefix
                          showFillState={showFillState}
                        />
                      </div>
                    ) : null}

                    {spouseScenario === "claimable" ? (
                      <ClaimBenefitRow
                        claimLabel={claimAtAgeLabel(
                          hints.spouseClaimQuestionLabel,
                          spouseSsAgeClamped,
                        )}
                        claimControl={
                          <>
                            <ClaimAgeSlider
                              value={spouseSsAgeClamped}
                              onChange={handleSpouseAgeChange}
                              ariaLabel={claimAtAgeLabel(
                                hints.spouseClaimQuestionLabel,
                                spouseSsAgeClamped,
                              )}
                              claimAgeMin={spouseClaimMin}
                              claimAgeMax={claimMax}
                              milestoneAges={milestones}
                            />
                            {spouseClaimMode === "spousal" &&
                            userClaimYearValue != null ? (
                              <p className="ss-setup-fields__spouse-claim-guardrail">
                                Your spouse can&apos;t receive spousal benefits
                                until you file in {userClaimYearValue}, when
                                they&apos;ll be {spouseSpousalMinAge}.
                              </p>
                            ) : null}
                          </>
                        }
                        benefitField={
                          spouseClaimMode === "spousal" ? (
                            <SpouseReadOnlyBenefitDisplay
                              label={hints.spouseBenefitFieldLabel}
                              amount={spouseSpousalBenefitDisplay}
                            />
                          ) : (
                            <CurrencyAmountInput
                              id="ss-setup-spouse-benefit"
                              label={hints.spouseBenefitFieldLabel}
                              value={spouseBenefitAtClaimAge}
                              onChange={(amount) =>
                                onSpouseBenefitMonthlyChange(
                                  monthlyAt67FromBenefitAtClaimAge(
                                    amount,
                                    spouseSsAgeClamped,
                                  ),
                                )
                              }
                              externalPrefix
                              showFillState={showFillState}
                            />
                          )
                        }
                      />
                    ) : null}
                  </>
                )}
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
