import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";
import type { CalculatorInputs, CalculatorUi } from "../lib/computeResults";
import { ageFromIsoDateString, isValidIsoDateString } from "../lib/ageFromDob";
import {
  calculatorInputsToPlanningPrefs,
  markWelcomeCompletedLocal,
  saveLocalUserPrefs,
  type UserPrefs,
} from "../lib/userPrefs";
import { canWritePlanLocalStorage, savePlanProfile } from "../lib/planStorage";
import { setSessionOnboardingComplete } from "../lib/sessionFlags";
import {
  clearForceOnboardingSession,
  consumeOnboardingFromSignup,
  peekOnboardingFromSignup,
} from "../lib/welcomeGate";
import { useAuth } from "../context/AuthContext";
import { clampClaimAge, ssTripletFromMonthlyAt67 } from "../lib/socialSecurity";
import { syncDisplayCurrencyFromResidence } from "../lib/displayCurrency";
import {
  findOnboardingRegion,
  normalizeOnboardingRegionId,
  type OnboardingRegionId,
} from "../lib/onboardingRegions";
import {
  loadUserProfile,
  profileToFormDefaults,
  resolveOnboardingStartStep,
  saveProfileFromFormSlice,
  saveRegionToProfile,
  type OnboardingFormProfileSlice,
} from "../lib/userProfileStorage";
import { buildWelcomeSampleAccountEntries } from "../lib/welcomeSampleAccounts";
import { WELCOME_BENCHMARK } from "../lib/welcomeBenchmarkDefaults";
import { pensionConfigForLocale } from "../lib/localePensionConfig";
import { estimateSsMonthlyAt67FromAnnualIncome } from "../lib/onboardingSsCompare";
import { OnboardingProgressSteps } from "./OnboardingProgressSteps";
import { OnboardingSavingsComparisonBar } from "./OnboardingSavingsComparisonBar";
import { type SpouseClaimMode } from "./SpouseClaimModeSegment";
import { SocialSecuritySetupFields } from "./SocialSecuritySetupFields";
import { WelcomeGoalStepFields } from "./WelcomeGoalStepFields";
import { WelcomeProfileStepFields } from "./WelcomeProfileStepFields";
import {
  hasValidManualAccountEntries,
  normalizedManualAccountEntries,
  OnboardingAccountsStep,
} from "./OnboardingAccountsStep";
import { fmt } from "../utils/format";
import {
  aggregateManualAccountsToBases,
  loadStoredManualAccounts,
  emptyOnboardingAccountEntries,
  saveCompletedManualAccounts,
} from "../lib/manualAccountEntries";
import "./ConfigDrawerBody.scss";
import "./PlanningProfileFields.scss";
import "./SidePanelShell.scss";
import "./SocialSecuritySetupFields.scss";
import "./WelcomeProfileStepFields.scss";
import "./WelcomeGoalStepFields.scss";
import "./OnboardingAccountsStep.scss";
import "./OnboardingOverlay.scss";
import "./OnboardingFieldShell.scss";
import "./OnboardingProgressSteps.scss";
const BODY_CLASS = "onboarding-overlay--open";
const RETIRE_AGE_MAX = 80;

const ACCOUNTS_REQUIRED_MSG =
  "Enter at least one account type and balance to continue.";

import "./OnboardingSavingsComparisonBar.scss";

type WizardStep = "profile" | "accounts" | "social-security" | "income-goal";
type ProgressStep = WizardStep;

type Props = {
  /** Live header stack height (px) — positions welcome sheet flush below chrome. */
  headerStackHeight?: number | null;
  inputs: CalculatorInputs;
  setInputs: (p: Partial<CalculatorInputs>) => void;
  setUi?: (p: Partial<CalculatorUi>) => void;
  onComplete: () => void;
  /** Dismiss welcome without saving; dashboard stays empty. */
  /** When set, prefs are written to the user profile on submit. */
  saveUserPrefs?: (prefs: UserPrefs) => Promise<{ error?: string }>;
  /** After welcome, open the account import flow on the dashboard. */
  onConnectAccounts?: () => void;
  /** After Your Accounts step saves typed account rows. */
  onAccountsSaved?: () => void;
};

function initialFormFromInputs(inputs: CalculatorInputs) {
  const storedProfile = loadUserProfile();
  const profileDefaults = profileToFormDefaults(storedProfile);
  const dob = profileDefaults.dob || inputs.dateOfBirth || "";
  const storedAccounts = loadStoredManualAccounts();
  return {
    dob,
    currentResidence:
      profileDefaults.currentResidence || inputs.residenceCountry || "",
    locale: normalizeOnboardingRegionId(profileDefaults.locale) ?? undefined,
    currency: profileDefaults.currency,
    householdIncome:
      profileDefaults.householdIncome ?? (inputs.other > 0 ? inputs.other : 0),
    monthlyContribution:
      profileDefaults.monthlyContribution ??
      (inputs.save > 0 ? Math.round(inputs.save / 12) : 0),
    retireAge:
      profileDefaults.retireAge ||
      inputs.targetRetirementAge ||
      WELCOME_BENCHMARK.targetRetirementAge,
    monthlyGoal:
      profileDefaults.monthlyGoal ??
      (inputs.monthlyIncomeGoal > 0 ? inputs.monthlyIncomeGoal : 0),
    includeSs:
      profileDefaults.includeSs ??
      (inputs.ssBenefit62 > 0 &&
        inputs.ssBenefit67 > 0 &&
        inputs.ssBenefit70 > 0),
    ssAge:
      profileDefaults.ssAge ??
      (inputs.ssAge ? clampClaimAge(inputs.ssAge) : 67),
    ssBenefitMonthly:
      profileDefaults.ssBenefitMonthly ??
      (inputs.ssBenefit67 > 0 ? inputs.ssBenefit67 : 0),
    includeSpouse: profileDefaults.includeSpouse ?? false,
    spouseClaimMode:
      profileDefaults.spouseClaimMode ??
      ((inputs.spouseHasOwnEarnings === false
        ? "spousal"
        : "own") as SpouseClaimMode),
    spouseDob: profileDefaults.spouseDob || inputs.spouseDateOfBirth || "",
    spouseSsBenefitMonthly:
      profileDefaults.spouseSsBenefitMonthly ??
      (inputs.spouseBenefit67 ||
        Math.round(WELCOME_BENCHMARK.ssBenefitMonthlyAt67 * 0.5)),
    spouseSsAge:
      profileDefaults.spouseSsAge ??
      (inputs.spouseClaimAge ? clampClaimAge(inputs.spouseClaimAge) : 67),
    accountEntries:
      storedAccounts?.entries.length && storedAccounts.onboardingCompleted
        ? storedAccounts.entries
        : emptyOnboardingAccountEntries(),
    accountsStepCompleted: storedAccounts?.onboardingCompleted ?? false,
    accountsStepSkipped: storedAccounts?.onboardingSkipped ?? false,
  };
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
    };
  }
  return aggregateManualAccountsToBases(form.accountEntries);
}

function formToCalculatorPatch(
  form: ReturnType<typeof initialFormFromInputs>,
): Partial<CalculatorInputs> {
  const ss = form.includeSs
    ? ssTripletFromMonthlyAt67(form.ssBenefitMonthly)
    : { b62: 0, b67: 0, b70: 0 };
  const married = form.includeSpouse;
  const spouseHasOwnEarnings = form.spouseClaimMode === "own";
  const spouseSs =
    form.includeSs && married && spouseHasOwnEarnings
      ? ssTripletFromMonthlyAt67(form.spouseSsBenefitMonthly)
      : { b62: 0, b67: 0, b70: 0 };
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
    spouseDateOfBirth: married ? form.spouseDob : "",
    spouseClaimAge: form.spouseSsAge,
    spouseHasOwnEarnings,
    spouseBenefit62: married ? spouseSs.b62 : 0,
    spouseBenefit67: married ? spouseSs.b67 : 0,
    spouseBenefit70: married ? spouseSs.b70 : 0,
    residenceCountry: form.currentResidence,
  };
}

export function OnboardingOverlay({
  headerStackHeight,
  inputs,
  setInputs,
  setUi,
  onComplete,
  saveUserPrefs,
  onConnectAccounts,
  onAccountsSaved,
}: Props) {
  const { user } = useAuth();
  const storedProfile = loadUserProfile();
  const [step, setStep] = useState<WizardStep>(() =>
    resolveOnboardingStartStep(storedProfile, {
      forceRegion: peekOnboardingFromSignup(),
    }),
  );
  const [form, setForm] = useState(() => initialFormFromInputs(inputs));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [exiting, setExiting] = useState(false);
  const [accountsValidationShown, setAccountsValidationShown] = useState(false);
  const ssBenefitUserEdited = useRef(false);
  const spouseSsBenefitUserEdited = useRef(false);

  useLayoutEffect(() => {
    document.body.classList.add(BODY_CLASS);
    return () => {
      document.body.classList.remove(BODY_CLASS);
    };
  }, []);

  useEffect(() => {
    if (!user || user.onboardingDone) return;
    if (consumeOnboardingFromSignup()) {
      setStep("profile");
    }
  }, [user?.id, user?.onboardingDone]);

  useEffect(() => {
    syncDisplayCurrencyFromResidence(form.currentResidence);
  }, [form.currentResidence]);

  useEffect(() => {
    if (step !== "social-security") {
      ssBenefitUserEdited.current = false;
      spouseSsBenefitUserEdited.current = false;
      return;
    }
    if (ssBenefitUserEdited.current) return;
    const est = estimateSsMonthlyAt67FromAnnualIncome(
      form.householdIncome,
      form.locale,
    );
    setForm((f) => {
      if (f.ssBenefitMonthly === est) return f;
      const next = { ...f, ssBenefitMonthly: est };
      if (
        !spouseSsBenefitUserEdited.current &&
        f.includeSpouse &&
        f.spouseClaimMode === "own"
      ) {
        next.spouseSsBenefitMonthly = Math.round(est * 0.5);
      }
      return next;
    });
  }, [
    step,
    form.householdIncome,
    form.includeSpouse,
    form.spouseClaimMode,
    form.locale,
  ]);

  const dobOk = isValidIsoDateString(form.dob);
  const ageToday = dobOk ? ageFromIsoDateString(form.dob) : null;
  const ageOk = ageToday !== null && ageToday >= 18 && ageToday <= 100;
  const retireLo = dobOk && ageToday !== null ? Math.max(50, ageToday + 1) : 50;
  const retireOk =
    Number.isFinite(form.retireAge) &&
    form.retireAge >= retireLo &&
    form.retireAge <= RETIRE_AGE_MAX;
  const regionOk = Boolean(normalizeOnboardingRegionId(form.locale));
  const profileFieldsOk = dobOk && ageOk && regionOk;
  const profileValid = profileFieldsOk;

  function formProfileSlice(): OnboardingFormProfileSlice {
    return {
      currentResidence: form.currentResidence,
      locale: form.locale,
      currency: form.currency,
      dob: form.dob,
      householdIncome: form.householdIncome,
      monthlyContribution: form.monthlyContribution,
      includeSs: form.includeSs,
      ssAge: form.ssAge,
      ssBenefitMonthly: form.ssBenefitMonthly,
      includeSpouse: form.includeSpouse,
      spouseClaimMode: form.spouseClaimMode,
      spouseDob: form.spouseDob,
      spouseSsAge: form.spouseSsAge,
      spouseSsBenefitMonthly: form.spouseSsBenefitMonthly,
      retireAge: form.retireAge,
      monthlyGoal: form.monthlyGoal,
    };
  }

  function applyRegionSelection(regionId: OnboardingRegionId) {
    const region = findOnboardingRegion(regionId);
    if (!region) return;
    saveRegionToProfile(regionId);
    syncDisplayCurrencyFromResidence(region.country);
    const pension = pensionConfigForLocale(region.locale);
    setForm((f) => ({
      ...f,
      currentResidence: region.country,
      locale: region.locale,
      currency: region.currency,
      accountEntries: emptyOnboardingAccountEntries(),
      ssAge: pension.defaultClaimAge,
      spouseSsAge: pension.defaultClaimAge,
      ssBenefitMonthly: pension.defaultBenefitMonthlyAt67,
    }));
  }
  const accountsValid = hasValidManualAccountEntries(form.accountEntries);
  const spouseDobOk =
    !form.includeSpouse || isValidIsoDateString(form.spouseDob);
  const spouseBenefitOk =
    !form.includeSpouse ||
    form.spouseClaimMode === "spousal" ||
    form.spouseSsBenefitMonthly > 0;
  const ssValid =
    !form.includeSs ||
    (form.ssBenefitMonthly > 0 && spouseDobOk && spouseBenefitOk);

  async function persistAndFinish(
    formState: ReturnType<typeof initialFormFromInputs>,
    options?: { openConnect?: boolean; fadeOut?: boolean },
  ) {
    setErr(null);
    if (busy) return;
    setBusy(true);
    const patch = formToCalculatorPatch(formState);
    const snapshotAge = isValidIsoDateString(formState.dob)
      ? ageFromIsoDateString(formState.dob)
      : null;
    const lo = Math.max(50, (snapshotAge ?? 50) + 1);
    const targetRetirementAge = Math.min(
      RETIRE_AGE_MAX,
      Math.max(lo, Math.round(formState.retireAge)),
    );
    const finalPatch = { ...patch, targetRetirementAge };
    setInputs(finalPatch);
    setUi?.({ ssIncluded: formState.includeSs });
    if (formState.accountsStepCompleted) {
      onAccountsSaved?.();
    }
    const prefs: UserPrefs = {
      dob: formState.dob,
      retirementAge: targetRetirementAge,
      monthlyGoal: Math.max(0, formState.monthlyGoal),
      ssClaimingAge: formState.ssAge,
      residenceCountry: formState.currentResidence,
    };
    if (!calculatorInputsToPlanningPrefs({ ...inputs, ...finalPatch })) {
      setBusy(false);
      setErr("Complete all plan fields before continuing.");
      return;
    }
    if (saveUserPrefs) {
      const { error } = await saveUserPrefs(prefs);
      if (error) {
        setBusy(false);
        setErr(error);
        return;
      }
    } else {
      saveLocalUserPrefs(prefs);
    }
    saveProfileFromFormSlice(formProfileSlice(), "income-goal");
    setSessionOnboardingComplete(true);
    if (canWritePlanLocalStorage()) {
      savePlanProfile({ onboardingComplete: true });
    }
    markWelcomeCompletedLocal();
    clearForceOnboardingSession();
    setBusy(false);
    const openConnect = options?.openConnect ?? false;
    if (options?.fadeOut) {
      setExiting(true);
      window.setTimeout(() => {
        onComplete();
        if (openConnect) onConnectAccounts?.();
      }, 320);
      return;
    }
    onComplete();
    if (openConnect) onConnectAccounts?.();
  }

  function onProfileContinue() {
    setErr(null);
    if (!regionOk) {
      setErr("Select United States or Canada.");
      return;
    }
    if (!dobOk || !ageOk) {
      setErr("Enter a valid date of birth (you must be between 18 and 100).");
      return;
    }
    saveProfileFromFormSlice(formProfileSlice(), "profile");
    setForm((f) => ({ ...f, accountEntries: emptyOnboardingAccountEntries() }));
    setStep("accounts");
  }

  function onProfileSkipWithSample() {
    if (busy || exiting) return;
    setErr(null);
    if (!profileFieldsOk) return;
    const entries = buildWelcomeSampleAccountEntries();
    saveCompletedManualAccounts(entries);
    const skipForm = {
      ...form,
      accountEntries: entries,
      accountsStepCompleted: true,
      accountsStepSkipped: false,
      includeSs: false,
      ssBenefitMonthly: 0,
      includeSpouse: false,
      spouseDob: "",
      spouseSsBenefitMonthly: 0,
      householdIncome:
        form.householdIncome || WELCOME_BENCHMARK.householdIncomeAnnual,
      monthlyContribution:
        form.monthlyContribution || WELCOME_BENCHMARK.monthlyContribution,
      retireAge: form.retireAge || WELCOME_BENCHMARK.targetRetirementAge,
      monthlyGoal: form.monthlyGoal || WELCOME_BENCHMARK.monthlyIncomeGoal,
    };
    void persistAndFinish(skipForm, { fadeOut: true });
  }

  function onAccountsBack() {
    setErr(null);
    setAccountsValidationShown(false);
    setStep("profile");
  }

  function onAccountsContinue() {
    setErr(null);
    if (!accountsValid) {
      setAccountsValidationShown(true);
      return;
    }
    const entries = normalizedManualAccountEntries(form.accountEntries);
    saveCompletedManualAccounts(entries);
    setForm((f) => ({
      ...f,
      accountEntries: entries,
      accountsStepCompleted: true,
      accountsStepSkipped: false,
    }));
    setAccountsValidationShown(false);
    setStep("social-security");
  }

  function onSsContinue() {
    setErr(null);
    if (!ssValid) {
      if (form.includeSs && form.ssBenefitMonthly <= 0) {
        setErr("Enter your expected Social Security benefit.");
        return;
      }
      if (form.includeSs && !spouseDobOk) {
        setErr("Enter a valid date of birth for your spouse.");
        return;
      }
      if (form.includeSs) {
        setErr("Complete all Social Security fields before continuing.");
      }
      return;
    }
    saveProfileFromFormSlice(formProfileSlice(), "social-security");
    setStep("income-goal");
  }

  function onFinishWelcome() {
    setErr(null);
    if (!profileValid || !ssValid) {
      setErr("Complete all fields before continuing.");
      return;
    }
    if (!retireOk) {
      setErr(
        `Retirement age must be between ${retireLo} and ${RETIRE_AGE_MAX}.`,
      );
      return;
    }
    void persistAndFinish(form);
  }

  const headerTitle =
    step === "profile"
      ? "Let's start with you"
      : step === "accounts"
        ? "Let's see what you're working with"
        : step === "social-security"
          ? pensionConfigForLocale(form.locale).stepTitle
          : "Almost there.";

  const headerSubtitle =
    step === "profile"
      ? "We'll use industry benchmarks to fill in smart defaults."
      : step === "accounts"
        ? null
        : step === "social-security"
          ? pensionConfigForLocale(form.locale).stepSubtitle
          : null;

  const progressStep: ProgressStep = step;

  const accountsTotal = form.accountEntries.reduce(
    (sum, entry) => sum + Math.max(0, Math.round(entry.balance)),
    0,
  );

  const stackTopStyle =
    headerStackHeight != null && headerStackHeight > 0
      ? ({
          top: `${headerStackHeight}px`,
          height: `calc(100dvh - ${headerStackHeight}px)`,
          bottom: "auto",
        } as CSSProperties)
      : undefined;

  return (
    <div
      className={[
        "onboarding-overlay",
        "onboarding-overlay--in-app",
        step === "income-goal" ? " onboarding-overlay--income-goal" : "",
        step === "accounts" ? " onboarding-overlay--accounts" : "",
        exiting ? " onboarding-overlay--exit" : "",
      ]
        .filter(Boolean)
        .join("")}
      style={stackTopStyle}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-overlay-title"
    >
      <div className="onboarding-overlay__panel">
        <header className="onboarding-overlay__header">
          <OnboardingProgressSteps
            activeStep={progressStep}
            className="onboarding-overlay__progress"
          />
          {headerTitle ? (
            <div className="onboarding-overlay__title-stack">
              <h2
                id="onboarding-overlay-title"
                className="onboarding-overlay__title"
              >
                {headerTitle}
              </h2>
              {headerSubtitle ? (
                <p className="onboarding-overlay__subtitle">{headerSubtitle}</p>
              ) : null}
              {step === "accounts" ? (
                <p className="onboarding-overlay__accounts-import-note">
                  Add each account type and balance. You can easily connect
                  accounts (via csv import or auto-connection) after setup.
                </p>
              ) : null}
            </div>
          ) : null}
        </header>

        <SimpleBar
          className="side-panel-shell__scroll onboarding-overlay__scroll"
          autoHide={false}
        >
          <div className="onboarding-overlay__body">
            {step === "profile" ? (
              <WelcomeProfileStepFields
                regionId={form.locale}
                onRegionSelect={applyRegionSelection}
                dateOfBirth={form.dob}
                onDateOfBirth={(iso) => setForm((f) => ({ ...f, dob: iso }))}
                ageToday={ageToday}
                householdIncome={form.householdIncome}
                onHouseholdIncome={(householdIncome) =>
                  setForm((f) => ({ ...f, householdIncome }))
                }
                monthlyContribution={form.monthlyContribution}
                onMonthlyContribution={(monthlyContribution) =>
                  setForm((f) => ({ ...f, monthlyContribution }))
                }
                showFillState
              />
            ) : step === "accounts" ? (
              <OnboardingAccountsStep
                accountLocale={form.locale}
                entries={form.accountEntries}
                onChange={(accountEntries) =>
                  setForm((f) => ({ ...f, accountEntries }))
                }
                validationError={
                  accountsValidationShown && !accountsValid
                    ? ACCOUNTS_REQUIRED_MSG
                    : null
                }
              />
            ) : step === "social-security" ? (
              <SocialSecuritySetupFields
                includeSs={form.includeSs}
                onIncludeSsChange={(includeSs) =>
                  setForm((f) => ({ ...f, includeSs }))
                }
                ssAge={form.ssAge}
                onSsAgeChange={(ssAge) => setForm((f) => ({ ...f, ssAge }))}
                ssBenefitMonthly={form.ssBenefitMonthly}
                onSsBenefitMonthlyChange={(ssBenefitMonthly) => {
                  ssBenefitUserEdited.current = true;
                  setForm((f) => ({ ...f, ssBenefitMonthly }));
                }}
                dateOfBirth={form.dob}
                includeSpouse={form.includeSpouse}
                onIncludeSpouseChange={(includeSpouse) =>
                  setForm((f) => ({ ...f, includeSpouse }))
                }
                spouseClaimMode={form.spouseClaimMode}
                onSpouseClaimModeChange={(spouseClaimMode) =>
                  setForm((f) => ({ ...f, spouseClaimMode }))
                }
                spouseDob={form.spouseDob}
                onSpouseDobChange={(spouseDob) =>
                  setForm((f) => ({ ...f, spouseDob }))
                }
                spouseSsAge={form.spouseSsAge}
                onSpouseSsAgeChange={(spouseSsAge) =>
                  setForm((f) => ({ ...f, spouseSsAge }))
                }
                spouseBenefitMonthly={form.spouseSsBenefitMonthly}
                onSpouseBenefitMonthlyChange={(spouseSsBenefitMonthly) => {
                  spouseSsBenefitUserEdited.current = true;
                  setForm((f) => ({ ...f, spouseSsBenefitMonthly }));
                }}
                locale={form.locale}
                showFillState
              />
            ) : (
              <WelcomeGoalStepFields
                monthlyGoal={form.monthlyGoal}
                onMonthlyGoalChange={(monthlyGoal) =>
                  setForm((f) => ({ ...f, monthlyGoal }))
                }
                retireAge={form.retireAge}
                onRetireAgeChange={(retireAge) =>
                  setForm((f) => ({ ...f, retireAge }))
                }
                dateOfBirth={form.dob}
                centered
                showFillState
              />
            )}
          </div>
        </SimpleBar>

        <footer className="onboarding-overlay__footer">
          {err ? (
            <p className="onboarding-overlay__err" role="alert">
              {err}
            </p>
          ) : null}
          {step === "profile" ? (
            <div className="onboarding-overlay__footer-actions">
              <button
                type="button"
                className="onboarding-overlay__btn onboarding-overlay__btn--primary"
                disabled={!profileFieldsOk || busy}
                onClick={onProfileContinue}
              >
                Continue
              </button>
            </div>
          ) : step === "accounts" ? (
            <>
              <div className="onboarding-overlay__accounts-total">
                <span className="onboarding-overlay__accounts-total-label">
                  Total across all accounts
                </span>
                <span className="onboarding-overlay__accounts-total-value">
                  {fmt(accountsTotal)}
                </span>
              </div>
              <OnboardingSavingsComparisonBar
                totalSavings={accountsTotal}
                age={ageToday}
              />
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
                  disabled={busy || !accountsValid}
                  onClick={onAccountsContinue}
                >
                  Continue
                </button>
              </div>
              <div className="onboarding-overlay__skip-wrap onboarding-overlay__skip-wrap--visible">
                <button
                  type="button"
                  className="onboarding-overlay__skip-link"
                  disabled={busy || exiting || !profileFieldsOk}
                  onClick={onProfileSkipWithSample}
                >
                  Skip this setup and show me the dashboard with sample data.
                </button>
              </div>
            </>
          ) : step === "social-security" ? (
            <div className="onboarding-overlay__footer-actions">
              <button
                type="button"
                className="onboarding-overlay__btn onboarding-overlay__btn--muted"
                disabled={busy}
                onClick={() => {
                  setErr(null);
                  setStep("accounts");
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
                  setErr(null);
                  setStep("social-security");
                }}
              >
                Back
              </button>
              <button
                type="button"
                className="onboarding-overlay__btn onboarding-overlay__btn--primary"
                disabled={!retireOk || busy}
                onClick={onFinishWelcome}
              >
                {busy ? "Saving…" : "Continue to dashboard"}
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
