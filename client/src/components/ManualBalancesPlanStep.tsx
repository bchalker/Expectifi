import { useEffect, useState } from 'react'
import { Button } from '@heroui/react'
import { ageFromIsoDateString, isValidIsoDateString } from '../lib/ageFromDob'
import { isDobAgeInRange } from '../lib/dateOfBirthSelect'
import { fmt, fmtInput, parseNum } from '../utils/format'
import { DateOfBirthSelects, DobAgeToday } from './DateOfBirthSelects'
import './ConfigDrawerBody.scss'
import './AccountBalancesCustomScenario.scss'

const RETIRE_AGE_MAX = 80
const ANNUAL_SAVE_MAX = 60_000
const ANNUAL_SAVE_STEP = 500

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
}

export function ManualBalancesPlanStep({
  initialDateOfBirth,
  initialTargetRetirementAge,
  initialSave,
  onContinue,
}: Props) {
  const [dob, setDob] = useState(initialDateOfBirth)
  const [retireAge, setRetireAge] = useState(initialTargetRetirementAge)
  const [annualSave, setAnnualSave] = useState(initialSave)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!isValidIsoDateString(dob)) return
    const at = ageFromIsoDateString(dob)
    if (at < 18 || at > 100) return
    const lo = Math.max(50, at + 1)
    setRetireAge((r) => Math.min(RETIRE_AGE_MAX, Math.max(lo, r)))
  }, [dob])

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
      save: Math.max(0, Math.round(annualSave / ANNUAL_SAVE_STEP) * ANNUAL_SAVE_STEP),
    })
  }

  return (
    <div className="account-balances-manual-plan-step">
      <p className="account-balances-manual-plan-step__lead">
        We need a few details to project growth and monthly income from your balances.
      </p>
      <div className="account-balances-manual-plan-step__stack">
        <div className="config-plan-field">
          <span className="config-plan-label">When were you born?</span>
          <DateOfBirthSelects value={dob} onChange={setDob} />
          <DobAgeToday iso={dob} />
        </div>
        <hr className="account-balances-manual-plan-step__divider" aria-hidden />
        <div className="account-balances-manual-plan-step__row-duo">
          <label className="config-plan-field">
            <span className="config-plan-label">When would you like to retire?</span>
            <input
              type="text"
              inputMode="numeric"
              className="config-plan-input"
              value={fmtInput(retireAge)}
              onChange={(e) => {
                const n = Math.round(parseNum(e.target.value))
                if (!Number.isFinite(n)) return
                setRetireAge(n)
              }}
              aria-label="Target retirement age"
            />
            {dobOk && ageToday !== null ? (
              <span className="config-plan-age-hint">Most people plan between 62 and 70.</span>
            ) : null}
          </label>
          <div className="config-plan-field config-plan-field--savings">
            <span className="config-plan-label" id="manual-plan-annual-save-label">
              Annual savings to retirement accounts
            </span>
            <div className="config-plan-savings-row">
              <span className="config-plan-saveval">{fmt(annualSave)}</span>
              <input
                type="range"
                className="config-plan-savings-slider"
                min={0}
                max={ANNUAL_SAVE_MAX}
                step={ANNUAL_SAVE_STEP}
                value={annualSave}
                onChange={(e) =>
                  setAnnualSave(Math.round(Number(e.target.value) / ANNUAL_SAVE_STEP) * ANNUAL_SAVE_STEP)
                }
                aria-labelledby="manual-plan-annual-save-label"
                aria-valuemin={0}
                aria-valuemax={ANNUAL_SAVE_MAX}
                aria-valuenow={annualSave}
              />
            </div>
          </div>
        </div>
      </div>
      {err ? (
        <p className="account-balances-manual-plan-step__err" role="alert">
          {err}
        </p>
      ) : null}
      <div className="account-balances-manual-plan-step__actions">
        <Button type="button" size="sm" variant="primary" onPress={handleContinue}>
          Continue
        </Button>
      </div>
    </div>
  )
}
