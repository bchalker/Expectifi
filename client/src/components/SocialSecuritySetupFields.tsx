import { useMemo, type ReactNode } from "react";
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
import "./SocialSecuritySetupFields.scss";
import "./ClaimAgeSlider.scss";
import "./SpouseClaimModeSegment.scss";
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
>;

type Props = {
  locale?: OnboardingRegionId | string | null;
  includeSs: boolean;
  onIncludeSsChange: (value: boolean) => void;
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

export function SocialSecuritySetupFields({
  locale,
  includeSs,
  onIncludeSsChange,
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
  showFillState = false,
  userBenefitError,
  claimAgeMilestoneTicks,
  className,
}: Props) {
  const base = pensionConfigForLocale(locale);
  const hints = {
    includeToggleLabel: hintsProp?.includeToggleLabel ?? base.includeToggleLabel,
    claimQuestionLabel: hintsProp?.claimQuestionLabel ?? base.claimQuestionLabel,
    spouseClaimQuestionLabel:
      hintsProp?.spouseClaimQuestionLabel ?? base.spouseClaimQuestionLabel,
    spouseClaimModeQuestionLabel:
      hintsProp?.spouseClaimModeQuestionLabel ?? base.spouseClaimModeQuestionLabel,
    benefitHint: hintsProp?.benefitHint ?? base.benefitHint,
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
  const spouseSsAgeClamped = clampClaimAgeInRange(spouseSsAge, claimMin, claimMax);

  const ssFieldsActive = includeSs;
  const ssBenefitInputValue = benefitAtClaimAgeFromMonthlyAt67(
    ssBenefitMonthly,
    ssAgeClamped,
  );
  const spouseBenefitAtClaimAge = useMemo(
    () => benefitAtClaimAgeFromMonthlyAt67(spouseBenefitMonthly, spouseSsAgeClamped),
    [spouseBenefitMonthly, spouseSsAgeClamped],
  );
  const spouseBenefitDisplay =
    spouseClaimMode === "spousal"
      ? Math.round(
          benefitAtClaimAgeFromMonthlyAt67(ssBenefitMonthly, spouseSsAgeClamped) * 0.5,
        )
      : spouseBenefitAtClaimAge;

  return (
    <div className={["ss-setup-fields", className].filter(Boolean).join(" ")}>
      <div className="ss-setup-fields__section ss-setup-fields__section--ss-toggle">
        <div className="ss-setup-fields__toggle-row">
          <span className="config-plan-label" id="ss-setup-include-ss-label">
            {hints.includeToggleLabel}
          </span>
          <button
            type="button"
            role="switch"
            aria-labelledby="ss-setup-include-ss-label"
            aria-checked={includeSs}
            className={`ss-setup-fields__toggle${includeSs ? " ss-setup-fields__toggle--on" : ""}`}
            onClick={() => onIncludeSsChange(!includeSs)}
          >
            <span className="ss-setup-fields__toggle-track" aria-hidden />
          </button>
        </div>
      </div>

      <div
        className={`ss-setup-fields__fields${includeSs ? "" : " ss-setup-fields__fields--disabled"}`}
      >
        <div className="ss-setup-fields__claim-row">
          <div className="config-plan-field">
            <span className="config-plan-label">{hints.claimQuestionLabel}</span>
            <ClaimAgeSlider
              value={ssAgeClamped}
              onChange={onSsAgeChange}
              ariaLabel={hints.claimQuestionLabel}
              dateOfBirth={dateOfBirth}
              disabled={!includeSs}
              claimAgeMin={claimMin}
              claimAgeMax={claimMax}
              milestoneAges={milestones}
            />
            <p className="ss-setup-fields__hint">{hints.claimAgeHint}</p>
          </div>
          <CurrencyAmountInput
            id="ss-setup-user-benefit"
            label={`Expected benefit at ${ssAgeClamped}`}
            value={ssBenefitInputValue}
            onChange={(amount) =>
              onSsBenefitMonthlyChange(
                monthlyAt67FromBenefitAtClaimAge(amount, ssAgeClamped),
              )
            }
            hint={pensionBenefitHint(hints.benefitHint, base.benefitHintLinkUrl)}
            averageBadge={hints.averageBadge}
            disabled={!includeSs}
            externalPrefix
            showFillState={showFillState}
            error={userBenefitError}
            errorVariant="label"
          />
        </div>

        <div className="ss-setup-fields__section ss-setup-fields__section--spouse">
          <div className="ss-setup-fields__toggle-row">
            <span
              className="config-plan-label"
              id="ss-setup-include-spouse-label"
            >
              Include my spouse
            </span>
            <button
              type="button"
              role="switch"
              aria-labelledby="ss-setup-include-spouse-label"
              aria-checked={includeSpouse}
              disabled={!ssFieldsActive}
              className={`ss-setup-fields__toggle${includeSpouse ? " ss-setup-fields__toggle--on" : ""}`}
              onClick={() => onIncludeSpouseChange(!includeSpouse)}
            >
              <span className="ss-setup-fields__toggle-track" aria-hidden />
            </button>
          </div>
          <p className="ss-setup-fields__hint">{hints.includeSpouseHint}</p>

          {includeSpouse ? (
            <div className="ss-setup-fields__spouse-fields">
              <span
                className="config-plan-label"
                id="ss-setup-spouse-claim-mode-label"
              >
                {hints.spouseClaimModeQuestionLabel}
              </span>
              <SpouseClaimModeSegment
                value={spouseClaimMode}
                onChange={onSpouseClaimModeChange}
                spousalHint={hints.spouseClaimModeTooltip}
                disabled={!ssFieldsActive}
              />

              <div className="config-plan-field planning-profile-fields__dob">
                <span className="config-plan-label">Spouse date of birth</span>
                <DateOfBirthSelects
                  value={spouseDob}
                  onChange={onSpouseDobChange}
                  includeDay={false}
                />
              </div>

              <div className="ss-setup-fields__claim-row">
                <div className="config-plan-field">
                  <span className="config-plan-label">
                    {hints.spouseClaimQuestionLabel}
                  </span>
                  <ClaimAgeSlider
                    value={spouseSsAgeClamped}
                    onChange={onSpouseSsAgeChange}
                    ariaLabel={hints.spouseClaimQuestionLabel}
                    dateOfBirth={spouseDob}
                    disabled={!ssFieldsActive}
                    claimAgeMin={claimMin}
                    claimAgeMax={claimMax}
                    milestoneAges={milestones}
                  />
                </div>
                <CurrencyAmountInput
                  id="ss-setup-spouse-benefit"
                  label={`Expected benefit at ${spouseSsAgeClamped}`}
                  value={spouseBenefitDisplay}
                  onChange={(amount) =>
                    onSpouseBenefitMonthlyChange(
                      monthlyAt67FromBenefitAtClaimAge(amount, spouseSsAgeClamped),
                    )
                  }
                  readOnly={spouseClaimMode === "spousal"}
                  disabled={!ssFieldsActive}
                  externalPrefix
                  showFillState={showFillState}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
