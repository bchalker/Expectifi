import { useEffect, useMemo, useState } from 'react'
import { IconCheck } from '@tabler/icons-react'
import {
  WELCOME_PLANNING_HINTS,
  WELCOME_PLANNING_PLACEHOLDERS,
} from '../lib/welcomePlanningFieldCopy'
import { clampTargetRetirementAge, retireAgeBoundsForDob } from '../lib/userPrefs'
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
  dateOfBirth?: string
  centered?: boolean
  showFillState?: boolean
  className?: string
}

export function WelcomeGoalStepFields({
  monthlyGoal,
  onMonthlyGoalChange,
  retireAge,
  onRetireAgeChange,
  dateOfBirth = '',
  centered = false,
  showFillState = false,
  className,
}: Props) {
  const [ageFocused, setAgeFocused] = useState(false)
  const [ageDraft, setAgeDraft] = useState('')
  const bounds = useMemo(() => retireAgeBoundsForDob(dateOfBirth), [dateOfBirth])

  useEffect(() => {
    if (ageFocused) return
    setAgeDraft(retireAge > 0 ? String(retireAge) : '')
  }, [retireAge, ageFocused])

  const retireAgeFilled = Number.isFinite(retireAge) && retireAge > 0
  const ageDisplay = ageFocused ? ageDraft : retireAge > 0 ? String(retireAge) : ''

  const commitRetireAgeDraft = () => {
    const raw = ageDraft.trim()
    if (!raw) {
      const fallback = retireAge > 0 ? retireAge : bounds.min
      onRetireAgeChange(clampTargetRetirementAge(fallback, dateOfBirth))
      setAgeDraft(String(clampTargetRetirementAge(fallback, dateOfBirth)))
      return
    }
    const next = clampTargetRetirementAge(parseNum(raw), dateOfBirth)
    onRetireAgeChange(next)
    setAgeDraft(String(next))
  }

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
            inputMode="numeric"
            className="onboarding-field-shell__input welcome-goal-fields__age-input"
            value={ageDisplay}
            min={bounds.min}
            max={bounds.max}
            aria-valuemin={bounds.min}
            aria-valuemax={bounds.max}
            aria-valuenow={retireAge > 0 ? retireAge : undefined}
            onFocus={() => {
              setAgeFocused(true)
              setAgeDraft(retireAge > 0 ? String(retireAge) : '')
            }}
            onChange={(e) => setAgeDraft(e.target.value.replace(/[^\d]/g, ''))}
            onBlur={() => {
              setAgeFocused(false)
              commitRetireAgeDraft()
            }}
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
