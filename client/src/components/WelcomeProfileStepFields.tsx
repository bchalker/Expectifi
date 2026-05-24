import { ListBox, Select } from '@heroui/react'
import { isValidIsoDateString } from '../lib/ageFromDob'
import { firstKeyFromSelectSelection } from '../lib/dateOfBirthSelect'
import {
  isOnboardingResidenceCountry,
  ONBOARDING_RESIDENCE_COUNTRIES,
} from '../lib/onboardingResidenceCountries'
import { residenceCountryToDisplayCurrency } from '../lib/displayCurrency'
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
  currentResidence?: string
  onCurrentResidence?: (country: string) => void
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
  dateOfBirth,
  onDateOfBirth,
  currentResidence,
  onCurrentResidence,
  householdIncome,
  onHouseholdIncome,
  monthlyContribution,
  onMonthlyContribution,
  ageToday,
  showFillState = false,
  className,
}: Props) {
  const dobOk = isValidIsoDateString(dateOfBirth)
  const showResidence = onCurrentResidence != null
  const residenceSelected = (currentResidence ?? '').length > 0
  const residenceValid = residenceSelected && isOnboardingResidenceCountry(currentResidence ?? '')
  const planCurrency = residenceValid
    ? residenceCountryToDisplayCurrency(currentResidence!)
    : null

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

      {showResidence ? (
        <div className="welcome-profile-fields__section welcome-profile-fields__section--residence">
          <div className="config-plan-field welcome-profile-fields__residence-field">
            <span className="config-plan-label" id="welcome-profile-residence-label">
              Where do you currently live
            </span>
            <Select
              className={[
                'welcome-profile-fields__residence-select',
                residenceSelected ? 'welcome-profile-fields__residence-select--filled' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              variant="secondary"
              placeholder="Select country"
              aria-labelledby="welcome-profile-residence-label"
              selectedKey={residenceSelected ? currentResidence : null}
              onSelectionChange={(keys) => {
                const country = firstKeyFromSelectSelection(keys)
                if (country) onCurrentResidence?.(String(country))
              }}
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover
                placement="bottom start"
                className="app-select-import-menu__popover welcome-profile-fields__residence-popover"
              >
                <ListBox className="app-select-import-menu__list welcome-profile-fields__residence-list">
                  {ONBOARDING_RESIDENCE_COUNTRIES.map((country) => (
                    <ListBox.Item key={country} id={country} textValue={country}>
                      {country}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
            <p className="welcome-profile-fields__hint">
              {planCurrency ? (
                <>
                  <strong className="welcome-profile-fields__currency-note">
                    Your plan will be shown in {planCurrency}.
                  </strong>{' '}
                </>
              ) : null}
              Retirement looks different depending on where you&apos;re starting from. Whether
              you&apos;re in Tampa or Turin, we&apos;ll tailor your plan to your local rules,
              currency, and options.
            </p>
          </div>
        </div>
      ) : null}

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
