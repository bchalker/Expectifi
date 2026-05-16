import { useEffect, useState } from 'react'
import { Button, Switch } from '@heroui/react'
import SimpleBar from 'simplebar-react'
import 'simplebar-react/dist/simplebar.min.css'
import type { CalculatorInputs } from '../lib/computeResults'
import { ageFromIsoDateString, isValidIsoDateString } from '../lib/ageFromDob'
import {
  calculatorInputsToUserPrefs,
  saveLocalUserPrefs,
  type UserPrefs,
} from '../lib/userPrefs'
import { formatSsAgeLabel, normalizeClaimAge, type SsClaimAge } from '../lib/socialSecurity'
import { ClaimAgeSegment } from './ClaimAgeSegment'
import { PlanningProfileFields } from './PlanningProfileFields'
import './ConfigDrawerBody.scss'
import './PlanningProfileFields.scss'
import './SidePanelShell.scss'
import './OnboardingOverlay.scss'

const BODY_CLASS = 'onboarding-overlay--open'
const RETIRE_AGE_MAX = 80

type Props = {
  inputs: CalculatorInputs
  setInputs: (p: Partial<CalculatorInputs>) => void
  onComplete: () => void
  /** When set, prefs are written to the user profile on submit. */
  saveUserPrefs?: (prefs: UserPrefs) => Promise<{ error?: string }>
}

export function OnboardingOverlay({ inputs, setInputs, onComplete, saveUserPrefs }: Props) {
  const [dob, setDob] = useState(inputs.dateOfBirth)
  const [monthlyGoal, setMonthlyGoal] = useState(inputs.monthlyIncomeGoal)
  const [ssAge, setSsAge] = useState<SsClaimAge>(() => normalizeClaimAge(inputs.ssAge))
  const [spouseSsAge, setSpouseSsAge] = useState<SsClaimAge>(() => normalizeClaimAge(inputs.spouseClaimAge))
  const [married, setMarried] = useState(inputs.married)
  const [retireAge, setRetireAge] = useState(inputs.targetRetirementAge)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    document.body.classList.add(BODY_CLASS)
    return () => {
      document.body.classList.remove(BODY_CLASS)
    }
  }, [])

  const dobOk = isValidIsoDateString(dob)
  const ageToday = dobOk ? ageFromIsoDateString(dob) : null
  const ageOk = ageToday !== null && ageToday >= 18 && ageToday <= 100
  const retireLo = dobOk && ageToday !== null ? Math.max(50, ageToday + 1) : 50
  const retireOk =
    Number.isFinite(retireAge) && retireAge >= retireLo && retireAge <= RETIRE_AGE_MAX
  const formValid = dobOk && ageOk && retireOk

  async function onContinue() {
    setErr(null)
    if (!formValid) {
      setErr(
        !dobOk || !ageOk
          ? 'Enter a valid date of birth (you must be between 18 and 100).'
          : `Retirement age must be between ${retireLo} and ${RETIRE_AGE_MAX} (based on your age).`,
      )
      return
    }
    if (busy) return
    setBusy(true)
    const lo = Math.max(50, ageToday! + 1)
    const targetRetirementAge = Math.min(RETIRE_AGE_MAX, Math.max(lo, Math.round(retireAge)))
    const patch = {
      dateOfBirth: dob,
      targetRetirementAge,
      monthlyIncomeGoal: Math.max(0, monthlyGoal),
      ssAge,
      spouseClaimAge: spouseSsAge,
      married,
    }
    setInputs(patch)
    const prefs: UserPrefs = {
      dob,
      retirementAge: targetRetirementAge,
      monthlyGoal: Math.max(0, monthlyGoal),
      ssClaimingAge: ssAge,
    }
    if (!calculatorInputsToUserPrefs({ ...inputs, ...patch })) {
      setBusy(false)
      setErr('Complete all plan fields before continuing.')
      return
    }
    if (saveUserPrefs) {
      const { error } = await saveUserPrefs(prefs)
      if (error) {
        setBusy(false)
        setErr(error)
        return
      }
    } else {
      saveLocalUserPrefs(prefs)
    }
    setBusy(false)
    onComplete()
  }

  return (
    <div
      className="onboarding-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-overlay-title"
    >
      <div className="onboarding-overlay__backdrop" aria-hidden />
      <div className="onboarding-overlay__panel">
        <header className="onboarding-overlay__header">
          <div className="onboarding-overlay__title-stack">
            <h2 id="onboarding-overlay-title" className="onboarding-overlay__title">
              Welcome.
            </h2>
            <p className="onboarding-overlay__subtitle">To get started, tell us a little about you</p>
            <p className="onboarding-overlay__lead">
              You can change these anytime in <strong>Configure</strong> (gear icon) under <strong>Planning</strong> and{' '}
              <strong>Social Security</strong>.
            </p>
          </div>
        </header>

        <SimpleBar className="side-panel-shell__scroll onboarding-overlay__scroll" autoHide={false}>
          <div className="onboarding-overlay__body">
            <div className="onboarding-overlay__section">
              <PlanningProfileFields
                variant="welcome"
                dateOfBirth={dob}
                onDateOfBirth={setDob}
                targetRetirementAge={retireAge}
                onTargetRetirementAge={setRetireAge}
                monthlyIncomeGoal={monthlyGoal}
                onMonthlyIncomeGoal={setMonthlyGoal}
              />
            </div>

            <div className="onboarding-overlay__section">
              <div className="onboarding-overlay__ss-block">
                <div className="config-plan-field">
                  <span className="config-plan-label">When do you plan to claim Social Security?</span>
                  {dobOk ? (
                    <span className="config-plan-age-hint">{formatSsAgeLabel(dob, ssAge)}</span>
                  ) : null}
                  <ClaimAgeSegment value={ssAge} onChange={setSsAge} ariaLabel="Your Social Security claiming age" />
                </div>
                <div className="onboarding-overlay__married">
                  <span id="onboarding-married-label" className="onboarding-overlay__married-label">
                    Planning with a spouse
                  </span>
                  <Switch
                    isSelected={married}
                    onChange={(selected) => setMarried(selected)}
                    size="sm"
                    aria-labelledby="onboarding-married-label"
                  >
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch>
                </div>
                {married ? (
                  <div>
                    <span className="config-plan-age-hint" style={{ display: 'block', marginBottom: 6 }}>
                      {inputs.spouseDateOfBirth && isValidIsoDateString(inputs.spouseDateOfBirth)
                        ? formatSsAgeLabel(inputs.spouseDateOfBirth, spouseSsAge)
                        : `Spouse: claim at ${spouseSsAge} (add their date of birth in Configure → Social Security for exact dates)`}
                    </span>
                    <ClaimAgeSegment
                      value={spouseSsAge}
                      onChange={setSpouseSsAge}
                      ariaLabel="Spouse Social Security claiming age"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </SimpleBar>

        <footer className="onboarding-overlay__footer">
          {err ? (
            <p className="onboarding-overlay__err" role="alert">
              {err}
            </p>
          ) : null}
          <Button variant="primary" fullWidth isDisabled={!formValid || busy} onPress={() => void onContinue()}>
            {busy ? 'Saving…' : "Let's see your numbers"}
          </Button>
        </footer>
      </div>
    </div>
  )
}
