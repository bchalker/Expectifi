import { isValidIsoDateString } from '../lib/ageFromDob'
import type { OnboardingRegionId } from '../lib/onboardingRegions'
import {
  WELCOME_PLANNING_HINTS,
  WELCOME_PLANNING_PLACEHOLDERS,
} from '../lib/welcomePlanningFieldCopy'
import { DateOfBirthSelects, DobAgeToday } from './DateOfBirthSelects'
import { OnboardingRegionStep } from './OnboardingRegionStep'
import { CurrencyAmountInput } from './ui/CurrencyAmountInput'
import './WelcomeProfileStepFields.scss'
import './ui/CurrencyAmountInput.scss'
import './OnboardingFieldShell.scss'
import './OnboardingRegionStep.scss'

type Props = {
  regionId: OnboardingRegionId | null | undefined
  onRegionSelect: (regionId: OnboardingRegionId) => void
  dateOfBirth: string
  onDateOfBirth: (iso: string) => void
  householdIncome: number
  onHouseholdIncome: (amount: number) => void
  monthlyContribution: number
  onMonthlyContribution: (amount: number) => void
  /** Whole years; when set, shows accumulation callout above footer. */
  ageToday?: number | null
  showFillState?: boolean
  className?: string
}

export function WelcomeProfileStepFields({
  regionId,
  onRegionSelect,
  dateOfBirth,
  onDateOfBirth,
  householdIncome,
  onHouseholdIncome,
  monthlyContribution,
  onMonthlyContribution,
  ageToday,
  showFillState = false,
  className,
}: Props) {
  const dobOk = isValidIsoDateString(dateOfBirth)

  return (
    <div className={['welcome-profile-fields', className].filter(Boolean).join(' ')}>
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
          <p className="welcome-profile-fields__hint">
            Expectifi is built for savers in the United States and Canada. Your country sets tax
            rules, pension labels, and bank linking via Plaid.
          </p>
        </div>
      </div>

      <div className="welcome-profile-fields__section">
        <div className="config-plan-field planning-profile-fields__dob">
          <span className="config-plan-label">When were you born?</span>
          <div className="planning-profile-fields__dob-inline">
            <DateOfBirthSelects value={dateOfBirth} onChange={onDateOfBirth} includeDay={false} />
            <div
              className="planning-profile-fields__dob-age-slot"
              aria-hidden={!dobOk}
            >
              {dobOk ? <DobAgeToday key={dateOfBirth} iso={dateOfBirth} /> : null}
            </div>
          </div>
          <p className="welcome-profile-fields__hint">{WELCOME_PLANNING_HINTS.dob}</p>
        </div>
      </div>

      <div className="welcome-profile-fields__grid">
        <CurrencyAmountInput
          id="welcome-planning-household-income"
          label="Household income"
          value={householdIncome}
          onChange={onHouseholdIncome}
          placeholder={WELCOME_PLANNING_PLACEHOLDERS.householdIncome}
          hint={WELCOME_PLANNING_HINTS.householdIncome}
          externalPrefix
          showFillState={showFillState}
        />
        <CurrencyAmountInput
          id="welcome-planning-monthly-contribution"
          label="Monthly contribution"
          value={monthlyContribution}
          onChange={onMonthlyContribution}
          placeholder={WELCOME_PLANNING_PLACEHOLDERS.monthlyContribution}
          showAnnualEquivalent
          hint={WELCOME_PLANNING_HINTS.monthlyContribution}
          externalPrefix
          showFillState={showFillState}
        />
      </div>

      {ageToday != null ? (
        <aside className="welcome-profile-fields__callout" aria-live="polite">
          <p className="welcome-profile-fields__callout-text">
            At {ageToday}, you&apos;re in the prime accumulation window. Most financial planners target
            10x your salary saved by retirement age.
          </p>
        </aside>
      ) : null}
    </div>
  )
}
