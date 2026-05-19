import { ClaimAgeSlider } from './ClaimAgeSlider'
import { DateOfBirthSelects } from './DateOfBirthSelects'
import { SpouseClaimModeSegment, type SpouseClaimMode } from './SpouseClaimModeSegment'
import { CurrencyAmountInput } from './ui/CurrencyAmountInput'
import './SocialSecuritySetupFields.scss'
import './ClaimAgeSlider.scss'
import './SpouseClaimModeSegment.scss'
import './ui/CurrencyAmountInput.scss'
import './OnboardingFieldShell.scss'

const DEFAULT_HINTS = {
  ssBenefit:
    'Your estimated monthly benefit at your chosen claiming age. The average at 67 is around $1,800 — ssa.gov has a free estimator if you want your exact number.',
  ssClaimAge:
    'Claiming earlier means a smaller monthly check; waiting until 70 increases it. There is no single right answer — pick what fits your plan.',
  includeSpouse: 'Include your spouse to factor in their Social Security alongside yours.',
  spouseClaimModeTooltip:
    "Social Security pays whichever is higher — your spouse's own earned benefit or 50% of yours. Choose spousal benefit if your spouse had lower lifetime earnings.",
} as const

export type SocialSecuritySetupHints = Partial<typeof DEFAULT_HINTS>

type Props = {
  includeSs: boolean
  onIncludeSsChange: (value: boolean) => void
  ssAge: number
  onSsAgeChange: (age: number) => void
  ssBenefitMonthly: number
  onSsBenefitMonthlyChange: (amount: number) => void
  dateOfBirth: string
  includeSpouse: boolean
  onIncludeSpouseChange: (value: boolean) => void
  spouseClaimMode: SpouseClaimMode
  onSpouseClaimModeChange: (mode: SpouseClaimMode) => void
  spouseDob: string
  onSpouseDobChange: (iso: string) => void
  spouseSsAge: number
  onSpouseSsAgeChange: (age: number) => void
  spouseBenefitMonthly: number
  onSpouseBenefitMonthlyChange: (amount: number) => void
  hints?: SocialSecuritySetupHints
  showFillState?: boolean
  className?: string
}

export function SocialSecuritySetupFields({
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
  className,
}: Props) {
  const hints = { ...DEFAULT_HINTS, ...hintsProp }
  const ssFieldsActive = includeSs
  const spouseBenefitDisplay =
    spouseClaimMode === 'spousal' ? Math.round(ssBenefitMonthly * 0.5) : spouseBenefitMonthly

  return (
    <div className={['ss-setup-fields', className].filter(Boolean).join(' ')}>
      <div className="ss-setup-fields__section ss-setup-fields__section--ss-toggle">
        <div className="ss-setup-fields__toggle-row">
          <span className="config-plan-label" id="ss-setup-include-ss-label">
            Include Social Security
          </span>
          <button
            type="button"
            role="switch"
            aria-labelledby="ss-setup-include-ss-label"
            aria-checked={includeSs}
            className={`ss-setup-fields__toggle${includeSs ? ' ss-setup-fields__toggle--on' : ''}`}
            onClick={() => onIncludeSsChange(!includeSs)}
          >
            <span className="ss-setup-fields__toggle-track" aria-hidden />
          </button>
        </div>
      </div>

      <div className={`ss-setup-fields__fields${includeSs ? '' : ' ss-setup-fields__fields--disabled'}`}>
        <div className="ss-setup-fields__claim-row">
          <div className="config-plan-field">
            <span className="config-plan-label">When do you plan to claim Social Security?</span>
            <ClaimAgeSlider
              value={ssAge}
              onChange={onSsAgeChange}
              ariaLabel="Your Social Security claiming age"
              dateOfBirth={dateOfBirth}
              disabled={!includeSs}
            />
            <p className="ss-setup-fields__hint">{hints.ssClaimAge}</p>
          </div>
          <CurrencyAmountInput
            id="ss-setup-user-benefit"
            label={`Expected benefit at ${ssAge}`}
            value={ssBenefitMonthly}
            onChange={onSsBenefitMonthlyChange}
            hint={hints.ssBenefit}
            disabled={!includeSs}
            externalPrefix
            showFillState={showFillState}
          />
        </div>

        <div className="ss-setup-fields__section ss-setup-fields__section--spouse">
          <div className="ss-setup-fields__toggle-row">
            <span className="config-plan-label" id="ss-setup-include-spouse-label">
              Include my spouse
            </span>
            <button
              type="button"
              role="switch"
              aria-labelledby="ss-setup-include-spouse-label"
              aria-checked={includeSpouse}
              disabled={!ssFieldsActive}
              className={`ss-setup-fields__toggle${includeSpouse ? ' ss-setup-fields__toggle--on' : ''}`}
              onClick={() => onIncludeSpouseChange(!includeSpouse)}
            >
              <span className="ss-setup-fields__toggle-track" aria-hidden />
            </button>
          </div>
          <p className="ss-setup-fields__hint">{hints.includeSpouse}</p>

          {includeSpouse ? (
            <div className="ss-setup-fields__spouse-fields">
              <span className="config-plan-label" id="ss-setup-spouse-claim-mode-label">
                How will your spouse claim Social Security?
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
                  <span className="config-plan-label">When will your spouse claim Social Security?</span>
                  <ClaimAgeSlider
                    value={spouseSsAge}
                    onChange={onSpouseSsAgeChange}
                    ariaLabel="Spouse Social Security claiming age"
                    dateOfBirth={spouseDob}
                    disabled={!ssFieldsActive}
                  />
                </div>
                <CurrencyAmountInput
                  id="ss-setup-spouse-benefit"
                  label={`Expected benefit at ${spouseSsAge}`}
                  value={spouseBenefitDisplay}
                  onChange={onSpouseBenefitMonthlyChange}
                  readOnly={spouseClaimMode === 'spousal'}
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
  )
}
