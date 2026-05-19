import { useEffect, useState } from 'react'
import SimpleBar from 'simplebar-react'
import 'simplebar-react/dist/simplebar.min.css'
import type { CalculatorInputs } from '../lib/computeResults'
import { ageFromIsoDateString, isValidIsoDateString } from '../lib/ageFromDob'
import {
  calculatorInputsToUserPrefs,
  markWelcomeCompletedLocal,
  saveLocalUserPrefs,
  type UserPrefs,
} from '../lib/userPrefs'
import { clampClaimAge } from '../lib/socialSecurity'
import {
  defaultWelcomeBirthIso,
  welcomeBenchmarkInputsPatch,
  WELCOME_BENCHMARK,
} from '../lib/welcomeBenchmarkDefaults'
import { ClaimAgeSlider } from './ClaimAgeSlider'
import { DateOfBirthSelects, DobAgeToday } from './DateOfBirthSelects'
import { HouseholdModeSegment, type HouseholdMode } from './HouseholdModeSegment'
import { CurrencyAmountInput } from './ui/CurrencyAmountInput'
import { parseNum } from '../utils/format'
import './ConfigDrawerBody.scss'
import './PlanningProfileFields.scss'
import './SidePanelShell.scss'
import './ui/CurrencyAmountInput.scss'
import './ClaimAgeSlider.scss'
import './OnboardingOverlay.scss'

const BODY_CLASS = 'onboarding-overlay--open'
const RETIRE_AGE_MAX = 80

const WELCOME_FIELD_HINTS = {
  dob: 'We use your age to estimate how many years your money needs to work for you.',
  currentSavings:
    'Include 401(k), IRA, brokerage, and savings accounts. A rough estimate is totally fine — you can refine this later.',
  householdIncome:
    'Your combined pre-tax income. This helps us understand your current lifestyle and what retirement might look like.',
  monthlyContribution:
    "What you're putting away each month across all accounts. Even small amounts compound significantly over time.",
  targetRetirementAge:
    '67 is the full Social Security benefit age for most people born after 1960, but this is your plan — adjust it to match your vision.',
  monthlyIncomeGoal:
    "How much you'd like available each month in retirement, after taxes. A ballpark figure is enough to see what's possible.",
  ssBenefit:
    'Your estimated monthly benefit at age 67. The average is around $1,800 — ssa.gov has a free estimator if you want your exact number.',
  ssClaimAge:
    'Claiming earlier means a smaller monthly check; waiting until 70 increases it. There is no single right answer — pick what fits your plan.',
  householdMode:
    'Planning with a spouse lets us factor in their savings and Social Security alongside yours.',
} as const

type Step = 'profile' | 'social-security' | 'income-goal'

type Props = {
  inputs: CalculatorInputs
  setInputs: (p: Partial<CalculatorInputs>) => void
  onComplete: () => void
  /** Dismiss welcome without saving; dashboard stays empty. */
  onCancel?: () => void
  /** When set, prefs are written to the user profile on submit. */
  saveUserPrefs?: (prefs: UserPrefs) => Promise<{ error?: string }>
  /** After welcome, open the account import flow on the dashboard. */
  onConnectAccounts?: () => void
}

function ssTripletFromMonthlyAt67(monthlyAt67: number) {
  const b67 = Math.round(monthlyAt67)
  const ref62 = Math.round(b67 * 0.7)
  const ref70 = Math.round(b67 * 1.24)
  return { b62: ref62, b67, b70: ref70 }
}

function initialFormFromInputs(inputs: CalculatorInputs) {
  const bench = welcomeBenchmarkInputsPatch()
  const dob = inputs.dateOfBirth || bench.dateOfBirth || defaultWelcomeBirthIso()
  const savings =
    inputs.base401k + inputs.baseSE401k + inputs.baseTradIRA + inputs.baseRoth + inputs.baseHsa + inputs.brkBal ||
    WELCOME_BENCHMARK.currentSavings
  return {
    dob,
    currentSavings: savings,
    householdIncome: inputs.other > 0 ? inputs.other : WELCOME_BENCHMARK.householdIncomeAnnual,
    monthlyContribution:
      inputs.save > 0 ? Math.round(inputs.save / 12) : WELCOME_BENCHMARK.monthlyContribution,
    retireAge: inputs.targetRetirementAge || WELCOME_BENCHMARK.targetRetirementAge,
    monthlyGoal: inputs.monthlyIncomeGoal || WELCOME_BENCHMARK.monthlyIncomeGoal,
    ssAge: inputs.ssAge ? clampClaimAge(inputs.ssAge) : 67,
    ssBenefitMonthly: inputs.ssBenefit67 || WELCOME_BENCHMARK.ssBenefitMonthlyAt67,
    householdMode: (inputs.married ? 'spouse' : 'solo') as HouseholdMode,
    spouseDob: inputs.spouseDateOfBirth || defaultWelcomeBirthIso(),
    spouseSavings: 0,
    spouseSsBenefitMonthly: inputs.spouseBenefit67 || Math.round(WELCOME_BENCHMARK.ssBenefitMonthlyAt67 * 0.5),
    spouseSsAge: inputs.spouseClaimAge ? clampClaimAge(inputs.spouseClaimAge) : 67,
  }
}

function formToCalculatorPatch(form: ReturnType<typeof initialFormFromInputs>): Partial<CalculatorInputs> {
  const ss = ssTripletFromMonthlyAt67(form.ssBenefitMonthly)
  const spouseSs = ssTripletFromMonthlyAt67(form.spouseSsBenefitMonthly)
  const married = form.householdMode === 'spouse'
  return {
    dateOfBirth: form.dob,
    targetRetirementAge: form.retireAge,
    base401k: form.currentSavings,
    baseSE401k: 0,
    baseTradIRA: 0,
    baseRoth: married ? form.spouseSavings : 0,
    baseHsa: 0,
    brkBal: 0,
    save: form.monthlyContribution * 12,
    monthlyIncomeGoal: form.monthlyGoal,
    other: form.householdIncome,
    ssAge: form.ssAge,
    ssBenefit62: ss.b62,
    ssBenefit67: ss.b67,
    ssBenefit70: ss.b70,
    married,
    spouseDateOfBirth: married ? form.spouseDob : '',
    spouseClaimAge: form.spouseSsAge,
    spouseHasOwnEarnings: true,
    spouseBenefit62: married ? spouseSs.b62 : 0,
    spouseBenefit67: married ? spouseSs.b67 : 0,
    spouseBenefit70: married ? spouseSs.b70 : 0,
  }
}

export function OnboardingOverlay({
  inputs,
  setInputs,
  onComplete,
  onCancel,
  saveUserPrefs,
  onConnectAccounts,
}: Props) {
  const [step, setStep] = useState<Step>('profile')
  const [form, setForm] = useState(() => initialFormFromInputs(inputs))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    document.body.classList.add(BODY_CLASS)
    return () => {
      document.body.classList.remove(BODY_CLASS)
    }
  }, [])

  const dobOk = isValidIsoDateString(form.dob)
  const ageToday = dobOk ? ageFromIsoDateString(form.dob) : null
  const ageOk = ageToday !== null && ageToday >= 18 && ageToday <= 100
  const retireLo = dobOk && ageToday !== null ? Math.max(50, ageToday + 1) : 50
  const retireOk = Number.isFinite(form.retireAge) && form.retireAge >= retireLo && form.retireAge <= RETIRE_AGE_MAX
  const profileValid = dobOk && ageOk && retireOk && form.currentSavings >= 0
  const spouseDobOk = form.householdMode === 'solo' || isValidIsoDateString(form.spouseDob)
  const ssValid =
    form.ssBenefitMonthly > 0 &&
    spouseDobOk &&
    (form.householdMode === 'solo' || form.spouseSsBenefitMonthly > 0)
  const goalValid = form.monthlyGoal > 0
  const dashboardVisible = step === 'income-goal'

  async function persistAndFinish(openConnect = false) {
    setErr(null)
    if (busy) return
    setBusy(true)
    const patch = formToCalculatorPatch(form)
    const lo = Math.max(50, ageToday! + 1)
    const targetRetirementAge = Math.min(RETIRE_AGE_MAX, Math.max(lo, Math.round(form.retireAge)))
    const finalPatch = { ...patch, targetRetirementAge }
    setInputs(finalPatch)
    const prefs: UserPrefs = {
      dob: form.dob,
      retirementAge: targetRetirementAge,
      monthlyGoal: Math.max(0, form.monthlyGoal),
      ssClaimingAge: form.ssAge,
    }
    if (!calculatorInputsToUserPrefs({ ...inputs, ...finalPatch })) {
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
    markWelcomeCompletedLocal()
    setBusy(false)
    onComplete()
    if (openConnect) onConnectAccounts?.()
  }

  function onProfileContinue() {
    setErr(null)
    if (!profileValid) {
      setErr(
        !dobOk || !ageOk
          ? 'Enter a valid date of birth (you must be between 18 and 100).'
          : `Retirement age must be between ${retireLo} and ${RETIRE_AGE_MAX}.`,
      )
      return
    }
    setStep('social-security')
  }

  function onSsContinue() {
    setErr(null)
    if (!ssValid) {
      if (form.ssBenefitMonthly <= 0) {
        setErr('Enter your expected Social Security benefit.')
        return
      }
      if (!spouseDobOk) {
        setErr('Enter a valid date of birth for your spouse.')
        return
      }
      setErr('Complete all Social Security fields before continuing.')
      return
    }
    setInputs(formToCalculatorPatch(form))
    setStep('income-goal')
  }

  function onFinishWelcome() {
    setErr(null)
    if (!profileValid || !ssValid || !goalValid) {
      if (!goalValid) {
        setErr('Enter your monthly income goal in retirement.')
        return
      }
      setErr('Complete all fields before continuing.')
      return
    }
    void persistAndFinish(false)
  }

  function handleCancel() {
    if (busy) return
    setErr(null)
    markWelcomeCompletedLocal()
    onCancel?.()
  }

  const headerTitle =
    step === 'profile'
      ? 'Welcome.'
      : step === 'social-security'
        ? 'Social Security'
        : 'Your income goal'

  const headerSubtitle =
    step === 'profile'
      ? 'To get started, tell us a little about you'
      : step === 'social-security'
        ? 'Help us estimate your benefits in retirement'
        : 'One last thing — how much would you like each month in retirement?'

  return (
    <div
      className={`onboarding-overlay${dashboardVisible ? ' onboarding-overlay--dashboard-visible' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-overlay-title"
    >
      <div className="onboarding-overlay__backdrop" aria-hidden />
      <div className="onboarding-overlay__panel">
        <header className="onboarding-overlay__header">
          <div className="onboarding-overlay__title-stack">
            <h2 id="onboarding-overlay-title" className="onboarding-overlay__title">
              {headerTitle}
            </h2>
            <p className="onboarding-overlay__subtitle">{headerSubtitle}</p>
          </div>
        </header>

        <SimpleBar className="side-panel-shell__scroll onboarding-overlay__scroll" autoHide={false}>
          <div className="onboarding-overlay__body">
            {step === 'profile' ? (
              <>
                <div className="onboarding-overlay__section">
                  <div className="config-plan-field planning-profile-fields__dob">
                    <span className="config-plan-label">When were you born?</span>
                    <div className="planning-profile-fields__dob-inline">
                      <DateOfBirthSelects value={form.dob} onChange={(iso) => setForm((f) => ({ ...f, dob: iso }))} includeDay={false} />
                      {dobOk ? <DobAgeToday key={form.dob} iso={form.dob} /> : null}
                    </div>
                    <p className="onboarding-overlay__field-hint">{WELCOME_FIELD_HINTS.dob}</p>
                  </div>
                </div>

                <div className="onboarding-overlay__field-grid">
                  <CurrencyAmountInput
                    id="welcome-current-savings"
                    label="Current savings"
                    value={form.currentSavings}
                    onChange={(n) => setForm((f) => ({ ...f, currentSavings: n }))}
                    hint={WELCOME_FIELD_HINTS.currentSavings}
                  />
                  <CurrencyAmountInput
                    id="welcome-household-income"
                    label="Household income"
                    value={form.householdIncome}
                    onChange={(n) => setForm((f) => ({ ...f, householdIncome: n }))}
                    hint={WELCOME_FIELD_HINTS.householdIncome}
                  />
                  <CurrencyAmountInput
                    id="welcome-monthly-contribution"
                    label="Monthly contribution"
                    value={form.monthlyContribution}
                    onChange={(n) => setForm((f) => ({ ...f, monthlyContribution: n }))}
                    showAnnualEquivalent
                    hint={WELCOME_FIELD_HINTS.monthlyContribution}
                  />
                  <div className="config-plan-field">
                    <label className="config-plan-label" htmlFor="welcome-retire-age">
                      Target retirement age
                    </label>
                    <div className="num-input-wrap onboarding-overlay__age-input-wrap">
                      <input
                        id="welcome-retire-age"
                        type="text"
                        inputMode="decimal"
                        className="num-input onboarding-overlay__age-input"
                        value={String(form.retireAge)}
                        onChange={(e) => setForm((f) => ({ ...f, retireAge: Math.round(parseNum(e.target.value)) }))}
                      />
                    </div>
                    <p className="onboarding-overlay__field-hint">{WELCOME_FIELD_HINTS.targetRetirementAge}</p>
                  </div>
                </div>
              </>
            ) : step === 'social-security' ? (
              <>
                <div className="onboarding-overlay__field-grid onboarding-overlay__field-grid--ss">
                  <CurrencyAmountInput
                    id="welcome-ss-benefit"
                    className="onboarding-overlay__field--wide"
                    label="Expected Social Security benefit (at 67)"
                    value={form.ssBenefitMonthly}
                    onChange={(n) => setForm((f) => ({ ...f, ssBenefitMonthly: n }))}
                    hint={WELCOME_FIELD_HINTS.ssBenefit}
                  />
                </div>

                <div className="onboarding-overlay__section">
                  <div className="config-plan-field">
                    <span className="config-plan-label">When do you plan to claim Social Security?</span>
                    <ClaimAgeSlider
                      value={form.ssAge}
                      onChange={(age) => setForm((f) => ({ ...f, ssAge: age }))}
                      ariaLabel="Your Social Security claiming age"
                      dateOfBirth={form.dob}
                    />
                    <p className="onboarding-overlay__field-hint">{WELCOME_FIELD_HINTS.ssClaimAge}</p>
                  </div>
                </div>

                <div className="onboarding-overlay__section">
                  <span className="config-plan-label">Planning household</span>
                  <HouseholdModeSegment
                    value={form.householdMode}
                    onChange={(mode) => setForm((f) => ({ ...f, householdMode: mode }))}
                  />
                  <p className="onboarding-overlay__field-hint">{WELCOME_FIELD_HINTS.householdMode}</p>
                  {form.householdMode === 'spouse' ? (
                    <div className="onboarding-overlay__spouse-fields">
                      <div className="config-plan-field planning-profile-fields__dob">
                        <span className="config-plan-label">Spouse date of birth</span>
                        <DateOfBirthSelects
                          value={form.spouseDob}
                          onChange={(iso) => setForm((f) => ({ ...f, spouseDob: iso }))}
                          includeDay={false}
                        />
                      </div>
                      <CurrencyAmountInput
                        id="welcome-spouse-savings"
                        label="Spouse current savings"
                        value={form.spouseSavings}
                        onChange={(n) => setForm((f) => ({ ...f, spouseSavings: n }))}
                      />
                      <CurrencyAmountInput
                        id="welcome-spouse-ss"
                        label="Spouse expected Social Security (at 67)"
                        value={form.spouseSsBenefitMonthly}
                        onChange={(n) => setForm((f) => ({ ...f, spouseSsBenefitMonthly: n }))}
                        showAnnualEquivalent
                      />
                      <div className="config-plan-field">
                        <span className="config-plan-label">Spouse claiming age</span>
                        <ClaimAgeSlider
                          value={form.spouseSsAge}
                          onChange={(age) => setForm((f) => ({ ...f, spouseSsAge: age }))}
                          ariaLabel="Spouse Social Security claiming age"
                          dateOfBirth={form.spouseDob}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="onboarding-overlay__field-grid onboarding-overlay__field-grid--goal">
                <CurrencyAmountInput
                  id="welcome-monthly-goal"
                  className="onboarding-overlay__field--wide"
                  label="Monthly income goal in retirement"
                  value={form.monthlyGoal}
                  onChange={(n) => setForm((f) => ({ ...f, monthlyGoal: n }))}
                  showAnnualEquivalent
                  hint={WELCOME_FIELD_HINTS.monthlyIncomeGoal}
                />
              </div>
            )}
          </div>
        </SimpleBar>

        <footer className="onboarding-overlay__footer">
          {err ? (
            <p className="onboarding-overlay__err" role="alert">
              {err}
            </p>
          ) : null}
          {step === 'profile' ? (
            <div className="onboarding-overlay__footer-actions">
              <button
                type="button"
                className="onboarding-overlay__btn onboarding-overlay__btn--muted"
                disabled={busy}
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                className="onboarding-overlay__btn onboarding-overlay__btn--primary"
                disabled={!profileValid || busy}
                onClick={onProfileContinue}
              >
                Continue to Social Security
              </button>
            </div>
          ) : step === 'social-security' ? (
            <div className="onboarding-overlay__footer-actions">
              <button
                type="button"
                className="onboarding-overlay__btn onboarding-overlay__btn--muted"
                disabled={busy}
                onClick={() => {
                  setErr(null)
                  setStep('profile')
                }}
              >
                Back
              </button>
              <button
                type="button"
                className="onboarding-overlay__btn onboarding-overlay__btn--primary"
                disabled={!ssValid || busy}
                onClick={onSsContinue}
              >
                Continue
              </button>
            </div>
          ) : (
            <div className="onboarding-overlay__footer-actions">
              <button
                type="button"
                className="onboarding-overlay__btn onboarding-overlay__btn--muted"
                disabled={busy}
                onClick={() => {
                  setErr(null)
                  setStep('social-security')
                }}
              >
                Back
              </button>
              <button
                type="button"
                className="onboarding-overlay__btn onboarding-overlay__btn--primary"
                disabled={!goalValid || busy}
                onClick={onFinishWelcome}
              >
                {busy ? 'Saving…' : 'Continue to dashboard'}
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>
  )
}
