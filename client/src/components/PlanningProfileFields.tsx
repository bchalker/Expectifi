import { useEffect } from 'react'
import { ageFromIsoDateString, isValidIsoDateString } from '../lib/ageFromDob'
import { fmt, fmtInput, parseNum } from '../utils/format'
import { DateOfBirthSelects, DobAgeToday } from './DateOfBirthSelects'
import './ConfigDrawerBody.scss'
import './PlanningProfileFields.scss'

const RETIRE_AGE_MAX = 80
const MONTHLY_GOAL_SLIDER_MAX = 100_000
const MONTHLY_GOAL_SLIDER_STEP = 100
const ANNUAL_SAVE_MAX = 60_000
const ANNUAL_SAVE_STEP = 500

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
  monthlyIncomeGoal: number
  onMonthlyIncomeGoal: (amount: number) => void
  annualSave: number
  onAnnualSave: (amount: number) => void
}

type WelcomeProps = SharedProps & {
  variant: 'welcome'
  monthlyIncomeGoal: number
  onMonthlyIncomeGoal: (amount: number) => void
}

export type PlanningProfileFieldsProps = ImportManualProps | ConfigureProps | WelcomeProps

export function PlanningProfileFields(props: PlanningProfileFieldsProps) {
  const { variant, dateOfBirth, onDateOfBirth, targetRetirementAge, onTargetRetirementAge, className } = props

  useEffect(() => {
    if (!isValidIsoDateString(dateOfBirth)) return
    const at = ageFromIsoDateString(dateOfBirth)
    if (at < 18 || at > 100) return
    const lo = Math.max(50, at + 1)
    const next = Math.min(RETIRE_AGE_MAX, Math.max(lo, targetRetirementAge))
    if (next !== targetRetirementAge) onTargetRetirementAge(next)
  }, [dateOfBirth, onTargetRetirementAge, targetRetirementAge])

  const dobOk = isValidIsoDateString(dateOfBirth)
  const ageToday = dobOk ? ageFromIsoDateString(dateOfBirth) : null

  const rootClass = ['planning-profile-fields', className].filter(Boolean).join(' ')

  return (
    <div className={rootClass}>
      <div className="config-plan-field planning-profile-fields__dob">
        <span className="config-plan-label">When were you born?</span>
        <DateOfBirthSelects value={dateOfBirth} onChange={onDateOfBirth} />
        <DobAgeToday iso={dateOfBirth} />
      </div>
      <hr className="planning-profile-fields__divider" aria-hidden />
      <div className="planning-profile-fields__row-duo">
        <label className="config-plan-field">
          <span className="config-plan-label">When would you like to retire?</span>
          <input
            type="text"
            inputMode="numeric"
            className="config-plan-input"
            value={fmtInput(targetRetirementAge)}
            onChange={(e) => {
              const n = Math.round(parseNum(e.target.value))
              if (!Number.isFinite(n)) return
              onTargetRetirementAge(n)
            }}
            aria-label="Target retirement age"
          />
          {dobOk && ageToday !== null ? (
            <span className="config-plan-age-hint">Most people plan between 62 and 70.</span>
          ) : variant === 'welcome' ? (
            <span className="config-plan-age-hint">Set your date of birth first.</span>
          ) : null}
        </label>
        {variant === 'import-manual' ? (
          <div className="config-plan-field config-plan-field--savings">
            <span className="config-plan-label" id="planning-profile-annual-save-label">
              Annual savings to retirement accounts
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
          <div className="config-plan-field config-plan-field--goal">
            <span className="config-plan-label" id="planning-profile-monthly-goal-label">
              Monthly income goal in retirement
            </span>
            <div className="config-plan-savings-row">
              <span className="config-plan-saveval">{fmt(props.monthlyIncomeGoal)}</span>
              <input
                type="range"
                className="config-plan-savings-slider"
                min={0}
                max={MONTHLY_GOAL_SLIDER_MAX}
                step={MONTHLY_GOAL_SLIDER_STEP}
                value={Math.min(MONTHLY_GOAL_SLIDER_MAX, props.monthlyIncomeGoal)}
                onChange={(e) => {
                  const n =
                    Math.round(Number(e.target.value) / MONTHLY_GOAL_SLIDER_STEP) * MONTHLY_GOAL_SLIDER_STEP
                  props.onMonthlyIncomeGoal(n)
                }}
                aria-labelledby="planning-profile-monthly-goal-label"
                aria-valuemin={0}
                aria-valuemax={MONTHLY_GOAL_SLIDER_MAX}
                aria-valuenow={props.monthlyIncomeGoal}
              />
            </div>
          </div>
        ) : null}
        {variant === 'configure' ? (
          <div className="config-plan-field config-plan-field--savings">
            <span className="config-plan-label" id="planning-profile-config-annual-save-label">
              Annual savings to retirement accounts
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
                aria-labelledby="planning-profile-config-annual-save-label"
                aria-valuemin={0}
                aria-valuemax={ANNUAL_SAVE_MAX}
                aria-valuenow={props.annualSave}
              />
            </div>
          </div>
        ) : null}
      </div>
      {variant === 'configure' ? (
        <div className="config-plan-field config-plan-field--goal planning-profile-fields__monthly-standalone">
          <span className="config-plan-label" id="planning-profile-config-monthly-goal-label">
            What is your monthly goal when you retire?
          </span>
          <div className="config-plan-savings-row">
            <span className="config-plan-saveval">{fmt(props.monthlyIncomeGoal)}</span>
            <input
              type="range"
              className="config-plan-savings-slider"
              min={0}
              max={MONTHLY_GOAL_SLIDER_MAX}
              step={MONTHLY_GOAL_SLIDER_STEP}
              value={Math.min(MONTHLY_GOAL_SLIDER_MAX, props.monthlyIncomeGoal)}
              onChange={(e) => {
                const n =
                  Math.round(Number(e.target.value) / MONTHLY_GOAL_SLIDER_STEP) * MONTHLY_GOAL_SLIDER_STEP
                props.onMonthlyIncomeGoal(n)
              }}
              aria-labelledby="planning-profile-config-monthly-goal-label"
              aria-valuemin={0}
              aria-valuemax={MONTHLY_GOAL_SLIDER_MAX}
              aria-valuenow={props.monthlyIncomeGoal}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
