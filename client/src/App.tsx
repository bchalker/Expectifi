import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AuthModal,
  type AuthModalOpen,
  type AuthModalMode,
} from "./components/AuthModal";
import { consumeLandingAuthIntent } from "./lib/landingAuthIntent";
import { useAuth } from "./context/AuthContext";
import { UserLocaleProvider } from "./context/UserLocaleContext";
import { AccountBalances } from "./components/AccountBalances";
/* Life Events section — commented out, may reuse later
import {
  LifeEventsPanel,
  type LifeEventActiveImpact,
} from "./components/LifeEventsPanel";
import { LifeEventsSectionDivider } from "./components/life-events/LifeEventsSectionDivider";
*/
import { DrawerPanel } from "./components/DrawerPanel";
import { TaxSummaryCard } from "./components/TaxSummaryCard";
import { IncomeHarvestPreviewPanel } from "./components/IncomeHarvestPreviewPanel";
import { GrowthAssumptionsPanel } from "./components/GrowthAssumptionsPanel";
import { WhereToRetirePanelEntry } from "./components/WhereToRetirePanelEntry";
import type { AccountIncomeMonthlyContext } from "./lib/accountIncomeMonthly";
import { Header } from "./components/Header";
import { AppLeftNav } from "./components/AppLeftNav";
import { StripHeader } from "./components/StripHeader";
import { GoalProgressBar } from "./components/GoalProgressBar";
import { SubHeader } from "./components/SubHeader";
import { DashboardMainHero } from "./components/DashboardMainHero";
import { useOverlayScrollbars } from "overlayscrollbars-react";
import "overlayscrollbars/styles/overlayscrollbars.css";
import { APP_OVERLAY_SCROLLBARS_OPTIONS } from "./components/ui/AppOverlayScrollbars";
import "./components/AppHeaderStack.scss";
import { persistCalculatorSession } from "./lib/appStateStorage";
import {
  loadBrokerageBalanceMode,
  saveBrokerageBalanceMode,
  type BrokerageBalanceMode,
} from "./lib/brokerageBalanceMode";
import {
  computeResults,
  applyPortfolioDeltaAtRetirement,
  type CalculatorInputs,
  type CalculatorUi,
  type DrawerName,
} from "./lib/computeResults";
import { defaultWithdrawRateForStrategy } from "./lib/accountIncomeStrategy";
import { normalizeRetireRegions } from "./lib/calc/retireRegions";
/* Life Events section — commented out, may reuse later
import { buildLifeEventsProjectionData } from "./lib/calc/lifeEvents";
import type { LifeEventTypeCard } from "./components/life-events/types";
import {
  loadGrowthLifeEvents,
  saveGrowthLifeEvents,
} from "./lib/planStorage/growthLifeEvents";
*/
import { loadLifePlans, type LifePlans } from "./lib/planStorage/life";
import {
  PLAN_STATE_SERVER_HYDRATED_EVENT,
  flushPlanStateServerSync,
  queuePlanStateServerSync,
} from "./lib/planStateServerSync";
import { hydrateAppSnapshot } from "./lib/appSnapshot";
import {
  clearIncomeUiSnap,
  mergeHydratedCalculatorUi,
  saveIncomeUiSnap,
} from "./lib/accountIncomeStorage";
import {
  clearCalculatorPhaseSnap,
  resolveCalculatorPhase,
  saveCalculatorPhaseSnap,
} from "./lib/calculatorPhaseSnap";
import { loadPlanSession } from "./lib/planStorage";
import { clearStoredManualAccounts } from "./lib/manualAccountEntries";
import {
  inputsForPersistedCalculatorSession,
  loadStoredPositionsImport,
} from "./lib/positionsImportStorage";
import {
  clearAllAccountBalancesFromCard,
  clearAllPositionsImportFromCard,
  filterImportedPositionReturnModels,
} from "./lib/removeRetirementAccounts";
import {
  loadBalanceInputMode,
  saveBalanceInputMode,
  type BalanceInputMode,
} from "./lib/retirementBalanceMode";
import {
  clearDashboardViewEnterAttrs,
  dashboardViewEnterClearMs,
  replayDashboardViewEnter,
} from "./lib/dashboardViewReveal";
import { syncNoPortfolioSubheaderDocumentAttr } from "./lib/syncNoPortfolioSubheader";
import {
  applyImportedBalanceOverrides,
  hasImportedPortfolioData,
  portfolioBalancesFromImport,
  resolvePortfolioBalanceMode,
} from "./lib/portfolioSourceExclusivity";
import {
  findIncomeSecurity,
  navDriftFromErosionRisk,
} from "./lib/incomeSecurities";
import {
  isGuaranteedIncomeConfigured,
} from "./lib/guaranteedIncome";
import { isSsConfigured } from "./lib/socialSecurity";
import {
  clearGuestProfileAndSession,
  heartbeatEphemeralGuestTab,
  initEphemeralGuestSession,
  shouldTrackEphemeralGuestTabs,
  teardownEphemeralGuestTab,
} from "./lib/guestEphemeralStorage";
import { OnboardingOverlay } from "./components/OnboardingOverlay";
import {
  shouldShowWelcomeOverlay,
  peekForceOnboardingSession,
} from "./lib/welcomeGate";
import { useUserTier } from "./hooks/useUserTier";
import type { PlanPersistSnapshot } from "./lib/planStorage";
import {
  clearSessionOnboardingComplete,
  CSV_SESSION_HOLDINGS_EVENT,
} from "./lib/sessionFlags";
import {
  defaultCalculatorInputs,
  defaultCalculatorUi,
} from "./lib/initialCalculatorInputs";
import { syncDisplayCurrencyFromResidence } from "./lib/displayCurrency";
import {
  calculatorInputsToPlanningPrefs,
  syncPlanningPrefsFromInputs,
  userPrefsToCalculatorPatch,
} from "./lib/userPrefs";
import {
  normalizeMarketScenarioId,
  resolveMarketScenarioActive,
} from "./lib/marketScenario";
import { manualAccountsForBrowserSave } from "./lib/manualAccountEntries";
import {
  loadUserProfile,
  mergeProfileWithDbPrefs,
  profileSnapshotForBrowserSave,
  saveResidenceCountryToProfile,
  syncUserProfileFromCalculatorInputs,
} from "./lib/userProfileStorage";
import type { ConfigDrawerTab } from "./components/ConfigDrawerBody";
import { useAppPath } from "./hooks/useAppPath";
import { useAppHeaderStackHeight } from "./hooks/useAppHeaderStackHeight";
import {
  APP_DASHBOARD_PATH,
  APP_PATHS,
  navigateApp,
  replaceAppPath,
} from "./lib/appPaths";
import {
  isDrawerNavAvailable,
  isTaxSummaryPanelAvailable,
  type NavPanelContext,
} from "./lib/appNavDrawers";
import { aggregatedHoldingsForScenarioGuide } from "./lib/holdingScenarioGuideExamples";
import { flattenBatches } from "./lib/positionsImportStorage";
import { AppPrivacyTrust } from "./components/AppPrivacyTrust";
import { AccountPlanBottomBanner } from "./components/AccountPlanBottomBanner";
import { WhereToRetire } from "./pages/WhereToRetire";

const defaultInputs = defaultCalculatorInputs;
const defaultUi = defaultCalculatorUi;

type InitialAppState = {
  inputs: CalculatorInputs;
  ui: CalculatorUi;
  phase: "growth" | "income";
  activePreset: string | null;
};

function freshAppState(): InitialAppState {
  return {
    inputs: applyImportedBalanceOverrides({ ...defaultInputs }),
    ui: defaultUi,
    phase: "growth",
    activePreset: "p1",
  };
}

type AppProps = {
  initialAuthModal?: AuthModalOpen;
};

export default function App({ initialAuthModal = null }: AppProps) {
  const {
    hydration,
    isHydrated,
    tier,
    updateSavePlanPromptSignals,
    registerBrowserSaveSnapshot,
  } = useUserTier();
  const [inputs, setInputsState] = useState<CalculatorInputs>(
    () => hydration.inputs,
  );
  const [ui, setUiState] = useState<CalculatorUi>(() =>
    mergeHydratedCalculatorUi(hydration.ui),
  );
  const [phase, setPhase] = useState<"growth" | "income">(() =>
    resolveCalculatorPhase(hydration.phase),
  );
  const [drawer, setDrawer] = useState<DrawerName | null>(null);
  const [configTab, setConfigTab] = useState<ConfigDrawerTab>("profile");
  const [activePreset, setActivePreset] = useState<string | null>(
    () => hydration.activePreset,
  );
  const [positionsImportRev, setPositionsImportRev] = useState(0);
  const [manualAccountsRev, setManualAccountsRev] = useState(0);
  const [balanceMode, setBalanceMode] = useState<BalanceInputMode>(() =>
    loadBalanceInputMode(),
  );
  const [brokerageMode, setBrokerageMode] = useState<BrokerageBalanceMode>(() =>
    loadBrokerageBalanceMode(),
  );
  const [returnEditorOpen, setReturnEditorOpen] = useState<{
    positionId: string;
    anchorTop: number;
    nonce: number;
  } | null>(null);

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [authModal, setAuthModal] = useState<AuthModalOpen>(initialAuthModal);

  const {
    loading: authLoading,
    resolveGoogleCheckoutFromUrl,
    clearGoogleCheckoutUi,
    user,
    saveUserPrefs,
  } = useAuth();

  const path = useAppPath();
  useAppHeaderStackHeight();
  const [initMainScrollRef, getMainScrollInstance] = useOverlayScrollbars({
    options: {
      ...APP_OVERLAY_SCROLLBARS_OPTIONS,
      overflow: {
        x: "hidden",
        y: "scroll",
      },
      scrollbars: {
        ...APP_OVERLAY_SCROLLBARS_OPTIONS.scrollbars,
        autoHide: "scroll",
      },
    },
    defer: true,
  });

  useEffect(() => {
    document.documentElement.classList.add("app-shell-layout");
    document.body.classList.add("app-shell-layout");
    return () => {
      document.documentElement.classList.remove("app-shell-layout");
      document.body.classList.remove("app-shell-layout");
    };
  }, []);
  const welcomeCtx = useMemo(
    () => ({
      onboardingComplete: hydration.onboardingComplete,
      onboardingDone: user?.onboardingDone,
      planPrefs: user?.planPrefs ?? null,
    }),
    [hydration.onboardingComplete, user?.onboardingDone, user?.planPrefs],
  );
  const welcomeBlockedRef = useRef(peekForceOnboardingSession());
  const syncedAuthUserIdRef = useRef<string | null>(null);
  const hydrationBootSyncedRef = useRef(false);

  const [showWelcome, setShowWelcome] = useState(true);
  const [onboardingMountKey, setOnboardingMountKey] = useState(0);

  useEffect(() => {
    const country = inputs.residenceCountry?.trim() ?? "";
    if (!country) return;
    syncDisplayCurrencyFromResidence(country);
    saveResidenceCountryToProfile(country);
  }, [inputs.residenceCountry]);

  useEffect(() => {
    if (!isHydrated) return;
    if (path === APP_PATHS.onboarding) return;
    if (!peekForceOnboardingSession()) return;
    welcomeBlockedRef.current = true;
    setShowWelcome(true);
  }, [isHydrated, path]);

  useEffect(() => {
    if (!isHydrated) return;
    if (path !== APP_PATHS.onboarding) return;
    welcomeBlockedRef.current = true;
    setShowWelcome(true);
    setOnboardingMountKey((key) => key + 1);
  }, [isHydrated, path]);

  useEffect(() => {
    if (!isHydrated || authLoading) return;
    if (path === APP_PATHS.onboarding) return;
    if (welcomeBlockedRef.current) return;
    if (peekForceOnboardingSession()) return;
    setShowWelcome(shouldShowWelcomeOverlay(welcomeCtx));
  }, [isHydrated, authLoading, path, welcomeCtx, hydration.onboardingComplete]);

  const sessionRef = useRef({ inputs, ui, phase, activePreset });

  const buildBrowserSaveSnapshot = useCallback((): PlanPersistSnapshot => {
    const accounts = manualAccountsForBrowserSave();
    return {
      inputs,
      ui,
      phase,
      activePreset,
      profile: profileSnapshotForBrowserSave(inputs, ui),
      accounts,
    };
  }, [inputs, ui, phase, activePreset]);

  useEffect(() => {
    registerBrowserSaveSnapshot(buildBrowserSaveSnapshot);
  }, [registerBrowserSaveSnapshot, buildBrowserSaveSnapshot]);
  useEffect(() => {
    sessionRef.current = { inputs, ui, phase, activePreset };
  }, [inputs, ui, phase, activePreset]);

  useEffect(() => {
    const registerIntent = consumeLandingAuthIntent();
    if (registerIntent) setAuthModal("register");
    else if (initialAuthModal) setAuthModal(initialAuthModal);
  }, [initialAuthModal]);

  useEffect(() => {
    if (authLoading) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("google_checkout") !== "1") return;
    let cancelled = false;
    void (async () => {
      const result = await resolveGoogleCheckoutFromUrl();
      if (cancelled) return;
      params.delete("google_checkout");
      const q = params.toString();
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}${q ? `?${q}` : ""}${window.location.hash}`,
      );
      if (result.status === "payment_required") {
        setAuthModal("google_checkout");
      } else if (
        result.status === "checkout_expired" ||
        result.status === "error"
      ) {
        setAuthModal("signin");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, resolveGoogleCheckoutFromUrl]);

  const openAuthSignIn = useCallback(() => {
    setMobileNavOpen(false);
    setAuthModal("signin");
  }, []);

  const openAuthRegister = useCallback(() => {
    setMobileNavOpen(false);
    setAuthModal("register");
  }, []);

  const openCsvUpgrade = useCallback(() => {
    setMobileNavOpen(false);
    setAuthModal({ mode: "register", source: "csv" });
  }, []);

  const onResetGuestProfile = useCallback(() => {
    clearGuestProfileAndSession();
    clearSessionOnboardingComplete();
    clearCalculatorPhaseSnap();
    clearIncomeUiSnap();
    welcomeBlockedRef.current = true;
    const fresh = freshAppState();
    setInputsState(fresh.inputs);
    setUiState(fresh.ui);
    setPhase(fresh.phase);
    setActivePreset(fresh.activePreset);
    setShowWelcome(true);
    setOnboardingMountKey((key) => key + 1);
  }, []);

  const onReturnEditorOpenHandled = useCallback(
    () => setReturnEditorOpen(null),
    [],
  );

  const onOpenPositionReturnEditor = useCallback((positionId: string) => {
    setReturnEditorOpen({
      positionId,
      anchorTop:
        typeof window !== "undefined"
          ? Math.min(window.innerHeight * 0.22, 200)
          : 140,
      nonce: Date.now(),
    });
  }, []);

  const setInputs = useCallback((p: Partial<CalculatorInputs>) => {
    setInputsState((s) => ({ ...s, ...p }));
  }, []);

  const onBalanceModeChange = useCallback((m: BalanceInputMode) => {
    saveBalanceInputMode(m);
    setBalanceMode(m);
  }, []);

  const onBrokerageModeChange = useCallback((m: BrokerageBalanceMode) => {
    saveBrokerageBalanceMode(m);
    setBrokerageMode(m);
    if (m === "imported") {
      const imp = loadStoredPositionsImport();
      if (imp?.balances)
        setInputsState((s) => ({ ...s, brkBal: imp.balances.brkBal }));
    }
  }, []);

  useEffect(() => {
    if (!isHydrated || authLoading || !user) return;
    queuePlanStateServerSync();
  }, [isHydrated, authLoading, user, balanceMode, brokerageMode]);

  const setUi = useCallback((p: Partial<CalculatorUi>) => {
    setUiState((s) => ({ ...s, ...p }));
  }, []);

  /** Apply boot hydration to React state (refresh + sign-in). Avoids persisting empty defaults over saved income UI. */
  useEffect(() => {
    if (!isHydrated || authLoading) return;
    const userId = user?.id ?? null;

    const applyHydration = () => {
      const resolvedPhase = resolveCalculatorPhase(hydration.phase);
      const resolvedUi = mergeHydratedCalculatorUi(hydration.ui);
      setInputsState(hydration.inputs);
      setUiState(resolvedUi);
      setPhase(resolvedPhase);
      setActivePreset(hydration.activePreset);
      saveCalculatorPhaseSnap(resolvedPhase);
      saveIncomeUiSnap(resolvedUi);
    };

    if (userId && syncedAuthUserIdRef.current !== userId) {
      syncedAuthUserIdRef.current = userId;
      hydrationBootSyncedRef.current = true;
      applyHydration();
      setPositionsImportRev((n) => n + 1);
      return;
    }
    if (!userId) {
      syncedAuthUserIdRef.current = null;
    }

    if (!hydrationBootSyncedRef.current) {
      hydrationBootSyncedRef.current = true;
      applyHydration();
    }
  }, [
    isHydrated,
    authLoading,
    user?.id,
    hydration.inputs,
    hydration.ui,
    hydration.phase,
    hydration.activePreset,
  ]);

  useEffect(() => {
    if (!isHydrated || authLoading) return;
    if (user?.planPrefs) {
      mergeProfileWithDbPrefs(loadUserProfile(), user.planPrefs);
    }
    const storedMode = loadBalanceInputMode();
    const storedBrokerageMode = loadBrokerageBalanceMode();
    if (hasImportedPortfolioData()) {
      if (storedMode !== "imported") saveBalanceInputMode("imported");
      if (storedBrokerageMode !== "imported") {
        saveBrokerageBalanceMode("imported");
      }
      setBalanceMode("imported");
      setBrokerageMode("imported");
      setPositionsImportRev((n) => n + 1);
    } else {
      setBalanceMode(storedMode);
      setBrokerageMode(storedBrokerageMode);
    }
  }, [isHydrated, authLoading, user?.id, user?.planPrefs]);

  /** Ephemeral guest sessions: last-tab cleanup for browser_saved only (tier 1 skips all LS). */
  useEffect(() => {
    if (!isHydrated || authLoading || user) return;
    if (!shouldTrackEphemeralGuestTabs()) return;
    initEphemeralGuestSession();
    heartbeatEphemeralGuestTab();
    const heartbeatId = window.setInterval(
      () => heartbeatEphemeralGuestTab(),
      20_000,
    );
    const onPageHide = () => teardownEphemeralGuestTab();
    const onVisibility = () => {
      if (document.visibilityState === "visible") heartbeatEphemeralGuestTab();
    };
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(heartbeatId);
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [isHydrated, authLoading, user, tier]);

  const persistSessionNow = useCallback(
    (snapshot: {
      inputs: CalculatorInputs;
      ui: CalculatorUi;
      phase: "growth" | "income";
      activePreset: string | null;
    }) => {
      saveCalculatorPhaseSnap(snapshot.phase);
      saveIncomeUiSnap(snapshot.ui);
      persistCalculatorSession(snapshot);
      if (user) flushPlanStateServerSync();
    },
    [user],
  );

  /** Persist calculator session when tier allows local plan writes. */
  useEffect(() => {
    if (!isHydrated || authLoading) return;
    if (!hydrationBootSyncedRef.current) return;
    if (user && syncedAuthUserIdRef.current !== user.id) return;
    const id = window.setTimeout(() => {
      saveCalculatorPhaseSnap(phase);
      saveIncomeUiSnap(ui);
      persistCalculatorSession({ inputs, ui, phase, activePreset });
      syncPlanningPrefsFromInputs(inputs);
      syncUserProfileFromCalculatorInputs(inputs, ui);
      const planningPrefs = calculatorInputsToPlanningPrefs(inputs);
      if (user && planningPrefs) {
        void saveUserPrefs(planningPrefs);
      }
      if (user) {
        queuePlanStateServerSync();
      }
    }, 400);
    return () => window.clearTimeout(id);
  }, [
    isHydrated,
    authLoading,
    inputs,
    ui,
    phase,
    activePreset,
    user,
    saveUserPrefs,
  ]);

  /** Flush income strategy / session edits before the tab closes. */
  useEffect(() => {
    if (!user) return;
    const onPageHide = () => {
      saveCalculatorPhaseSnap(sessionRef.current.phase);
      saveIncomeUiSnap(sessionRef.current.ui);
      persistCalculatorSession({
        inputs: sessionRef.current.inputs,
        ui: sessionRef.current.ui,
        phase: sessionRef.current.phase,
        activePreset: sessionRef.current.activePreset,
      });
      flushPlanStateServerSync();
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [user]);

  /** After server plan-state hydrate, refresh session UI and derived local-only state. */
  useEffect(() => {
    const onServerHydrated = () => {
      const session = loadPlanSession();
      const hydrated = session
        ? hydrateAppSnapshot(session, defaultCalculatorInputs)
        : null;
      if (hydrated) {
        const resolvedUi = mergeHydratedCalculatorUi(hydrated.ui);
        setUiState((s) => ({
          ...s,
          ...resolvedUi,
        }));
        saveIncomeUiSnap(resolvedUi);
        const resolvedPhase = resolveCalculatorPhase(hydrated.phase);
        setPhase(resolvedPhase);
        saveCalculatorPhaseSnap(resolvedPhase);
        setActivePreset(hydrated.activePreset);
      }
      setLifePlans(loadLifePlans());
      setBalanceMode(loadBalanceInputMode());
      setBrokerageMode(loadBrokerageBalanceMode());
      setManualAccountsRev((n) => n + 1);
      setPositionsImportRev((n) => n + 1);
    };
    window.addEventListener(PLAN_STATE_SERVER_HYDRATED_EVENT, onServerHydrated);
    return () => {
      window.removeEventListener(PLAN_STATE_SERVER_HYDRATED_EVENT, onServerHydrated);
    };
  }, []);

  /** After tier hydration, sync welcome overlay to hydration (anonymous = session-only). */
  useEffect(() => {
    if (!isHydrated || authLoading) return;
    if (path === APP_PATHS.onboarding) return;
    if (welcomeBlockedRef.current) return;
    if (peekForceOnboardingSession()) return;
    setShowWelcome(shouldShowWelcomeOverlay(welcomeCtx));
  }, [isHydrated, authLoading, path, welcomeCtx, hydration.onboardingComplete]);

  const welcomeDone = !showWelcome;

  useEffect(() => {
    if (!welcomeDone || typeof sessionStorage === "undefined") return;
    const openImport =
      sessionStorage.getItem("expectifi_open_import") === "1" ||
      sessionStorage.getItem("headwayplanner_open_import") === "1";
    if (!openImport) return;
    sessionStorage.removeItem("expectifi_open_import");
    sessionStorage.removeItem("headwayplanner_open_import");
    setOpenImportRequest((n) => n + 1);
  }, [welcomeDone]);

  /** On sign-in, restore planning goals from DB (localStorage is cleared on other devices). */
  useEffect(() => {
    if (!user?.planPrefs) return;
    setInputsState((s) => ({ ...s, ...userPrefsToCalculatorPatch(user.planPrefs!) }));
  }, [user?.id]);

  useEffect(() => {
    const onCsvHoldingsChange = () => setPositionsImportRev((n) => n + 1);
    window.addEventListener(CSV_SESSION_HOLDINGS_EVENT, onCsvHoldingsChange);
    return () => {
      window.removeEventListener(CSV_SESSION_HOLDINGS_EVENT, onCsvHoldingsChange);
    };
  }, []);

  const onImportedApplyBalances = useCallback(
    (
      b: Pick<
        CalculatorInputs,
        "base401k" | "baseSE401k" | "baseRoth" | "baseHsa" | "brkBal"
      >,
    ) => {
      clearStoredManualAccounts();
      setManualAccountsRev((n) => n + 1);
      saveBalanceInputMode("imported");
      saveBrokerageBalanceMode("imported");
      setBalanceMode("imported");
      setBrokerageMode("imported");
      saveCalculatorPhaseSnap("growth");
      setPhase("growth");
      setInputsState((prev) => {
        const next = {
          ...prev,
          ...portfolioBalancesFromImport(b),
        };
        persistCalculatorSession({
          inputs: inputsForPersistedCalculatorSession(
            applyImportedBalanceOverrides(next),
          ),
          ui: sessionRef.current.ui,
          phase: "growth",
          activePreset: sessionRef.current.activePreset,
        });
        return next;
      });
    },
    [],
  );

  const onPositionsImportAppliedRetirement = useCallback(() => {
    setPositionsImportRev((n) => n + 1);
    const imp = loadStoredPositionsImport();
    if (imp?.balances) {
      onImportedApplyBalances(imp.balances);
      return;
    }
    onBalanceModeChange("imported");
    onBrokerageModeChange("imported");
  }, [onImportedApplyBalances, onBalanceModeChange, onBrokerageModeChange]);

  const onRemoveRetirementAccounts = useCallback(() => {
    clearAllPositionsImportFromCard();
    clearStoredManualAccounts();
    saveBalanceInputMode("manual");
    saveBrokerageBalanceMode("manual");
    setBalanceMode("manual");
    setBrokerageMode("manual");
    setInputsState((prev) => ({
      ...prev,
      ...clearAllAccountBalancesFromCard(),
      positionReturnModels: filterImportedPositionReturnModels(
        prev.positionReturnModels,
      ),
    }));
    setPositionsImportRev((n) => n + 1);
    setManualAccountsRev((n) => n + 1);
  }, []);

  const onPositionsImportAppliedBrokerage = useCallback(() => {
    setPositionsImportRev((n) => n + 1);
    onBrokerageModeChange("imported");
  }, [onBrokerageModeChange]);

  const uiForCompute = useMemo(
    () => (phase === "income" ? { ...ui, incomeMode: true } : ui),
    [phase, ui],
  );

  const c = useMemo(
    () =>
      computeResults(inputs, uiForCompute, {
        retirement: balanceMode,
        brokerage: brokerageMode,
      }),
    [inputs, uiForCompute, balanceMode, brokerageMode, positionsImportRev],
  );

  const [lifePlans, setLifePlans] = useState<LifePlans>(() => loadLifePlans());

  /* Life Events section — commented out, may reuse later
  const [lifeEventCards, setLifeEventCards] = useState<LifeEventTypeCard[]>(() =>
    loadGrowthLifeEvents(),
  );

  const lifeEventsCurrentYear = c.retirementCalendarYear - c.yearsToRetirement;

  const handleLifeEventCardsChange = useCallback(
    (cards: LifeEventTypeCard[]) => {
      setLifeEventCards(
        saveGrowthLifeEvents(
          cards,
          lifeEventsCurrentYear,
          c.retirementCalendarYear,
        ),
      );
    },
    [c.retirementCalendarYear, lifeEventsCurrentYear],
  );

  useEffect(() => {
    if (!isHydrated || authLoading || !user) return;
    queuePlanStateServerSync();
  }, [isHydrated, authLoading, user, lifeEventCards]);

  useEffect(() => {
    const onServerHydrated = () => {
      setLifeEventCards(loadGrowthLifeEvents());
    };
    window.addEventListener(PLAN_STATE_SERVER_HYDRATED_EVENT, onServerHydrated);
    return () => {
      window.removeEventListener(PLAN_STATE_SERVER_HYDRATED_EVENT, onServerHydrated);
    };
  }, []);

  const [activeLifeEventImpact, setActiveLifeEventImpact] = useState<
    Record<string, LifeEventActiveImpact>
  >({});

  const handleLifeEventActiveChange = useCallback(
    (configId: string, isActive: boolean, impact: LifeEventActiveImpact) => {
      setActiveLifeEventImpact((prev) => {
        if (!isActive) {
          if (!(configId in prev)) return prev;
          const next = { ...prev };
          delete next[configId];
          return next;
        }
        return { ...prev, [configId]: impact };
      });
    },
    [],
  );

  const lifeEventsPortfolioDelta = useMemo(() => {
    if (phase !== "growth") return 0;
    return Object.values(activeLifeEventImpact).reduce(
      (sum, impact) => sum + impact.portfolioDelta,
      0,
    );
  }, [activeLifeEventImpact, phase]);

  const lifeEventsProjectionData = useMemo(
    () =>
      buildLifeEventsProjectionData(c, {
        retRate: inputs.retRate,
        brkRate: inputs.brkRate,
        save: inputs.save,
      }),
    [c, inputs.retRate, inputs.brkRate, inputs.save],
  );
  */

  /** Push life-tab edits to server for signed-in users. */
  useEffect(() => {
    if (!isHydrated || authLoading || !user) return;
    queuePlanStateServerSync();
  }, [isHydrated, authLoading, user, lifePlans]);

  const cDisplay = useMemo(
    () =>
      applyPortfolioDeltaAtRetirement(c, {
        portfolioDelta: 0, // lifeEventsPortfolioDelta — Life Events section commented out
        incomeMode: phase === "income" || ui.incomeMode,
        incYield: inputs.incYield,
        incGrowth: inputs.incGrowth,
        wdRate: inputs.wdRate,
        wdInflation: inputs.wdInflation,
        monthlyIncomeGoal: inputs.monthlyIncomeGoal,
        targetRetirementAge: inputs.targetRetirementAge,
        ssIncluded: isGuaranteedIncomeConfigured(inputs),
        retireRegions: normalizeRetireRegions(
          inputs.retireRegions,
          inputs.italyCost,
        ),
        filingStatus: inputs.filingStatus,
      }),
    [
      c,
      ui.incomeMode,
      inputs,
      inputs.filingStatus,
      inputs.incYield,
      inputs.incGrowth,
      inputs.wdRate,
      inputs.wdInflation,
      inputs.monthlyIncomeGoal,
      inputs.targetRetirementAge,
      inputs.retireRegions,
      inputs.italyCost,
    ],
  );

  const ssBenefitsConfigured = isSsConfigured(inputs);
  const guaranteedIncomeConfigured = isGuaranteedIncomeConfigured(inputs);
  const displayBalanceMode = useMemo(
    () => resolvePortfolioBalanceMode(balanceMode),
    [balanceMode, positionsImportRev, manualAccountsRev],
  );
  const showScenarioGuideTab = useMemo(() => {
    if (phase !== "growth" || displayBalanceMode !== "imported") return false;
    const imp = loadStoredPositionsImport();
    if (!imp?.batches?.length) return false;
    return (
      aggregatedHoldingsForScenarioGuide(flattenBatches(imp.batches)).length > 0
    );
  }, [phase, displayBalanceMode, positionsImportRev]);
  const dashboardHasPortfolio = welcomeDone && c.hasPortfolioBalances;
  const navContext: NavPanelContext = useMemo(
    () => ({
      hasPortfolioBalances: dashboardHasPortfolio,
      ssConfigured: welcomeDone && ssBenefitsConfigured,
    }),
    [dashboardHasPortfolio, welcomeDone, ssBenefitsConfigured],
  );
  const taxSummaryAvailable = isTaxSummaryPanelAvailable(navContext);
  const showIncomeHarvestPreview =
    phase === "income" &&
    c.hasPortfolioBalances &&
    taxSummaryAvailable &&
    welcomeDone;
  const showGrowthAssumptionsPanel =
    phase === "growth" &&
    c.hasPortfolioBalances &&
    taxSummaryAvailable &&
    welcomeDone;
  const useTaxSummarySplitLayout =
    showIncomeHarvestPreview || showGrowthAssumptionsPanel;
  const harvestAccountIncomeContext = useMemo((): AccountIncomeMonthlyContext | undefined => {
    if (!taxSummaryAvailable || phase !== "income") return undefined;
    return {
      inputs,
      accountIncomeFunds: ui.accountIncomeFunds,
      accountIncomeStrategies: ui.accountIncomeStrategies,
      accountWithdrawRates: ui.accountWithdrawRates,
      wdInflation: inputs.wdInflation,
      hsaMedicalAnnualDraw: cDisplay.strategy.hsaWdAnn,
      hasPortfolioBalances: cDisplay.hasPortfolioBalances,
      retFV: cDisplay.retFV,
      brkFV: cDisplay.brkFV,
      tradRatio: cDisplay.tradRatio,
      rothRatio: cDisplay.rothRatio,
      hsaRatio: cDisplay.hsaRatio,
      tradBal: cDisplay.tradBal,
      rothBal: cDisplay.rothBal,
      hsaBal: cDisplay.hsaBal,
      brkBal: inputs.brkBal,
      retirementAge: inputs.targetRetirementAge,
      retirementBalanceMode: displayBalanceMode,
    };
  }, [
    taxSummaryAvailable,
    phase,
    inputs,
    ui.accountIncomeFunds,
    ui.accountIncomeStrategies,
    ui.accountWithdrawRates,
    cDisplay.strategy.hsaWdAnn,
    cDisplay.hasPortfolioBalances,
    cDisplay.retFV,
    cDisplay.brkFV,
    cDisplay.tradRatio,
    cDisplay.rothRatio,
    cDisplay.hsaRatio,
    cDisplay.tradBal,
    cDisplay.rothBal,
    cDisplay.hsaBal,
    displayBalanceMode,
    manualAccountsRev,
  ]);
  const isWhereToRetire = path === APP_PATHS.whereToRetire;

  useEffect(() => {
    const dashboardVisible = welcomeDone && !isWhereToRetire && !user;
    updateSavePlanPromptSignals({
      dashboardVisible,
      projectedIncomeMonthly: dashboardVisible ? cDisplay.grossMon : 0,
    });
  }, [
    welcomeDone,
    isWhereToRetire,
    user,
    cDisplay.grossMon,
    updateSavePlanPromptSignals,
  ]);

  const showGoalBarRow =
    welcomeDone && !isWhereToRetire && c.hasPortfolioBalances;
  const [openImportRequest, setOpenImportRequest] = useState(0);
  const dashboardViewBootstrappedRef = useRef(false);

  useLayoutEffect(() => {
    if (!welcomeDone) {
      document.documentElement.removeAttribute("data-no-portfolio-subheader");
      return;
    }
    syncNoPortfolioSubheaderDocumentAttr(c.hasPortfolioBalances);
  }, [welcomeDone, c.hasPortfolioBalances]);

  /** Clear stale import-flush attrs that can leave the growth panel invisible. */
  useLayoutEffect(() => {
    if (!welcomeDone || !c.hasPortfolioBalances) return;
    const root = document.documentElement;
    if (
      root.hasAttribute("data-portfolio-import-flush") &&
      !root.hasAttribute("data-dashboard-view-enter")
    ) {
      clearDashboardViewEnterAttrs();
    }
  }, [welcomeDone, c.hasPortfolioBalances]);

  /** Safety net: never leave dashboard reveal attrs stuck after the stagger finishes. */
  useEffect(() => {
    if (!welcomeDone || !c.hasPortfolioBalances) return;
    const timer = window.setTimeout(
      () => clearDashboardViewEnterAttrs(),
      dashboardViewEnterClearMs() + 200,
    );
    return () => window.clearTimeout(timer);
  }, [welcomeDone, c.hasPortfolioBalances, phase]);

  useEffect(() => {
    if (
      drawer != null &&
      drawer !== "config" &&
      !isDrawerNavAvailable(drawer, navContext)
    ) {
      setDrawer(null);
    }
  }, [navContext, drawer]);

  useEffect(() => {
    if (!isWhereToRetire) return;
    setDrawer(null);
    setMobileNavOpen(false);
    saveCalculatorPhaseSnap("income");
    setPhase("income");
  }, [isWhereToRetire]);

  /** Replay top-down stagger when switching growth / income / where to retire. */
  useEffect(() => {
    if (!welcomeDone || !c.hasPortfolioBalances) {
      dashboardViewBootstrappedRef.current = false;
      return;
    }

    if (!dashboardViewBootstrappedRef.current) {
      dashboardViewBootstrappedRef.current = true;
      return;
    }

    if (isWhereToRetire) {
      replayDashboardViewEnter("where-to-retire");
      return;
    }

    replayDashboardViewEnter(phase);
  }, [phase, isWhereToRetire, welcomeDone, c.hasPortfolioBalances]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(min-width: 761px)");
    const onChange = () => {
      if (mq.matches) setMobileNavOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const showDashboardSubHeader = welcomeDone && !isWhereToRetire;
  /** Temporarily: wave/values live only in .main__hero — hide fixed header copy + collapse spacer. */
  const fixedHeaderHeroHidden = showDashboardSubHeader;
  const [mainHeroStuck, setMainHeroStuck] = useState(false);

  useLayoutEffect(() => {
    if (fixedHeaderHeroHidden) {
      document.documentElement.setAttribute("data-app-hero-in-main", "true");
    } else {
      document.documentElement.removeAttribute("data-app-hero-in-main");
    }
  }, [fixedHeaderHeroHidden]);

  useLayoutEffect(() => {
    if (!welcomeDone) {
      document.documentElement.removeAttribute("data-app-phase");
      return;
    }
    document.documentElement.setAttribute(
      "data-app-phase",
      isWhereToRetire ? "where-to-retire" : phase,
    );
  }, [welcomeDone, isWhereToRetire, phase]);

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => {
      getMainScrollInstance()?.update();
    });
    return () => cancelAnimationFrame(frame);
  }, [
    getMainScrollInstance,
    welcomeDone,
    isWhereToRetire,
    phase,
    fixedHeaderHeroHidden,
    showDashboardSubHeader,
  ]);

  const onPhaseChange = useCallback(
    (next: "growth" | "income") => {
      saveCalculatorPhaseSnap(next);
      setPhase(next);
      persistSessionNow({
        inputs: sessionRef.current.inputs,
        ui: sessionRef.current.ui,
        phase: next,
        activePreset: sessionRef.current.activePreset,
      });
    },
    [persistSessionNow],
  );

  const dashboardSubHeaderProps = {
    phase,
    onPhase: onPhaseChange,
    grossMon: cDisplay.grossMon,
    totalFV: cDisplay.totalFV,
    targetRetirementAge: inputs.targetRetirementAge,
    guaranteedIncomeConfigured,
    guaranteedIncomeTooltip: cDisplay.guaranteedIncomeTooltip,
    onOpenGuaranteedIncomeConfig: () => {
      setMobileNavOpen(false);
      setConfigTab("guaranteed-income");
      setDrawer("config");
    },
    hasPortfolioBalances: dashboardHasPortfolio,
    marketScenarioId: normalizeMarketScenarioId(inputs.marketScenario),
    marketScenarioActive: resolveMarketScenarioActive(inputs),
    marketScenarioRetRate: inputs.retRate,
    yearsToRetirement: cDisplay.yearsToRetirement,
  } as const;

  const goalBarProps = {
    phase,
    growthGoal: inputs.growthGoal,
    growthGoalProgressPct: cDisplay.growthGoalProgressPct,
    monthlyIncomeGoal: inputs.monthlyIncomeGoal,
    incomeGoalProgressPct: cDisplay.incomeGoalProgressPct,
    hasPortfolioBalances: dashboardHasPortfolio,
    onGrowthGoal: (growthGoal: number) => setInputs({ growthGoal }),
    onMonthlyIncomeGoal: (monthlyIncomeGoal: number) =>
      setInputs({ monthlyIncomeGoal }),
  } as const;

  const dashboardGoalBar = showGoalBarRow ? (
    <GoalProgressBar {...goalBarProps} />
  ) : null;

  const dashboardSubHeader = showDashboardSubHeader ? (
    <SubHeader {...dashboardSubHeaderProps} />
  ) : null;

  const dashboardMainHero = showDashboardSubHeader ? (
    <DashboardMainHero
      stickyTopPx={0}
      showGoalBarRow={showGoalBarRow}
      goalBarProps={goalBarProps}
      subHeaderProps={dashboardSubHeaderProps}
      onStuckChange={setMainHeroStuck}
    />
  ) : null;

  return (
    <UserLocaleProvider residenceCountry={inputs.residenceCountry}>
      <>
        <div className="app-page-shell">
        <div
          className={[
            "app-header-shell",
            !fixedHeaderHeroHidden &&
              showGoalBarRow &&
              "app-header-shell--has-goal",
            fixedHeaderHeroHidden && "app-header-shell--hero-in-main",
            welcomeDone &&
              isWhereToRetire &&
              "app-header-shell--where-to-retire",
            !welcomeDone && "app-header-shell--onboarding",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="app-header-stack">
            <Header
              variant="app"
              onBrandClick={() => {
                setDrawer(null);
                setMobileNavOpen(false);
                navigateApp(APP_DASHBOARD_PATH);
              }}
              targetRetirementAge={inputs.targetRetirementAge}
              drawer={drawer}
              mobileNavOpen={mobileNavOpen}
              onMobileNavToggle={() => setMobileNavOpen((o) => !o)}
              onOpenDrawer={(name) => {
                if (!isDrawerNavAvailable(name, navContext)) return;
                setDrawer(name);
              }}
              navContext={navContext}
              onOpenConfig={() => {
                setMobileNavOpen(false);
                setConfigTab(user ? "profile" : "plan");
                setDrawer("config");
              }}
              onSignIn={openAuthSignIn}
              onCreateAccount={openAuthRegister}
              welcomeDone={welcomeDone}
            />
            <AppLeftNav
              targetRetirementAge={inputs.targetRetirementAge}
              drawer={drawer}
              mobileOpen={mobileNavOpen}
              onMobileOpenChange={setMobileNavOpen}
              onOpenDrawer={(name) => {
                if (!isDrawerNavAvailable(name, navContext)) return;
                setDrawer(name);
              }}
              onOpenConfig={() => {
                setConfigTab(user ? "profile" : "plan");
                setDrawer("config");
              }}
              onOpenSignIn={() => {
                setMobileNavOpen(false);
                openAuthSignIn();
              }}
              onOpenRegister={() => {
                setMobileNavOpen(false);
                openAuthRegister();
              }}
              navContext={navContext}
              welcomeDone={welcomeDone}
            />
            {!fixedHeaderHeroHidden ? dashboardGoalBar : null}
            {!fixedHeaderHeroHidden ? dashboardSubHeader : null}
          </div>
        </div>
        {!welcomeDone ? (
          <OnboardingOverlay
            key={`${user?.id ?? "guest-onboarding"}-${onboardingMountKey}`}
            inputs={inputs}
            setInputs={setInputs}
            setUi={setUi}
            saveUserPrefs={user ? saveUserPrefs : undefined}
            onComplete={() => {
              setShowWelcome(false);
              replaceAppPath(APP_DASHBOARD_PATH);
            }}
            onConnectAccounts={() => setOpenImportRequest((n) => n + 1)}
            onAccountsSaved={() => {
              saveBalanceInputMode("manual");
              setBalanceMode("manual");
              setManualAccountsRev((n) => n + 1);
            }}
          />
        ) : null}
        <div
          ref={(el) => {
            if (el) initMainScrollRef(el);
          }}
          className={[
            "app-scroll-stack",
            isWhereToRetire &&
              welcomeDone &&
              "app-scroll-stack--where-to-retire",
            !welcomeDone && "app-scroll-stack--onboarding",
            fixedHeaderHeroHidden && "app-scroll-stack--hero-in-main",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="app-scroll-stack__main">
            {welcomeDone && isWhereToRetire ? (
              <WhereToRetire c={cDisplay} />
            ) : welcomeDone ? (
              <div
                className={[
                  "main",
                  showDashboardSubHeader && "main--has-hero",
                  mainHeroStuck && "main--hero-stuck",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {dashboardMainHero}
                <StripHeader
                  phase={phase}
                  c={cDisplay}
                  incomeMode={ui.incomeMode}
                  onIncomeMode={(incomeMode) => {
                    setUi({ incomeMode });
                    if (!incomeMode) setActivePreset(null);
                  }}
                  mergedRetirementPositionModels={
                    c.mergedRetirementPositionModels
                  }
                  mergedBrokeragePositionModels={
                    c.mergedBrokeragePositionModels
                  }
                  brkRate={inputs.brkRate}
                  onOpenPositionReturnEditor={onOpenPositionReturnEditor}
                  onRemovePositionReturn={(positionIds) => {
                    const remove = new Set(positionIds);
                    setInputs({
                      positionReturnModels: (
                        inputs.positionReturnModels ?? []
                      ).filter((p) => !remove.has(p.id)),
                    });
                  }}
                  retRate={inputs.retRate}
                  onRetRate={(r) => setInputs({ retRate: r })}
                  incYield={inputs.incYield}
                  onIncYield={(y) => {
                    setInputs({ incYield: y });
                    setActivePreset(null);
                    setUi({ incomeSecurityTicker: null });
                  }}
                  incGrowth={inputs.incGrowth}
                  onIncGrowth={(g) => {
                    setInputs({ incGrowth: g });
                  }}
                  brkBal={inputs.brkBal}
                  wdRate={inputs.wdRate}
                  onWdRate={(r) => setInputs({ wdRate: r })}
                  wdInflation={inputs.wdInflation}
                  onWdInflation={(x) => setInputs({ wdInflation: x })}
                  currentAge={c.currentAge}
                  targetRetirementAge={inputs.targetRetirementAge}
                  incomeSecurityTicker={ui.incomeSecurityTicker}
                  onIncomeSecuritySelect={(ticker) => {
                    if (ticker === null) {
                      setUi({ incomeSecurityTicker: null });
                      setActivePreset(null);
                      return;
                    }
                    const security = findIncomeSecurity(ticker);
                    if (!security) return;
                    setUi({ incomeSecurityTicker: ticker });
                    setActivePreset(null);
                    setInputs({
                      incYield: security.yield_est / 100,
                      incGrowth: navDriftFromErosionRisk(
                        security.nav_erosion_risk,
                      ),
                    });
                  }}
                  hideGrowthSlider={showGrowthAssumptionsPanel}
                />
                  <div
                    className={[
                      "section",
                      taxSummaryAvailable && "section--tax-summary",
                      showIncomeHarvestPreview &&
                        "section--tax-summary--income-harvest",
                      showGrowthAssumptionsPanel &&
                        "section--tax-summary--growth-assumptions",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div
                      className={
                        useTaxSummarySplitLayout
                          ? showIncomeHarvestPreview
                            ? "section--tax-summary__income-layout"
                            : "section--tax-summary__growth-layout"
                          : undefined
                      }
                      style={
                        useTaxSummarySplitLayout
                          ? undefined
                          : { display: "contents" }
                      }
                    >
                      <div
                        className={
                          c.hasPortfolioBalances
                            ? "portfolio-accounts-reveal portfolio-accounts-reveal--in"
                            : undefined
                        }
                      >
                        <TaxSummaryCard
                          c={cDisplay}
                          inputs={inputs}
                          showTaxSummary={taxSummaryAvailable}
                          incomeMode={phase === "income"}
                          showScenarioGuideTab={showScenarioGuideTab}
                          filingStatus={inputs.filingStatus}
                          onFilingStatusChange={(filingStatus) =>
                            setInputs({ filingStatus })
                          }
                          accountIncomeContext={harvestAccountIncomeContext}
                          onOpenSocialSecurity={
                            dashboardSubHeaderProps.onOpenGuaranteedIncomeConfig
                          }
                        >
                          <AccountBalances
                            readOnly
                            c={cDisplay}
                            phase={phase}
                            onOpenSocialSecurity={
                              dashboardSubHeaderProps.onOpenGuaranteedIncomeConfig
                            }
                            inputs={inputs}
                            setInputs={setInputs}
                            onManualPortfolioPlanApplied={(plan) => {
                              setInputs(plan);
                              saveCalculatorPhaseSnap("growth");
                              setPhase("growth");
                              const merged = {
                                ...sessionRef.current.inputs,
                                ...plan,
                              };
                              persistCalculatorSession({
                                inputs: applyImportedBalanceOverrides(merged),
                                ui: sessionRef.current.ui,
                                phase: "growth",
                                activePreset: sessionRef.current.activePreset,
                              });
                            }}
                            onBases={(b) =>
                              setInputsState((prev) => ({ ...prev, ...b }))
                            }
                            balanceMode={balanceMode}
                            onBalanceModeChange={onBalanceModeChange}
                            positionsImportRev={positionsImportRev}
                            manualAccountsRev={manualAccountsRev}
                            onImportedApplyBalances={onImportedApplyBalances}
                            onPositionsImportApplied={
                              onPositionsImportAppliedRetirement
                            }
                            onClearImportedForManual={() => {
                              clearAllPositionsImportFromCard();
                              saveBalanceInputMode("manual");
                              saveBrokerageBalanceMode("manual");
                              setInputsState((prev) => ({
                                ...prev,
                                positionReturnModels:
                                  filterImportedPositionReturnModels(
                                    prev.positionReturnModels,
                                  ),
                              }));
                              setPositionsImportRev((n) => n + 1);
                            }}
                            onRemoveRetirementAccounts={
                              onRemoveRetirementAccounts
                            }
                            openReturnEditorRequest={returnEditorOpen}
                            onReturnEditorOpenHandled={
                              onReturnEditorOpenHandled
                            }
                            mergeBrokerageInRetirementCard
                            brkBal={inputs.brkBal}
                            brkRate={inputs.brkRate}
                            brokerageMode={brokerageMode}
                            onOpenSignIn={openAuthSignIn}
                            onOpenUpgradeCsv={openCsvUpgrade}
                            openImportRequest={openImportRequest || undefined}
                            onImportOpenHandled={() => setOpenImportRequest(0)}
                            onManualAccountsCommitted={() =>
                              setManualAccountsRev((n) => n + 1)
                            }
                            accountIncomeFunds={ui.accountIncomeFunds}
                            onAccountIncomeFundChange={(storageKey, ticker) =>
                              setUiState((s) => {
                                const nextUi = {
                                  ...s,
                                  accountIncomeFunds: {
                                    ...s.accountIncomeFunds,
                                    [storageKey]: ticker,
                                  },
                                };
                                persistSessionNow({
                                  inputs: sessionRef.current.inputs,
                                  ui: nextUi,
                                  phase: sessionRef.current.phase,
                                  activePreset: sessionRef.current.activePreset,
                                });
                                return nextUi;
                              })
                            }
                            accountIncomeStrategies={ui.accountIncomeStrategies}
                            onAccountIncomeStrategyChange={(
                              storageKey,
                              strategy,
                            ) => {
                              setUiState((s) => {
                                const nextRates = { ...s.accountWithdrawRates };
                                if (
                                  (strategy === "withdraw" ||
                                    strategy === "both") &&
                                  nextRates[storageKey] == null
                                ) {
                                  nextRates[storageKey] =
                                    defaultWithdrawRateForStrategy(strategy);
                                }
                                const nextUi = {
                                  ...s,
                                  accountIncomeStrategies: {
                                    ...s.accountIncomeStrategies,
                                    [storageKey]: strategy,
                                  },
                                  accountWithdrawRates: nextRates,
                                };
                                persistSessionNow({
                                  inputs: sessionRef.current.inputs,
                                  ui: nextUi,
                                  phase: sessionRef.current.phase,
                                  activePreset: sessionRef.current.activePreset,
                                });
                                return nextUi;
                              });
                            }}
                            accountWithdrawRates={ui.accountWithdrawRates}
                            onAccountWithdrawRateChange={(storageKey, rate) =>
                              setUiState((s) => {
                                const nextUi = {
                                  ...s,
                                  accountWithdrawRates: {
                                    ...s.accountWithdrawRates,
                                    [storageKey]: rate,
                                  },
                                };
                                persistSessionNow({
                                  inputs: sessionRef.current.inputs,
                                  ui: nextUi,
                                  phase: sessionRef.current.phase,
                                  activePreset: sessionRef.current.activePreset,
                                });
                                return nextUi;
                              })
                            }
                          />
                        </TaxSummaryCard>
                      </div>
                      <div className="section--tax-summary__sidebar">
                        {showGrowthAssumptionsPanel ? (
                          <GrowthAssumptionsPanel
                          c={cDisplay}
                          inputs={inputs}
                          ui={uiForCompute}
                          balanceModes={{
                            retirement: balanceMode,
                            brokerage: brokerageMode,
                          }}
                          retRate={inputs.retRate}
                          onRetRate={(r) => setInputs({ retRate: r })}
                          brkRate={inputs.brkRate}
                          mergedRetirementPositionModels={
                            c.mergedRetirementPositionModels
                          }
                          mergedBrokeragePositionModels={
                            c.mergedBrokeragePositionModels
                          }
                          targetRetirementAge={inputs.targetRetirementAge}
                          onOpenPositionReturnEditor={
                            onOpenPositionReturnEditor
                          }
                          onRemovePositionReturn={(positionIds) => {
                            const remove = new Set(positionIds);
                            setInputs({
                              positionReturnModels: (
                                inputs.positionReturnModels ?? []
                              ).filter((p) => !remove.has(p.id)),
                            });
                          }}
                          onOpenGuaranteedIncomeConfig={
                            dashboardSubHeaderProps.onOpenGuaranteedIncomeConfig
                          }
                          onTargetRetirementAge={(targetRetirementAge) =>
                            setInputs({ targetRetirementAge })
                          }
                          />
                        ) : null}
                        {showIncomeHarvestPreview ? (
                          <IncomeHarvestPreviewPanel
                            monthlyIncome={cDisplay.grossMon}
                          />
                        ) : null}
                        {showGrowthAssumptionsPanel ? (
                          <WhereToRetirePanelEntry
                            monthlyIncome={cDisplay.grossMon}
                          />
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/*
                  Life Events section — commented out, may reuse later
                  {c.hasPortfolioBalances && phase === "growth" ? (
                    <div className="section section--life-events">
                      <LifeEventsSectionDivider />
                      <LifeEventsPanel
                        projectionData={lifeEventsProjectionData}
                        retirementYear={c.retirementCalendarYear}
                        monthlyPortfolioIncome={cDisplay.monPort}
                        activePhase={phase}
                        withdrawalRate={inputs.wdRate}
                        hsaBalance={inputs.baseHsa}
                        eventCards={lifeEventCards}
                        onEventCardsChange={handleLifeEventCardsChange}
                        onEventActiveChange={handleLifeEventActiveChange}
                      />
                    </div>
                  ) : null}
                  */}
              </div>
            ) : null}
          </div>
        </div>
        <AccountPlanBottomBanner onOpenUpgrade={openCsvUpgrade} />
        <AppPrivacyTrust dividerAbove={isWhereToRetire} />
        </div>

        <DrawerPanel
          drawer={drawer}
          onClose={() => setDrawer(null)}
          c={cDisplay}
          inputs={inputs}
          setInputs={setInputs}
          balanceMode={balanceMode}
          onBalanceModeChange={onBalanceModeChange}
          brokerageMode={brokerageMode}
          onBrokerageModeChange={onBrokerageModeChange}
          positionsImportRev={positionsImportRev}
          onImportedApplyBalances={onImportedApplyBalances}
          onPositionsImportAppliedRetirement={
            onPositionsImportAppliedRetirement
          }
          onPositionsImportAppliedBrokerage={onPositionsImportAppliedBrokerage}
          configInitialTab={configTab}
          onOpenRegister={openAuthRegister}
          onResetGuestProfile={onResetGuestProfile}
          lifePlans={lifePlans}
          onLifePlansChange={setLifePlans}
          currentYear={c.retirementCalendarYear - c.yearsToRetirement}
        />
        <AuthModal
          open={authModal}
          onClose={() => {
            const mode: AuthModalMode | null =
              typeof authModal === "string"
                ? authModal
                : (authModal?.mode ?? null);
            if (mode === "google_checkout") clearGoogleCheckoutUi();
            setAuthModal(null);
          }}
          onSwitchMode={(mode) => setAuthModal(mode)}
        />
      </>
    </UserLocaleProvider>
  );
}
