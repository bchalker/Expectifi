import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconCheck } from '@tabler/icons-react'
import SimpleBar from 'simplebar-react'
import 'simplebar-react/dist/simplebar.min.css'
import type { CalculatorInputs, CalculatorUi } from '../lib/computeResults'
import { ageFromIsoDateString, isValidIsoDateString } from '../lib/ageFromDob'
import {
  calculatorInputsToPlanningPrefs,
  markWelcomeCompletedLocal,
  saveLocalUserPrefs,
  type UserPrefs,
} from '../lib/userPrefs'
import { clampClaimAge } from '../lib/socialSecurity'
import {
  WELCOME_BENCHMARK,
} from '../lib/welcomeBenchmarkDefaults'
import { ClaimAgeSlider } from './ClaimAgeSlider'
import { DateOfBirthSelects, DobAgeToday } from './DateOfBirthSelects'
import { SpouseClaimModeSegment, type SpouseClaimMode } from './SpouseClaimModeSegment'
import {
  hasValidManualAccountEntries,
  normalizedManualAccountEntries,
  OnboardingAccountsStep,
} from './OnboardingAccountsStep'
import { CurrencyAmountInput } from './ui/CurrencyAmountInput'
import { fmt, parseNum } from '../utils/format'
import {
  aggregateManualAccountsToBases,
  loadStoredManualAccounts,
  newManualAccountEntry,
  saveCompletedManualAccounts,
} from '../lib/manualAccountEntries'
import './ConfigDrawerBody.scss'
import './PlanningProfileFields.scss'
import './SidePanelShell.scss'
import './ui/CurrencyAmountInput.scss'
import './ClaimAgeSlider.scss'
import './SpouseClaimModeSegment.scss'
import './OnboardingAccountsStep.scss'
import './OnboardingOverlay.scss'
import './OnboardingFieldShell.scss'

const BODY_CLASS = 'onboarding-overlay--open'
const RETIRE_AGE_MAX = 80

const WELCOME_FIELD_PLACEHOLDERS = {
  householdIncome: 'e.g. 85,000',
  monthlyContribution: 'e.g. 1,500',
  monthlyIncomeGoal: 'e.g. 5,000',
} as const

const WELCOME_FIELD_HINTS = {
  dob: 'We use your age to estimate how many years your money needs to work for you.',
  householdIncome:
    'Your combined pre-tax income. This helps us understand your current lifestyle and what retirement might look like.',
  monthlyContribution:
    "What you're putting away each month across all accounts. Even small amounts compound significantly over time.",
  targetRetirementAge:
    '67 is the full Social Security benefit age for most people born after 1960, but this is your plan — adjust it to match your vision.',
  monthlyIncomeGoal:
    'A ballpark is fine.',
  ssBenefit:
    'Your estimated monthly benefit at your chosen claiming age. The average at 67 is around $1,800 — ssa.gov has a free estimator if you want your exact number.',
  ssClaimAge:
    'Claiming earlier means a smaller monthly check; waiting until 70 increases it. There is no single right answer — pick what fits your plan.',
  includeSpouse:
    'Include your spouse to factor in their Social Security alongside yours.',
  spouseClaimModeTooltip:
    "Social Security pays whichever is higher — your spouse's own earned benefit or 50% of yours. Choose spousal benefit if your spouse had lower lifetime earnings.",
} as const

const SPOUSE_CLAIM_MODE_TOOLTIP = WELCOME_FIELD_HINTS.spouseClaimModeTooltip

const ACCOUNTS_REQUIRED_MSG = 'Enter at least one account type and balance to continue.'

type Step = 'profile' | 'accounts' | 'social-security' | 'income-goal'

type Props = {
  inputs: CalculatorInputs
  setInputs: (p: Partial<CalculatorInputs>) => void
  setUi?: (p: Partial<CalculatorUi>) => void
  onComplete: () => void
  /** Dismiss welcome without saving; dashboard stays empty. */
  onCancel?: () => void
  /** When set, prefs are written to the user profile on submit. */
  saveUserPrefs?: (prefs: UserPrefs) => Promise<{ error?: string }>
  /** After welcome, open the account import flow on the dashboard. */
  onConnectAccounts?: () => void
  /** After Your Accounts step saves typed account rows. */
  onAccountsSaved?: () => void
}

function ssTripletFromMonthlyAt67(monthlyAt67: number) {
  const b67 = Math.round(monthlyAt67)
  const ref62 = Math.round(b67 * 0.7)
  const ref70 = Math.round(b67 * 1.24)
  return { b62: ref62, b67, b70: ref70 }
}

function initialFormFromInputs(inputs: CalculatorInputs) {
  const dob = inputs.dateOfBirth || ''
  const storedAccounts = loadStoredManualAccounts()
  const hasSsBenefits = inputs.ssBenefit62 > 0 && inputs.ssBenefit67 > 0 && inputs.ssBenefit70 > 0
  return {
    dob,
    householdIncome: inputs.other > 0 ? inputs.other : 0,
    monthlyContribution: inputs.save > 0 ? Math.round(inputs.save / 12) : 0,
    retireAge: inputs.targetRetirementAge || WELCOME_BENCHMARK.targetRetirementAge,
    monthlyGoal: inputs.monthlyIncomeGoal > 0 ? inputs.monthlyIncomeGoal : 0,
    includeSs: hasSsBenefits,
    ssAge: inputs.ssAge ? clampClaimAge(inputs.ssAge) : 67,
    ssBenefitMonthly: inputs.ssBenefit67 > 0 ? inputs.ssBenefit67 : 0,
    includeSpouse: inputs.married,
    spouseClaimMode: (inputs.spouseHasOwnEarnings === false ? 'spousal' : 'own') as SpouseClaimMode,
    spouseDob: inputs.spouseDateOfBirth || '',
    spouseSsBenefitMonthly: inputs.spouseBenefit67 || Math.round(WELCOME_BENCHMARK.ssBenefitMonthlyAt67 * 0.5),
    spouseSsAge: inputs.spouseClaimAge ? clampClaimAge(inputs.spouseClaimAge) : 67,
    accountEntries:
      storedAccounts?.entries.length && storedAccounts.onboardingCompleted
        ? storedAccounts.entries
        : [newManualAccountEntry()],
    accountsStepCompleted: storedAccounts?.onboardingCompleted ?? false,
    accountsStepSkipped: storedAccounts?.onboardingSkipped ?? false,
  }
}

function effectiveSpouseBenefitMonthly(form: ReturnType<typeof initialFormFromInputs>): number {
  if (form.spouseClaimMode === 'spousal') {
    return Math.round(form.ssBenefitMonthly * 0.5)
  }
  return form.spouseSsBenefitMonthly
}

function accountBasesFromForm(form: ReturnType<typeof initialFormFromInputs>) {
  if (!form.accountsStepCompleted) {
    return {
      base401k: 0,
      baseSE401k: 0,
      baseTradIRA: 0,
      baseRoth: 0,
      baseHsa: 0,
      brkBal: 0,
    }
  }
  return aggregateManualAccountsToBases(form.accountEntries)
}

function formToCalculatorPatch(form: ReturnType<typeof initialFormFromInputs>): Partial<CalculatorInputs> {
  const ss = form.includeSs ? ssTripletFromMonthlyAt67(form.ssBenefitMonthly) : { b62: 0, b67: 0, b70: 0 }
  const married = form.includeSpouse
  const spouseHasOwnEarnings = form.spouseClaimMode === 'own'
  const spouseSs =
    form.includeSs && married && spouseHasOwnEarnings
      ? ssTripletFromMonthlyAt67(form.spouseSsBenefitMonthly)
      : { b62: 0, b67: 0, b70: 0 }
  return {
    dateOfBirth: form.dob,
    targetRetirementAge: form.retireAge,
    ...accountBasesFromForm(form),
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
    spouseHasOwnEarnings,
    spouseBenefit62: married ? spouseSs.b62 : 0,
    spouseBenefit67: married ? spouseSs.b67 : 0,
    spouseBenefit70: married ? spouseSs.b70 : 0,
  }
}

export function OnboardingOverlay({
  inputs,
  setInputs,
  setUi,
  onComplete,
  onCancel,
  saveUserPrefs,
  onConnectAccounts,
  onAccountsSaved,
}: Props) {
  const [step, setStep] = useState<Step>('profile')
  const [form, setForm] = useState(() => initialFormFromInputs(inputs))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [accountsValidationShown, setAccountsValidationShown] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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
  const profileFieldsOk = dobOk && ageOk && retireOk
  const profileValid = profileFieldsOk
  const accountsValid = hasValidManualAccountEntries(form.accountEntries)
  const spouseDobOk = !form.includeSpouse || isValidIsoDateString(form.spouseDob)
  const spouseBenefitOk =
    !form.includeSpouse || form.spouseClaimMode === 'spousal' || form.spouseSsBenefitMonthly > 0
  const ssValid =
    !form.includeSs ||
    (form.ssBenefitMonthly > 0 && spouseDobOk && spouseBenefitOk)

  async function persistAndFinish(openConnect = false) {
    setErr(null)
    if (busy) return
    setBusy(true)
    const patch = formToCalculatorPatch(form)
    const lo = Math.max(50, ageToday! + 1)
    const targetRetirementAge = Math.min(RETIRE_AGE_MAX, Math.max(lo, Math.round(form.retireAge)))
    const finalPatch = { ...patch, targetRetirementAge }
    setInputs(finalPatch)
    setUi?.({ ssIncluded: form.includeSs })
    if (form.accountsStepCompleted) {
      onAccountsSaved?.()
    }
    const prefs: UserPrefs = {
      dob: form.dob,
      retirementAge: targetRetirementAge,
      monthlyGoal: Math.max(0, form.monthlyGoal),
      ssClaimingAge: form.ssAge,
    }
    if (!calculatorInputsToPlanningPrefs({ ...inputs, ...finalPatch })) {
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
    if (!profileFieldsOk) {
      setErr(
        !dobOk || !ageOk
          ? 'Enter a valid date of birth (you must be between 18 and 100).'
          : `Retirement age must be between ${retireLo} and ${RETIRE_AGE_MAX}.`,
      )
      return
    }
    setStep('accounts')
  }

  function onAccountsBack() {
    setErr(null)
    setAccountsValidationShown(false)
    setStep('profile')
  }

  function onAccountsContinue() {
    setErr(null)
    if (!accountsValid) {
      setAccountsValidationShown(true)
      return
    }
    const entries = normalizedManualAccountEntries(form.accountEntries)
    saveCompletedManualAccounts(entries)
    setForm((f) => ({
      ...f,
      accountEntries: entries,
      accountsStepCompleted: true,
      accountsStepSkipped: false,
    }))
    setAccountsValidationShown(false)
    setStep('social-security')
  }

  function onSsContinue() {
    setErr(null)
    if (!ssValid) {
      if (form.includeSs && form.ssBenefitMonthly <= 0) {
        setErr('Enter your expected Social Security benefit.')
        return
      }
      if (form.includeSs && !spouseDobOk) {
        setErr('Enter a valid date of birth for your spouse.')
        return
      }
      if (form.includeSs) {
        setErr('Complete all Social Security fields before continuing.')
      }
      return
    }
    setStep('income-goal')
  }

  function onFinishWelcome() {
    setErr(null)
    if (!profileValid || !ssValid) {
      setErr('Complete all fields before continuing.')
      return
    }
    void persistAndFinish(false)
  }

  function handleCancel() {
    if (busy) return
    setErr(null)
    onCancel?.()
  }

  const headerTitle =
    step === 'profile'
      ? 'Welcome.'
      : step === 'accounts'
        ? "Let's see what you're working with"
        : step === 'social-security'
          ? 'Social Security'
          : 'Almost there:'

  const headerSubtitle =
    step === 'profile'
      ? 'To get started, tell us a little about you'
      : step === 'accounts'
        ? null
        : step === 'social-security'
          ? 'Help us estimate your benefits in retirement'
          : null

  const spouseBenefitDisplay = effectiveSpouseBenefitMonthly(form)
  const ssFieldsActive = form.includeSs
  const retireAgeFilled = Number.isFinite(form.retireAge) && form.retireAge > 0
  const accountsTotal = form.accountEntries.reduce(
    (sum, entry) => sum + Math.max(0, Math.round(entry.balance)),
    0,
  )

  if (!mounted) return null

  return createPortal(
    <div
      className={[
        'onboarding-overlay',
        'onboarding-overlay--in-app',
        step === 'income-goal' ? ' onboarding-overlay--income-goal' : '',
      ]
        .filter(Boolean)
        .join('')}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-overlay-title"
    >
      <div className="onboarding-overlay__panel">
        <header className="onboarding-overlay__header">
          <div className="onboarding-overlay__title-stack">
            <h2 id="onboarding-overlay-title" className="onboarding-overlay__title">
              {headerTitle}
            </h2>
            {headerSubtitle ? (
              <p className="onboarding-overlay__subtitle">{headerSubtitle}</p>
            ) : null}
            {step === 'accounts' ? (
              <p className="onboarding-overlay__accounts-import-note">
                Add each account type and balance. You can easily connect accounts (via csv import or auto-connection)
                after setup.
              </p>
            ) : null}
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
                      <DateOfBirthSelects
                        value={form.dob}
                        onChange={(iso) => setForm((f) => ({ ...f, dob: iso }))}
                        includeDay={false}
                      />
                      {dobOk ? <DobAgeToday key={form.dob} iso={form.dob} /> : null}
                    </div>
                    <p className="onboarding-overlay__field-hint">{WELCOME_FIELD_HINTS.dob}</p>
                  </div>
                </div>

                <div className="onboarding-overlay__field-grid">
                  <CurrencyAmountInput
                    id="welcome-household-income"
                    label="Household income"
                    value={form.householdIncome}
                    onChange={(n) => setForm((f) => ({ ...f, householdIncome: n }))}
                    placeholder={WELCOME_FIELD_PLACEHOLDERS.householdIncome}
                    hint={WELCOME_FIELD_HINTS.householdIncome}
                    externalPrefix
                    showFillState
                  />
                  <CurrencyAmountInput
                    id="welcome-monthly-contribution"
                    label="Monthly contribution"
                    value={form.monthlyContribution}
                    onChange={(n) => setForm((f) => ({ ...f, monthlyContribution: n }))}
                    placeholder={WELCOME_FIELD_PLACEHOLDERS.monthlyContribution}
                    showAnnualEquivalent
                    hint={WELCOME_FIELD_HINTS.monthlyContribution}
                    externalPrefix
                    showFillState
                  />
                  <div className="config-plan-field">
                    <label className="config-plan-label" htmlFor="welcome-retire-age">
                      Target retirement age
                    </label>
                    <div
                      className={[
                        'onboarding-field-shell',
                        'onboarding-overlay__age-input-wrap',
                        retireAgeFilled ? 'onboarding-field-shell--filled' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <input
                        id="welcome-retire-age"
                        type="text"
                        inputMode="decimal"
                        className="onboarding-field-shell__input onboarding-overlay__age-input"
                        value={String(form.retireAge)}
                        onChange={(e) => setForm((f) => ({ ...f, retireAge: Math.round(parseNum(e.target.value)) }))}
                      />
                      {retireAgeFilled ? (
                        <span className="onboarding-field-shell__check" aria-hidden>
                          <IconCheck size={14} strokeWidth={2} />
                        </span>
                      ) : null}
                    </div>
                    <p className="onboarding-overlay__field-hint">{WELCOME_FIELD_HINTS.targetRetirementAge}</p>
                  </div>
                </div>
              </>
            ) : step === 'accounts' ? (
              <OnboardingAccountsStep
                entries={form.accountEntries}
                onChange={(accountEntries) => setForm((f) => ({ ...f, accountEntries }))}
                validationError={accountsValidationShown && !accountsValid ? ACCOUNTS_REQUIRED_MSG : null}
              />
            ) : step === 'social-security' ? (
              <>
                <div className="onboarding-overlay__section onboarding-overlay__section--ss-toggle">
                  <div className="onboarding-overlay__ss-toggle-row">
                    <span className="config-plan-label" id="welcome-include-ss-label">
                      Include Social Security
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-labelledby="welcome-include-ss-label"
                      aria-checked={form.includeSs}
                      className={`onboarding-overlay__ss-toggle${form.includeSs ? ' onboarding-overlay__ss-toggle--on' : ''}`}
                      onClick={() => setForm((f) => ({ ...f, includeSs: !f.includeSs }))}
                    >
                      <span className="onboarding-overlay__ss-toggle-track" aria-hidden />
                    </button>
                  </div>
                </div>

                <div
                  className={`onboarding-overlay__ss-fields${form.includeSs ? '' : ' onboarding-overlay__ss-fields--disabled'}`}
                >
                  <div className="onboarding-overlay__ss-claim-row">
                    <div className="config-plan-field">
                      <span className="config-plan-label">When do you plan to claim Social Security?</span>
                      <ClaimAgeSlider
                        value={form.ssAge}
                        onChange={(age) => setForm((f) => ({ ...f, ssAge: age }))}
                        ariaLabel="Your Social Security claiming age"
                        dateOfBirth={form.dob}
                        disabled={!form.includeSs}
                      />
                      <p className="onboarding-overlay__field-hint">{WELCOME_FIELD_HINTS.ssClaimAge}</p>
                    </div>
                    <CurrencyAmountInput
                      id="welcome-ss-benefit"
                      label={`Expected benefit at ${form.ssAge}`}
                      value={form.ssBenefitMonthly}
                      onChange={(n) => setForm((f) => ({ ...f, ssBenefitMonthly: n }))}
                      hint={WELCOME_FIELD_HINTS.ssBenefit}
                      disabled={!form.includeSs}
                      externalPrefix
                      showFillState
                    />
                  </div>

                  <div className="onboarding-overlay__section onboarding-overlay__section--spouse">
                    <div className="onboarding-overlay__ss-toggle-row">
                      <span className="config-plan-label" id="welcome-include-spouse-label">
                        Include my spouse
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-labelledby="welcome-include-spouse-label"
                        aria-checked={form.includeSpouse}
                        disabled={!ssFieldsActive}
                        className={`onboarding-overlay__ss-toggle${form.includeSpouse ? ' onboarding-overlay__ss-toggle--on' : ''}`}
                        onClick={() => setForm((f) => ({ ...f, includeSpouse: !f.includeSpouse }))}
                      >
                        <span className="onboarding-overlay__ss-toggle-track" aria-hidden />
                      </button>
                    </div>
                    <p className="onboarding-overlay__field-hint">{WELCOME_FIELD_HINTS.includeSpouse}</p>

                    {form.includeSpouse ? (
                      <div className="onboarding-overlay__spouse-fields">
                        <span className="config-plan-label" id="welcome-spouse-claim-mode-label">
                          How will your spouse claim Social Security?
                        </span>
                        <SpouseClaimModeSegment
                          value={form.spouseClaimMode}
                          onChange={(mode) => setForm((f) => ({ ...f, spouseClaimMode: mode }))}
                          spousalHint={SPOUSE_CLAIM_MODE_TOOLTIP}
                          disabled={!ssFieldsActive}
                        />

                        <div className="config-plan-field planning-profile-fields__dob">
                          <span className="config-plan-label">Spouse date of birth</span>
                          <DateOfBirthSelects
                            value={form.spouseDob}
                            onChange={(iso) => setForm((f) => ({ ...f, spouseDob: iso }))}
                            includeDay={false}
                          />
                        </div>

                        <div className="onboarding-overlay__ss-claim-row">
                          <div className="config-plan-field">
                            <span className="config-plan-label">When will your spouse claim Social Security?</span>
                            <ClaimAgeSlider
                              value={form.spouseSsAge}
                              onChange={(age) => setForm((f) => ({ ...f, spouseSsAge: age }))}
                              ariaLabel="Spouse Social Security claiming age"
                              dateOfBirth={form.spouseDob}
                              disabled={!ssFieldsActive}
                            />
                          </div>
                          <CurrencyAmountInput
                            id="welcome-spouse-ss"
                            label={`Expected benefit at ${form.spouseSsAge}`}
                            value={spouseBenefitDisplay}
                            onChange={(n) => setForm((f) => ({ ...f, spouseSsBenefitMonthly: n }))}
                            readOnly={form.spouseClaimMode === 'spousal'}
                            disabled={!ssFieldsActive}
                            externalPrefix
                            showFillState
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </>
            ) : (
              <div className="onboarding-overlay__goal-step">
                <CurrencyAmountInput
                  id="welcome-monthly-goal"
                  className="onboarding-overlay__goal-input"
                  label="How much would you like each month in retirement, after taxes?"
                  value={form.monthlyGoal}
                  onChange={(n) => setForm((f) => ({ ...f, monthlyGoal: n }))}
                  placeholder={WELCOME_FIELD_PLACEHOLDERS.monthlyIncomeGoal}
                  externalPrefix
                  hint={WELCOME_FIELD_HINTS.monthlyIncomeGoal}
                  showFillState
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
                disabled={!profileFieldsOk || busy}
                onClick={onProfileContinue}
              >
                Continue
              </button>
            </div>
          ) : step === 'accounts' ? (
            <>
              <div className="onboarding-overlay__accounts-total">
                <span className="onboarding-overlay__accounts-total-label">Total across all accounts</span>
                <span className="onboarding-overlay__accounts-total-value">{fmt(accountsTotal)}</span>
              </div>
              <div className="onboarding-overlay__footer-actions onboarding-overlay__footer-actions--accounts">
                <button
                  type="button"
                  className="onboarding-overlay__btn onboarding-overlay__btn--muted"
                  disabled={busy}
                  onClick={onAccountsBack}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="onboarding-overlay__btn onboarding-overlay__btn--primary"
                  disabled={busy}
                  onClick={onAccountsContinue}
                >
                  Continue
                </button>
              </div>
            </>
          ) : step === 'social-security' ? (
            <div className="onboarding-overlay__footer-actions">
              <button
                type="button"
                className="onboarding-overlay__btn onboarding-overlay__btn--muted"
                disabled={busy}
                onClick={() => {
                  setErr(null)
                  setStep('accounts')
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
                disabled={busy}
                onClick={onFinishWelcome}
              >
                {busy ? 'Saving…' : 'Continue to dashboard'}
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>,
    document.body,
  )
}
