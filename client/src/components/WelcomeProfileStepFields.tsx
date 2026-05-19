import { isValidIsoDateString } from '../lib/ageFromDob'
import {
  WELCOME_PLANNING_HINTS,
  WELCOME_PLANNING_PLACEHOLDERS,
} from '../lib/welcomePlanningFieldCopy'
import { DateOfBirthSelects, DobAgeToday } from './DateOfBirthSelects'
import { CurrencyAmountInput } from './ui/CurrencyAmountInput'
import './WelcomeProfileStepFields.scss'
import './ui/CurrencyAmountInput.scss'
import './OnboardingFieldShell.scss'

type Props = {
  dateOfBirth: string
  onDateOfBirth: (iso: string) => void
  householdIncome: number
  onHouseholdIncome: (amount: number) => void
  monthlyContribution: number
  onMonthlyContribution: (amount: number) => void
  showFillState?: boolean
  className?: string
}

export function WelcomeProfileStepFields({
  dateOfBirth,
  onDateOfBirth,
  householdIncome,
  onHouseholdIncome,
  monthlyContribution,
  onMonthlyContribution,
  showFillState = false,
  className,
}: Props) {
  const dobOk = isValidIsoDateString(dateOfBirth)

  return (
    <div className={['welcome-profile-fields', className].filter(Boolean).join(' ')}>
      <div className="welcome-profile-fields__section">
        <div className="config-plan-field planning-profile-fields__dob">
          <span className="config-plan-label">When were you born?</span>
          <div className="planning-profile-fields__dob-inline">
            <DateOfBirthSelects value={dateOfBirth} onChange={onDateOfBirth} includeDay={false} />
            {dobOk ? <DobAgeToday key={dateOfBirth} iso={dateOfBirth} /> : null}
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
    </div>
  )
}
