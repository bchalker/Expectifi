import { IconCheck } from '@tabler/icons-react'
import {
  WELCOME_PLANNING_HINTS,
  WELCOME_PLANNING_PLACEHOLDERS,
} from '../lib/welcomePlanningFieldCopy'
import { parseNum } from '../utils/format'
import { CurrencyAmountInput } from './ui/CurrencyAmountInput'
import './WelcomeGoalStepFields.scss'
import './ui/CurrencyAmountInput.scss'
import './OnboardingFieldShell.scss'

type Props = {
  monthlyGoal: number
  onMonthlyGoalChange: (amount: number) => void
  retireAge: number
  onRetireAgeChange: (age: number) => void
  centered?: boolean
  showFillState?: boolean
  className?: string
}

export function WelcomeGoalStepFields({
  monthlyGoal,
  onMonthlyGoalChange,
  retireAge,
  onRetireAgeChange,
  centered = false,
  showFillState = false,
  className,
}: Props) {
  const retireAgeFilled = Number.isFinite(retireAge) && retireAge > 0

  return (
    <div
      className={[
        'welcome-goal-fields',
        centered ? 'welcome-goal-fields--centered' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <CurrencyAmountInput
        id="welcome-planning-monthly-goal"
        className="welcome-goal-fields__goal-input"
        label="What would you like retirement to look like?"
        value={monthlyGoal}
        onChange={onMonthlyGoalChange}
        placeholder={WELCOME_PLANNING_PLACEHOLDERS.monthlyIncomeGoal}
        externalPrefix
        externalSuffix="/mo"
        hint={WELCOME_PLANNING_HINTS.monthlyIncomeGoal}
        showFillState={showFillState}
      />
      <div className="config-plan-field welcome-goal-fields__retire-age">
        <label className="config-plan-label" htmlFor="welcome-planning-retire-age">
          ...and when would you like to retire?
        </label>
        <div
          className={[
            'onboarding-field-shell',
            'welcome-goal-fields__age-input-wrap',
            retireAgeFilled ? 'onboarding-field-shell--filled' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <input
            id="welcome-planning-retire-age"
            type="text"
            inputMode="decimal"
            className="onboarding-field-shell__input welcome-goal-fields__age-input"
            value={String(retireAge)}
            onChange={(e) => onRetireAgeChange(Math.round(parseNum(e.target.value)))}
          />
          {retireAgeFilled ? (
            <span className="onboarding-field-shell__check" aria-hidden>
              <IconCheck size={14} strokeWidth={2} />
            </span>
          ) : null}
        </div>
        <p className="welcome-goal-fields__hint">{WELCOME_PLANNING_HINTS.targetRetirementAge}</p>
      </div>
    </div>
  )
}
