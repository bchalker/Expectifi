import { useState } from 'react'
import { ageFromIsoDateString, isValidIsoDateString } from '../lib/ageFromDob'
import { isDobAgeInRange } from '../lib/dateOfBirthSelect'
import { PlanningProfileFields } from './PlanningProfileFields'
import './ConfigDrawerBody.scss'
import './PlanningProfileFields.scss'
import './AccountBalancesCustomScenario.scss'

const RETIRE_AGE_MAX = 80

export type ManualPlanDraft = {
  dateOfBirth: string
  targetRetirementAge: number
  save: number
}

type Props = {
  initialDateOfBirth: string
  initialTargetRetirementAge: number
  initialSave: number
  onContinue: (draft: ManualPlanDraft) => void
  onCancel: () => void
}

export function ManualBalancesPlanStep({
  initialDateOfBirth,
  initialTargetRetirementAge,
  initialSave,
  onContinue,
  onCancel,
}: Props) {
  const [dob, setDob] = useState(initialDateOfBirth)
  const [retireAge, setRetireAge] = useState(initialTargetRetirementAge)
  const [annualSave, setAnnualSave] = useState(initialSave)
  const [err, setErr] = useState<string | null>(null)

  const dobOk = isValidIsoDateString(dob)
  const ageToday = dobOk ? ageFromIsoDateString(dob) : null
  const ageOk = ageToday !== null && ageToday >= 18 && ageToday <= 100
  const retireLo = dobOk && ageToday !== null ? Math.max(50, ageToday + 1) : 50
  const retireOk =
    Number.isFinite(retireAge) && retireAge >= retireLo && retireAge <= RETIRE_AGE_MAX

  function handleContinue() {
    setErr(null)
    if (!dobOk) {
      setErr('Select your month, day, and year of birth.')
      return
    }
    if (!ageOk || !isDobAgeInRange(dob)) {
      setErr('Date of birth must mean you are between 18 and 100 today.')
      return
    }
    if (!retireOk) {
      setErr(`Retirement age must be between ${retireLo} and ${RETIRE_AGE_MAX}.`)
      return
    }
    onContinue({
      dateOfBirth: dob,
      targetRetirementAge: Math.min(RETIRE_AGE_MAX, Math.max(retireLo, Math.round(retireAge))),
      save: Math.max(0, Math.round(annualSave / 500) * 500),
    })
  }

  return (
    <div className="account-balances-manual-plan-step">
      <PlanningProfileFields
        variant="import-manual"
        dateOfBirth={dob}
        onDateOfBirth={setDob}
        targetRetirementAge={retireAge}
        onTargetRetirementAge={setRetireAge}
        annualSave={annualSave}
        onAnnualSave={setAnnualSave}
      />
      {err ? (
        <p className="account-balances-manual-plan-step__err" role="alert">
          {err}
        </p>
      ) : null}
      <div className="account-balances-manual-plan-step__actions">
        <button type="button" className="account-balances-manual-plan-step__btn account-balances-manual-plan-step__btn--muted" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="account-balances-manual-plan-step__btn account-balances-manual-plan-step__btn--primary"
          onClick={handleContinue}
        >
          Continue
        </button>
      </div>
    </div>
  )
}
