import { useEffect, useState } from 'react'
import { Button, Switch } from '@heroui/react'
import type { CalculatorInputs } from '../lib/computeResults'
import { ageFromIsoDateString, isValidIsoDateString } from '../lib/ageFromDob'
import { formatSsAgeLabel, normalizeClaimAge, type SsClaimAge } from '../lib/socialSecurity'
import { fmtInput, parseNum } from '../utils/format'
import { ClaimAgeSegment } from './ClaimAgeSegment'
import './ConfigDrawerBody.scss'
import './OnboardingOverlay.scss'

const BODY_CLASS = 'onboarding-overlay--open'
const RETIRE_AGE_MAX = 80

type Props = {
  inputs: CalculatorInputs
  setInputs: (p: Partial<CalculatorInputs>) => void
  completeOnboarding: () => Promise<{ error?: string }>
}

export function OnboardingOverlay({ inputs, setInputs, completeOnboarding }: Props) {
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
    setInputs({
      dateOfBirth: dob,
      targetRetirementAge,
      monthlyIncomeGoal: Math.max(0, monthlyGoal),
      ssAge,
      spouseClaimAge: spouseSsAge,
      married,
    })
    const { error } = await completeOnboarding()
    setBusy(false)
    if (error) setErr(error)
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
        <h2 id="onboarding-overlay-title" className="onboarding-overlay__title">
          Welcome — a few quick details
        </h2>
        <p className="footnote footnote--muted onboarding-overlay__lead">
          You can change these anytime in <strong>Configure</strong> (gear icon) under <strong>Planning</strong> and{' '}
          <strong>Social Security</strong>.
        </p>

        <div className="onboarding-overlay__section">
          <div className="config-plan-field">
            <span className="config-plan-label">When were you born?</span>
            <input
              type="date"
              className="config-plan-input config-plan-input--date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
            {dobOk ? (
              <span className="config-plan-age-hint">Age today: {ageToday}</span>
            ) : (
              <span className="config-plan-age-hint">Use your calendar date of birth.</span>
            )}
          </div>
        </div>

        <div className="onboarding-overlay__section">
          <label className="config-plan-field">
            <span className="config-plan-label">When would you like to retire?</span>
            <input
              type="text"
              inputMode="numeric"
              className="config-plan-input onboarding-overlay__retire-age-input"
              value={fmtInput(retireAge)}
              onChange={(e) => {
                const n = Math.round(parseNum(e.target.value))
                if (!Number.isFinite(n)) return
                setRetireAge(n)
              }}
              aria-label="Target retirement age"
            />
            {dobOk && ageToday !== null ? (
              <span className="config-plan-age-hint">
                Use an age from {retireLo} to {RETIRE_AGE_MAX} based on your current age.
              </span>
            ) : (
              <span className="config-plan-age-hint">Set your date of birth first to validate retirement age.</span>
            )}
          </label>
        </div>

        <div className="onboarding-overlay__section">
          <p className="config-plan-question" id="onboarding-goal-question">
            What is your monthly goal when you retire? (optional)
          </p>
          <div className="onboarding-overlay__goal-row">
            <label className="config-plan-field config-plan-field--goal">
              <span className="num-input-wrap">
                <span className="num-input-prefix">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="num-input"
                  value={fmtInput(monthlyGoal)}
                  onChange={(e) => setMonthlyGoal(Math.max(0, parseNum(e.target.value)))}
                  placeholder="0"
                  aria-labelledby="onboarding-goal-question"
                />
              </span>
            </label>
          </div>
        </div>

        <div className="onboarding-overlay__section">
          <div className="onboarding-overlay__section-title">Social Security claiming ages</div>
          <div className="onboarding-overlay__ss-block">
            <div>
              <span className="config-plan-age-hint" style={{ display: 'block', marginBottom: 6 }}>
                {dobOk ? formatSsAgeLabel(dob, ssAge) : 'Your claiming age'}
              </span>
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

        {err ? (
          <p className="onboarding-overlay__err" role="alert">
            {err}
          </p>
        ) : null}

        <div className="onboarding-overlay__actions">
          <Button variant="primary" fullWidth isDisabled={!formValid || busy} onPress={() => void onContinue()}>
            {busy ? 'Saving…' : 'Save and continue'}
          </Button>
        </div>
      </div>
    </div>
  )
}
