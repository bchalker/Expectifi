import { useEffect, useLayoutEffect, useState } from "react";
import { AppOverlayScrollbars } from "./ui/AppOverlayScrollbars";
import type { CalculatorInputs, CalculatorUi } from "../lib/computeResults";
import { ageFromIsoDateString, isValidIsoDateString } from "../lib/ageFromDob";
import {
  calculatorInputsToPlanningPrefs,
  markWelcomeCompletedLocal,
  saveLocalUserPrefs,
  type UserPrefs,
} from "../lib/userPrefs";
import { canWritePlanLocalStorage, savePlanProfile } from "../lib/planStorage";
import {
  setSessionOnboardingAccounts,
  setSessionOnboardingComplete,
} from "../lib/sessionFlags";
import {
  clearForceOnboardingSession,
  consumeOnboardingFromSignup,
  peekForceOnboardingSession,
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
import { pensionConfigForLocale } from "../lib/localePensionConfig";
import { WELCOME_BENCHMARK } from "../lib/welcomeBenchmarkDefaults";
import { OnboardingProgressSteps } from "./OnboardingProgressSteps";
import { normalizedManualAccountEntries } from "./OnboardingAccountsStep";
import { type SpouseClaimMode } from "./SpouseClaimModeSegment";
import {
  ONBOARDING_RETIRE_AGE_MAX,
  ONBOARDING_RETIRE_AGE_MIN,
  WelcomeProfileStepFields,
} from "./WelcomeProfileStepFields";
import { WelcomeGoalStepFields } from "./WelcomeGoalStepFields";
import {
  aggregateManualAccountsToBases,
  loadStoredManualAccounts,
  emptyOnboardingAccountEntries,
} from "../lib/manualAccountEntries";
import "./ConfigDrawerBody.scss";
import "./PlanningProfileFields.scss";
import "./SidePanelShell.scss";
import "./WelcomeProfileStepFields.scss";
import "./WelcomeGoalStepFields.scss";
import "./OnboardingOverlay.scss";
import "./OnboardingFieldShell.scss";
import "./OnboardingProgressSteps.scss";
const BODY_CLASS = "onboarding-overlay--open";

type WizardStep = "profile" | "goals";

type Props = {
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

function initialFormFromInputs(
  inputs: CalculatorInputs,
  profile: ReturnType<typeof loadUserProfile> = loadUserProfile(),
) {
  const storedProfile = profile;
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
    growthGoal:
      inputs.growthGoal > 0 ? inputs.growthGoal : 0,
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
    growthGoal: form.growthGoal,
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
  inputs,
  setInputs,
  setUi,
  onComplete,
  saveUserPrefs,
  onConnectAccounts,
  onAccountsSaved,
}: Props) {
  const { user } = useAuth();
  const forceFreshOnboarding = peekForceOnboardingSession();
  const storedProfile = forceFreshOnboarding ? null : loadUserProfile();
  const [step, setStep] = useState<WizardStep>(() =>
    forceFreshOnboarding
      ? "profile"
      : resolveOnboardingStartStep(storedProfile, {
          forceRegion: peekOnboardingFromSignup(),
        }),
  );
  const [form, setForm] = useState(() => initialFormFromInputs(inputs, storedProfile));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [exiting, setExiting] = useState(false);
  const [retireAgePastInvalid, setRetireAgePastInvalid] = useState(false);

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

  const dobOk = isValidIsoDateString(form.dob);
  const ageToday = dobOk ? ageFromIsoDateString(form.dob) : null;
  const ageOk = ageToday !== null && ageToday >= 18 && ageToday <= 100;
  const retireOk =
    Number.isFinite(form.retireAge) &&
    form.retireAge >= ONBOARDING_RETIRE_AGE_MIN &&
    form.retireAge <= ONBOARDING_RETIRE_AGE_MAX;
  const regionOk = Boolean(normalizeOnboardingRegionId(form.locale));
  const profileFieldsOk =
    dobOk && ageOk && regionOk && retireOk && !retireAgePastInvalid;
  const goalsValid = form.monthlyGoal > 0;

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
  async function persistAndFinish(
    formState: ReturnType<typeof initialFormFromInputs>,
    options?: { openConnect?: boolean; fadeOut?: boolean },
  ) {
    setErr(null);
    if (busy) return;
    setBusy(true);
    const patch = formToCalculatorPatch(formState);
    const targetRetirementAge = Math.min(
      ONBOARDING_RETIRE_AGE_MAX,
      Math.max(ONBOARDING_RETIRE_AGE_MIN, Math.round(formState.retireAge)),
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
    saveProfileFromFormSlice(formProfileSlice(), "goals");
    const finishedEntries = normalizedManualAccountEntries(formState.accountEntries);
    setSessionOnboardingAccounts(JSON.stringify(finishedEntries));
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
    if (!retireOk || retireAgePastInvalid) {
      setErr(
        retireAgePastInvalid
          ? "Choose a retirement age that falls in a future year."
          : `Retirement age must be between ${ONBOARDING_RETIRE_AGE_MIN} and ${ONBOARDING_RETIRE_AGE_MAX}.`,
      );
      return;
    }
    saveProfileFromFormSlice(formProfileSlice(), "profile");
    setStep("goals");
  }

  function onFinishWithAddAccounts() {
    setErr(null);
    if (!goalsValid) {
      setErr("Enter your monthly income goal before continuing.");
      return;
    }
    saveProfileFromFormSlice(formProfileSlice(), "goals");
    void persistAndFinish(form, { openConnect: true, fadeOut: true });
  }

  const headerTitle =
    step === "profile" ? "First, a little about you." : "Now, your goals.";

  const headerSubtitle =
    step === "profile"
      ? "Takes about 2 minutes, but it builds your starting point."
      : "Ballpark is fine. You can refine these anytime.";

  return (
    <div
      className={[
        "onboarding-overlay",
        "onboarding-overlay--in-app",
        step === "profile" ? " onboarding-overlay--profile" : "",
        step === "goals" ? " onboarding-overlay--goals" : "",
        exiting ? " onboarding-overlay--exit" : "",
      ]
        .filter(Boolean)
        .join("")}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-overlay-title"
    >
      <div className="onboarding-overlay__panel">
        <header className="onboarding-overlay__header">
          <OnboardingProgressSteps
            activeStep={step}
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
            </div>
          ) : null}
        </header>

        <AppOverlayScrollbars
          className="side-panel-shell__scroll onboarding-overlay__scroll"
          defer={false}
        >
          <div className="onboarding-overlay__body">
            {step === "profile" ? (
              <WelcomeProfileStepFields
                onboardingLayout
                regionId={form.locale}
                onRegionSelect={applyRegionSelection}
                dateOfBirth={form.dob}
                onDateOfBirth={(iso) => setForm((f) => ({ ...f, dob: iso }))}
                retireAge={form.retireAge}
                onRetireAgeChange={(retireAge) =>
                  setForm((f) => ({ ...f, retireAge }))
                }
                onRetireAgePastInvalidChange={setRetireAgePastInvalid}
                showFillState
              />
            ) : (
              <WelcomeGoalStepFields
                step2Layout
                monthlyContribution={form.monthlyContribution}
                onMonthlyContributionChange={(monthlyContribution) =>
                  setForm((f) => ({ ...f, monthlyContribution }))
                }
                monthlyGoal={form.monthlyGoal}
                onMonthlyGoalChange={(monthlyGoal) =>
                  setForm((f) => ({ ...f, monthlyGoal }))
                }
                growthGoal={form.growthGoal}
                onGrowthGoalChange={(growthGoal) =>
                  setForm((f) => ({ ...f, growthGoal }))
                }
                showFillState
              />
            )}
          </div>
        </AppOverlayScrollbars>

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
          ) : (
            <div className="onboarding-overlay__footer-goals">
              <button
                type="button"
                className="onboarding-overlay__btn onboarding-overlay__btn--primary"
                disabled={!goalsValid || busy || exiting}
                onClick={onFinishWithAddAccounts}
              >
                {busy ? "Saving…" : "Add your accounts →"}
              </button>
              <button
                type="button"
                className="onboarding-overlay__back-link"
                disabled={busy || exiting}
                onClick={() => {
                  setErr(null);
                  setStep("profile");
                }}
              >
                ← Back
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
