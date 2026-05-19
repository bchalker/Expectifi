import { useEffect, useMemo } from 'react'
import { ageFromIsoDateString, isValidIsoDateString } from '../lib/ageFromDob'
import { fmt } from '../utils/format'
import { CurrencyAmountInput } from './ui/CurrencyAmountInput'
import { DateOfBirthSelects, DobAgeToday } from './DateOfBirthSelects'
import { WelcomeGoalStepFields } from './WelcomeGoalStepFields'
import { WelcomeProfileStepFields } from './WelcomeProfileStepFields'
import './ui/CurrencyAmountInput.scss'
import './WelcomeProfileStepFields.scss'
import './WelcomeGoalStepFields.scss'
import './ConfigDrawerBody.scss'
import './PlanningProfileFields.scss'

const RETIRE_AGE_MAX = 80
const ANNUAL_SAVE_MAX = 60_000
const ANNUAL_SAVE_STEP = 500

function retireAgeBounds(dateOfBirth: string): { min: number; max: number } {
  if (!isValidIsoDateString(dateOfBirth)) {
    return { min: 50, max: RETIRE_AGE_MAX }
  }
  const at = ageFromIsoDateString(dateOfBirth)
  if (at < 18 || at > 100) {
    return { min: 50, max: RETIRE_AGE_MAX }
  }
  return { min: Math.max(50, at + 1), max: RETIRE_AGE_MAX }
}

function clampTargetRetirementAge(age: number, dateOfBirth: string): number {
  const n = Math.round(age)
  if (!Number.isFinite(n)) return 62
  if (!isValidIsoDateString(dateOfBirth)) {
    return Math.min(RETIRE_AGE_MAX, Math.max(50, n))
  }
  const at = ageFromIsoDateString(dateOfBirth)
  if (at < 18 || at > 100) return Math.min(RETIRE_AGE_MAX, Math.max(50, n))
  const lo = Math.max(50, at + 1)
  return Math.min(RETIRE_AGE_MAX, Math.max(lo, n))
}

export type PlanningProfileVariant = 'import-manual' | 'configure' | 'welcome'

type SharedProps = {
  variant: PlanningProfileVariant
  dateOfBirth: string
  onDateOfBirth: (iso: string) => void
  targetRetirementAge: number
  onTargetRetirementAge: (age: number) => void
  className?: string
}

type ImportManualProps = SharedProps & {
  variant: 'import-manual'
  annualSave: number
  onAnnualSave: (amount: number) => void
}

type ConfigureProps = SharedProps & {
  variant: 'configure'
  householdIncome: number
  onHouseholdIncome: (amount: number) => void
  monthlyContribution: number
  onMonthlyContribution: (amount: number) => void
  monthlyIncomeGoal: number
  onMonthlyIncomeGoal: (amount: number) => void
}

type WelcomeProps = SharedProps & {
  variant: 'welcome'
  monthlyIncomeGoal: number
  onMonthlyIncomeGoal: (amount: number) => void
}

export type PlanningProfileFieldsProps = ImportManualProps | ConfigureProps | WelcomeProps

export function PlanningProfileFields(props: PlanningProfileFieldsProps) {
  const { variant, dateOfBirth, onDateOfBirth, targetRetirementAge, onTargetRetirementAge, className } = props
  const retireBounds = useMemo(() => retireAgeBounds(dateOfBirth), [dateOfBirth])

  useEffect(() => {
    if (variant !== 'configure' && variant !== 'import-manual') return
    const next = clampTargetRetirementAge(targetRetirementAge, dateOfBirth)
    if (next !== targetRetirementAge) onTargetRetirementAge(next)
    // Only re-clamp when DOB changes — not on each retirement-age keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- targetRetirementAge read at DOB change time
  }, [dateOfBirth, onTargetRetirementAge, variant])

  const dobOk = isValidIsoDateString(dateOfBirth)
  const retireUnset = targetRetirementAge < retireBounds.min
  const retireSliderValue = retireUnset
    ? retireBounds.min
    : clampTargetRetirementAge(targetRetirementAge, dateOfBirth)

  const rootClass = ['planning-profile-fields', className].filter(Boolean).join(' ')

  if (variant === 'configure') {
    return (
      <div className={rootClass}>
        <WelcomeProfileStepFields
          dateOfBirth={dateOfBirth}
          onDateOfBirth={onDateOfBirth}
          householdIncome={props.householdIncome}
          onHouseholdIncome={props.onHouseholdIncome}
          monthlyContribution={props.monthlyContribution}
          onMonthlyContribution={props.onMonthlyContribution}
        />
        <hr className="planning-profile-fields__divider" aria-hidden />
        <WelcomeGoalStepFields
          monthlyGoal={props.monthlyIncomeGoal}
          onMonthlyGoalChange={props.onMonthlyIncomeGoal}
          retireAge={targetRetirementAge}
          onRetireAgeChange={onTargetRetirementAge}
        />
      </div>
    )
  }

  return (
    <div className={rootClass}>
      <div className="config-plan-field planning-profile-fields__dob">
        <span className="config-plan-label">When were you born?</span>
        <div className="planning-profile-fields__dob-inline">
          <DateOfBirthSelects value={dateOfBirth} onChange={onDateOfBirth} includeDay={false} />
          {dobOk ? <DobAgeToday key={dateOfBirth} iso={dateOfBirth} /> : null}
        </div>
      </div>
      <hr className="planning-profile-fields__divider" aria-hidden />
      <div className="planning-profile-fields__row-duo">
        <div className="config-plan-field config-plan-field--retire">
          <span className="config-plan-label" id="planning-profile-retire-age-label">
            When would you like to retire?
          </span>
          {variant === 'welcome' && !dobOk ? (
            <span className="config-plan-age-hint">Set your date of birth first.</span>
          ) : (
            <div className="config-plan-savings-row">
              <span className="config-plan-saveval config-plan-saveval--age">
                {retireUnset ? '—' : retireSliderValue}
              </span>
              <input
                type="range"
                className="config-plan-savings-slider"
                min={retireBounds.min}
                max={retireBounds.max}
                step={1}
                value={retireSliderValue}
                disabled={variant === 'welcome' && !dobOk}
                onChange={(e) =>
                  onTargetRetirementAge(clampTargetRetirementAge(Number(e.target.value), dateOfBirth))
                }
                aria-labelledby="planning-profile-retire-age-label"
                aria-valuemin={retireBounds.min}
                aria-valuemax={retireBounds.max}
                aria-valuenow={retireSliderValue}
              />
            </div>
          )}
        </div>
        {variant === 'import-manual' ? (
          <div className="config-plan-field config-plan-field--savings">
            <span className="config-plan-label" id="planning-profile-annual-save-label">
              Annual contributions
            </span>
            <div className="config-plan-savings-row">
              <span className="config-plan-saveval">{fmt(props.annualSave)}</span>
              <input
                type="range"
                className="config-plan-savings-slider"
                min={0}
                max={ANNUAL_SAVE_MAX}
                step={ANNUAL_SAVE_STEP}
                value={props.annualSave}
                onChange={(e) =>
                  props.onAnnualSave(Math.round(Number(e.target.value) / ANNUAL_SAVE_STEP) * ANNUAL_SAVE_STEP)
                }
                aria-labelledby="planning-profile-annual-save-label"
                aria-valuemin={0}
                aria-valuemax={ANNUAL_SAVE_MAX}
                aria-valuenow={props.annualSave}
              />
            </div>
          </div>
        ) : null}
        {variant === 'welcome' ? (
          <CurrencyAmountInput
            id="planning-profile-welcome-monthly-goal"
            label="Monthly income goal in retirement"
            value={props.monthlyIncomeGoal}
            onChange={props.onMonthlyIncomeGoal}
            showAnnualEquivalent
          />
        ) : null}
      </div>
    </div>
  )
}
