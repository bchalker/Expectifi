import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AuthModal, type AuthModalOpen, type AuthModalMode } from './components/AuthModal'
import { consumeLandingAuthIntent } from './lib/landingAuthIntent'
import { useAuth } from './context/AuthContext'
import { UserLocaleProvider } from './context/UserLocaleContext'
import { AccountBalances } from './components/AccountBalances'
import { LifeEventsPanel } from './components/LifeEventsPanel'
import { DrawerPanel } from './components/DrawerPanel'
import { SnapshotPanel } from './components/SnapshotPanel'
import { Header } from './components/Header'
import { AppLeftNav } from './components/AppLeftNav'
import { StripHeader } from './components/StripHeader'
import { GoalProgressBar } from './components/GoalProgressBar'
import { SubHeader } from './components/SubHeader'
import './components/AppHeaderStack.scss'
import { persistCalculatorSession } from './lib/appStateStorage'
import {
  loadBrokerageBalanceMode,
  saveBrokerageBalanceMode,
  type BrokerageBalanceMode,
} from './lib/brokerageBalanceMode'
import {
  computeResults,
  type CalculatorInputs,
  type CalculatorUi,
  type DrawerName,
} from './lib/computeResults'
import { buildLifeEventsProjectionData } from './lib/calc/lifeEvents'
import { clearStoredManualAccounts } from './lib/manualAccountEntries'
import { inputsForPersistedCalculatorSession, loadStoredFidelityImport } from './lib/fidelityStorage'
import {
  clearAllAccountBalancesFromCard,
  clearAllFidelityImportFromCard,
  filterAllFidelityPositionReturnModels,
} from './lib/removeRetirementAccounts'
import { loadBalanceInputMode, saveBalanceInputMode, type BalanceInputMode } from './lib/retirementBalanceMode'
import { getAccountsRevealDelayMs, getStripControlsRevealDelayMs } from './lib/portfolioWaveReveal'
import { syncNoPortfolioSubheaderDocumentAttr } from './lib/syncNoPortfolioSubheader'
import {
  applyFidelityBalanceOverrides,
  portfolioBalancesFromImport,
} from './lib/portfolioSourceExclusivity'
import { findIncomeSecurity, navDriftFromErosionRisk } from './lib/incomeSecurities'
import { isSsConfigured, clampClaimAge } from './lib/socialSecurity'
import {
  clearGuestProfileAndSession,
  heartbeatEphemeralGuestTab,
  initEphemeralGuestSession,
  shouldTrackEphemeralGuestTabs,
  teardownEphemeralGuestTab,
} from './lib/guestEphemeralStorage'
import { OnboardingOverlay } from './components/OnboardingOverlay'
import { shouldSkipWelcome, shouldShowWelcomeOverlay, peekForceOnboardingSession, consumeForceOnboardingSession } from './lib/welcomeGate'
import { useUserTier } from './hooks/useUserTier'
import { SavePlanPromptBanner } from './components/SavePlanPromptBanner'
import type { PlanPersistSnapshot } from './lib/planStorage'
import { clearSessionOnboardingComplete } from './lib/sessionFlags'
import {
  defaultCalculatorInputs,
  defaultCalculatorUi,
} from './lib/initialCalculatorInputs'
import { syncDisplayCurrencyFromResidence } from './lib/displayCurrency'
import {
  calculatorInputsToPlanningPrefs,
  inputsHavePlanningProfileFields,
  syncPlanningPrefsFromInputs,
  userPrefsToCalculatorPatch,
} from './lib/userPrefs'
import { manualAccountsForBrowserSave } from './lib/manualAccountEntries'
import {
  loadUserProfile,
  mergeProfileWithDbPrefs,
  profileSnapshotForBrowserSave,
  saveResidenceCountryToProfile,
  syncUserProfileFromCalculatorInputs,
} from './lib/userProfileStorage'
import type { ConfigDrawerTab } from './components/ConfigDrawerBody'
import { useAppPath } from './hooks/useAppPath'
import { useAppHeaderStackHeight } from './hooks/useAppHeaderStackHeight'
import { APP_DASHBOARD_PATH, APP_PATHS, navigateApp } from './lib/appPaths'
import { isDrawerNavAvailable, isSnapshotNavAvailable, type NavPanelContext } from './lib/appNavDrawers'
import { AppPrivacyTrust } from './components/AppPrivacyTrust'
import { WhereToRetire } from './pages/WhereToRetire'

const defaultInputs = defaultCalculatorInputs
const defaultUi = defaultCalculatorUi

type InitialAppState = {
  inputs: CalculatorInputs
  ui: CalculatorUi
  phase: 'growth' | 'income'
  activePreset: string | null
}

function freshAppState(): InitialAppState {
  return {
    inputs: applyFidelityBalanceOverrides({ ...defaultInputs }),
    ui: defaultUi,
    phase: 'growth',
    activePreset: 'p1',
  }
}

type AppProps = {
  initialAuthModal?: AuthModalOpen
}

export default function App({ initialAuthModal = null }: AppProps) {
  const {
    hydration,
    isHydrated,
    tier,
    updateSavePlanPromptSignals,
    registerBrowserSaveSnapshot,
  } = useUserTier()
  const [inputs, setInputsState] = useState<CalculatorInputs>(() => hydration.inputs)
  const [ui, setUiState] = useState<CalculatorUi>(() => hydration.ui)
  const [phase, setPhase] = useState<'growth' | 'income'>(() => hydration.phase)
  const [accordionOpen, setAccordionOpen] = useState(false)
  const [drawer, setDrawer] = useState<DrawerName | null>(null)
  const [configTab, setConfigTab] = useState<ConfigDrawerTab>('profile')
  const [activePreset, setActivePreset] = useState<string | null>(() => hydration.activePreset)
  const [fidelityImportRev, setFidelityImportRev] = useState(0)
  const [manualAccountsRev, setManualAccountsRev] = useState(0)
  const [balanceMode, setBalanceMode] = useState<BalanceInputMode>(() => loadBalanceInputMode())
  const [brokerageMode, setBrokerageMode] = useState<BrokerageBalanceMode>(() => loadBrokerageBalanceMode())
  const [returnEditorOpen, setReturnEditorOpen] = useState<{
    positionId: string
    anchorTop: number
    nonce: number
  } | null>(null)

  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [authModal, setAuthModal] = useState<AuthModalOpen>(initialAuthModal)

  const { loading: authLoading, resolveGoogleCheckoutFromUrl, clearGoogleCheckoutUi, user, saveUserPrefs } =
    useAuth()


  const path = useAppPath()
  const headerStackHeight = useAppHeaderStackHeight()
  const welcomeCtx = useMemo(
    () => ({
      onboardingComplete: hydration.onboardingComplete,
      onboardingDone: user?.onboardingDone,
      planPrefs: user?.planPrefs ?? null,
    }),
    [hydration.onboardingComplete, user?.onboardingDone, user?.planPrefs],
  )
  const welcomeBlockedRef = useRef(peekForceOnboardingSession())

  const [showWelcome, setShowWelcome] = useState(true)

  useEffect(() => {
    const country = inputs.residenceCountry?.trim() ?? ''
    if (!country) return
    syncDisplayCurrencyFromResidence(country)
    saveResidenceCountryToProfile(country)
  }, [inputs.residenceCountry])

  useEffect(() => {
    if (!isHydrated) return
    if (!consumeForceOnboardingSession()) return
    if (shouldSkipWelcome(welcomeCtx)) return
    welcomeBlockedRef.current = true
    setShowWelcome(true)
  }, [isHydrated, welcomeCtx])

  useEffect(() => {
    if (!isHydrated) return
    if (path !== APP_PATHS.onboarding) return
    if (shouldSkipWelcome(welcomeCtx)) {
      welcomeBlockedRef.current = false
      setShowWelcome(false)
      return
    }
    welcomeBlockedRef.current = true
    setShowWelcome(true)
  }, [isHydrated, path, welcomeCtx])

  const welcomeDone = !showWelcome

  const sessionRef = useRef({ inputs, ui, phase, activePreset })

  const buildBrowserSaveSnapshot = useCallback((): PlanPersistSnapshot => {
    const accounts = manualAccountsForBrowserSave()
    return {
      inputs,
      ui,
      phase,
      activePreset,
      profile: profileSnapshotForBrowserSave(inputs, ui),
      accounts,
    }
  }, [inputs, ui, phase, activePreset])

  useEffect(() => {
    registerBrowserSaveSnapshot(buildBrowserSaveSnapshot)
  }, [registerBrowserSaveSnapshot, buildBrowserSaveSnapshot])
  useEffect(() => {
    sessionRef.current = { inputs, ui, phase, activePreset }
  }, [inputs, ui, phase, activePreset])

  useEffect(() => {
    const registerIntent = consumeLandingAuthIntent()
    if (registerIntent) setAuthModal('register')
    else if (initialAuthModal) setAuthModal(initialAuthModal)
  }, [initialAuthModal])

  useEffect(() => {
    if (authLoading) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('google_checkout') !== '1') return
    let cancelled = false
    void (async () => {
      const result = await resolveGoogleCheckoutFromUrl()
      if (cancelled) return
      params.delete('google_checkout')
      const q = params.toString()
      window.history.replaceState(
        {},
        '',
        `${window.location.pathname}${q ? `?${q}` : ''}${window.location.hash}`,
      )
      if (result.status === 'payment_required') {
        setAuthModal('google_checkout')
      } else if (result.status === 'checkout_expired' || result.status === 'error') {
        setAuthModal('signin')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authLoading, resolveGoogleCheckoutFromUrl])

  const openAuthSignIn = useCallback(() => {
    setMobileNavOpen(false)
    setAuthModal('signin')
  }, [])

  const openAuthRegister = useCallback(() => {
    setMobileNavOpen(false)
    setAuthModal('register')
  }, [])

  const openCsvUpgrade = useCallback(() => {
    setMobileNavOpen(false)
    setAuthModal({ mode: 'register', source: 'csv' })
  }, [])

  const onResetGuestProfile = useCallback(() => {
    clearGuestProfileAndSession()
    clearSessionOnboardingComplete()
    welcomeBlockedRef.current = true
    const fresh = freshAppState()
    setInputsState(fresh.inputs)
    setUiState(fresh.ui)
    setPhase(fresh.phase)
    setActivePreset(fresh.activePreset)
    setShowWelcome(true)
  }, [])

  const onReturnEditorOpenHandled = useCallback(() => setReturnEditorOpen(null), [])

  const onOpenPositionReturnEditor = useCallback((positionId: string) => {
    setReturnEditorOpen({
      positionId,
      anchorTop: typeof window !== 'undefined' ? Math.min(window.innerHeight * 0.22, 200) : 140,
      nonce: Date.now(),
    })
  }, [])

  const setInputs = useCallback((p: Partial<CalculatorInputs>) => {
    setInputsState((s) => ({ ...s, ...p }))
  }, [])

  const onBalanceModeChange = useCallback((m: BalanceInputMode) => {
    saveBalanceInputMode(m)
    setBalanceMode(m)
  }, [])

  const onBrokerageModeChange = useCallback((m: BrokerageBalanceMode) => {
    saveBrokerageBalanceMode(m)
    setBrokerageMode(m)
    if (m === 'fidelity') {
      const imp = loadStoredFidelityImport()
      if (imp?.balances) setInputsState((s) => ({ ...s, brkBal: imp.balances.brkBal }))
    }
  }, [])

  const setUi = useCallback((p: Partial<CalculatorUi>) => {
    setUiState((s) => ({ ...s, ...p }))
  }, [])

  useEffect(() => {
    if (!isHydrated || authLoading) return
    if (user?.planPrefs) {
      mergeProfileWithDbPrefs(loadUserProfile(), user.planPrefs)
    }
    setBalanceMode(loadBalanceInputMode())
    setBrokerageMode(loadBrokerageBalanceMode())
    if (loadStoredFidelityImport()?.batches?.length) {
      setFidelityImportRev((n) => n + 1)
    }
  }, [isHydrated, authLoading, user?.id, user?.planPrefs])

  /** Ephemeral guest sessions: last-tab cleanup for browser_saved only (tier 1 skips all LS). */
  useEffect(() => {
    if (!isHydrated || authLoading || user) return
    if (!shouldTrackEphemeralGuestTabs()) return
    initEphemeralGuestSession()
    heartbeatEphemeralGuestTab()
    const heartbeatId = window.setInterval(() => heartbeatEphemeralGuestTab(), 20_000)
    const onPageHide = () => teardownEphemeralGuestTab()
    window.addEventListener('pagehide', onPageHide)
    return () => {
      window.clearInterval(heartbeatId)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [isHydrated, authLoading, user, tier])

  /** Persist calculator session when tier allows local plan writes. */
  useEffect(() => {
    if (!isHydrated || authLoading) return
    const id = window.setTimeout(() => {
      persistCalculatorSession({ inputs, ui, phase, activePreset })
      syncPlanningPrefsFromInputs(inputs)
      syncUserProfileFromCalculatorInputs(inputs, ui)
      const planningPrefs = calculatorInputsToPlanningPrefs(inputs)
      if (user && planningPrefs) {
        const monthlyGoal =
          Math.max(0, Math.round(inputs.monthlyIncomeGoal)) || user.planPrefs?.monthlyGoal || 0
        if (monthlyGoal > 0) {
          void saveUserPrefs({ ...planningPrefs, monthlyGoal })
        }
      }
    }, 400)
    return () => window.clearTimeout(id)
  }, [isHydrated, authLoading, inputs, ui, phase, activePreset, user, saveUserPrefs])

  /** After tier hydration, sync welcome overlay to hydration (anonymous = session-only). */
  useEffect(() => {
    if (!isHydrated || authLoading) return
    if (welcomeBlockedRef.current) return
    if (peekForceOnboardingSession()) return
    setShowWelcome(shouldShowWelcomeOverlay(welcomeCtx))
  }, [isHydrated, authLoading, welcomeCtx, hydration.onboardingComplete])

  useEffect(() => {
    if (!welcomeDone || typeof sessionStorage === 'undefined') return
    const openImport =
      sessionStorage.getItem('expectifi_open_import') === '1' ||
      sessionStorage.getItem('headwayplanner_open_import') === '1'
    if (!openImport) return
    sessionStorage.removeItem('expectifi_open_import')
    sessionStorage.removeItem('headwayplanner_open_import')
    setOpenImportRequest((n) => n + 1)
  }, [welcomeDone])

  useEffect(() => {
    if (!user?.planPrefs) return
    setInputsState((s) => {
      if (inputsHavePlanningProfileFields(s)) return s
      return { ...s, ...userPrefsToCalculatorPatch(user.planPrefs!) }
    })
  }, [user?.id, user?.planPrefs])

  const onFidelityApplyBalances = useCallback(
    (b: Pick<CalculatorInputs, 'base401k' | 'baseSE401k' | 'baseRoth' | 'baseHsa' | 'brkBal'>) => {
      clearStoredManualAccounts()
      setManualAccountsRev((n) => n + 1)
      saveBalanceInputMode('fidelity')
      saveBrokerageBalanceMode('fidelity')
      setBalanceMode('fidelity')
      setBrokerageMode('fidelity')
      setPhase('growth')
      setInputsState((prev) => {
        const next = {
          ...prev,
          ...portfolioBalancesFromImport(b),
        }
        persistCalculatorSession({
          inputs: inputsForPersistedCalculatorSession(applyFidelityBalanceOverrides(next)),
          ui: sessionRef.current.ui,
          phase: 'growth',
          activePreset: sessionRef.current.activePreset,
        })
        return next
      })
    },
    [],
  )

  const onFidelityImportAppliedRetirement = useCallback(() => {
    setFidelityImportRev((n) => n + 1)
    onBalanceModeChange('fidelity')
    onBrokerageModeChange('fidelity')
  }, [onBalanceModeChange, onBrokerageModeChange])

  const onRemoveRetirementAccounts = useCallback(() => {
    clearAllFidelityImportFromCard()
    clearStoredManualAccounts()
    saveBalanceInputMode('manual')
    saveBrokerageBalanceMode('manual')
    setBalanceMode('manual')
    setBrokerageMode('manual')
    setInputsState((prev) => ({
      ...prev,
      ...clearAllAccountBalancesFromCard(),
      positionReturnModels: filterAllFidelityPositionReturnModels(prev.positionReturnModels),
    }))
    setFidelityImportRev((n) => n + 1)
    setManualAccountsRev((n) => n + 1)
  }, [])

  const onFidelityImportAppliedBrokerage = useCallback(() => {
    setFidelityImportRev((n) => n + 1)
    onBrokerageModeChange('fidelity')
  }, [onBrokerageModeChange])

  const c = useMemo(
    () => computeResults(inputs, ui, { retirement: balanceMode, brokerage: brokerageMode }),
    [inputs, ui, balanceMode, brokerageMode],
  )

  const lifeEventsProjectionData = useMemo(
    () =>
      buildLifeEventsProjectionData(c, {
        retRate: inputs.retRate,
        brkRate: inputs.brkRate,
        save: inputs.save,
      }),
    [c, inputs.retRate, inputs.brkRate, inputs.save],
  )

  const ssBenefitsConfigured = isSsConfigured(inputs)
  /** Wave SS toggle: benefit triple entered, or user opted in via Configure / wave. */
  const ssTimingConfigured = ssBenefitsConfigured || ui.ssIncluded
  const dashboardHasPortfolio = welcomeDone && c.hasPortfolioBalances
  const navContext: NavPanelContext = useMemo(
    () => ({
      hasPortfolioBalances: dashboardHasPortfolio,
      ssConfigured: welcomeDone && ssBenefitsConfigured,
    }),
    [dashboardHasPortfolio, welcomeDone, ssTimingConfigured],
  )
  const isWhereToRetire = path === APP_PATHS.whereToRetire

  useEffect(() => {
    const dashboardVisible = welcomeDone && !isWhereToRetire && !user
    updateSavePlanPromptSignals({
      dashboardVisible,
      projectedIncomeMonthly: dashboardVisible ? c.grossMon : 0,
    })
  }, [welcomeDone, isWhereToRetire, user, c.grossMon, updateSavePlanPromptSignals])

  const hasGoalBar =
    welcomeDone &&
    !isWhereToRetire &&
    c.hasPortfolioBalances &&
    ((phase === 'growth' && inputs.growthGoal > 0) ||
      (phase === 'income' && inputs.monthlyIncomeGoal > 0))
  const [portfolioControlsRevealed, setPortfolioControlsRevealed] = useState(false)
  const [portfolioAccountsRevealed, setPortfolioAccountsRevealed] = useState(false)
  const [openImportRequest, setOpenImportRequest] = useState(0)

  useLayoutEffect(() => {
    if (!welcomeDone) {
      document.documentElement.removeAttribute('data-no-portfolio-subheader')
      return
    }
    syncNoPortfolioSubheaderDocumentAttr(c.hasPortfolioBalances)
  }, [welcomeDone, c.hasPortfolioBalances])

  useEffect(() => {
    if (!isSnapshotNavAvailable(navContext) && accordionOpen) {
      setAccordionOpen(false)
    }
    if (drawer != null && drawer !== 'config' && !isDrawerNavAvailable(drawer, navContext)) {
      setDrawer(null)
    }
  }, [navContext, accordionOpen, drawer])

  useEffect(() => {
    if (!isWhereToRetire) return
    setDrawer(null)
    setAccordionOpen(false)
    setMobileNavOpen(false)
    setPhase('income')
  }, [isWhereToRetire])

  const hadPortfolioBalancesRef = useRef(c.hasPortfolioBalances)

  /** First time balances appear (manual or import), default to Growth (portfolio at retirement). */
  useEffect(() => {
    if (!welcomeDone) return
    const had = hadPortfolioBalancesRef.current
    hadPortfolioBalancesRef.current = c.hasPortfolioBalances
    if (c.hasPortfolioBalances && !had) {
      setPhase('growth')
    }
  }, [welcomeDone, c.hasPortfolioBalances])

  /** Yield / return strip: headline after wave; slider row staggers in CSS (see StripHeader.scss). */
  useEffect(() => {
    if (!welcomeDone || !c.hasPortfolioBalances) {
      setPortfolioControlsRevealed(false)
      return
    }
    const delayMs = getStripControlsRevealDelayMs()
    const id = window.setTimeout(() => setPortfolioControlsRevealed(true), delayMs)
    return () => window.clearTimeout(id)
  }, [welcomeDone, c.hasPortfolioBalances])

  /** Retirement account card: stagger after strip yield/return sliders (see calculator.scss). */
  useEffect(() => {
    if (!welcomeDone || !c.hasPortfolioBalances) {
      setPortfolioAccountsRevealed(false)
      return
    }
    const delayMs = getAccountsRevealDelayMs()
    const id = window.setTimeout(() => setPortfolioAccountsRevealed(true), delayMs)
    return () => window.clearTimeout(id)
  }, [welcomeDone, c.hasPortfolioBalances])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(min-width: 761px)')
    const onChange = () => {
      if (mq.matches) setMobileNavOpen(false)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return (
    <UserLocaleProvider residenceCountry={inputs.residenceCountry}>
    <>
      <div
        className={[
          'app-header-shell',
          hasGoalBar && 'app-header-shell--has-goal',
          phase === 'income' && welcomeDone && ssTimingConfigured && 'app-header-shell--ss-claim',
          welcomeDone && isWhereToRetire && 'app-header-shell--where-to-retire',
          !welcomeDone && 'app-header-shell--onboarding',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="app-header-stack">
        <Header
          variant="app"
          onBrandClick={() => {
            setDrawer(null)
            setAccordionOpen(false)
            setMobileNavOpen(false)
            navigateApp(APP_DASHBOARD_PATH)
          }}
          targetRetirementAge={inputs.targetRetirementAge}
          drawer={drawer}
          snapshotOpen={accordionOpen}
          mobileNavOpen={mobileNavOpen}
          onMobileNavToggle={() => setMobileNavOpen((o) => !o)}
          onOpenDrawer={(name) => {
            if (!isDrawerNavAvailable(name, navContext)) return
            setAccordionOpen(false)
            setDrawer(name)
          }}
          onSnapshotToggle={() => {
            if (!isSnapshotNavAvailable(navContext)) return
            setAccordionOpen((a) => {
              const next = !a
              if (next) setDrawer(null)
              return next
            })
          }}
          navContext={navContext}
          onOpenConfig={() => {
            setMobileNavOpen(false)
            setAccordionOpen(false)
            setConfigTab(user ? 'profile' : 'plan')
            setDrawer('config')
          }}
          onSignIn={openAuthSignIn}
          onCreateAccount={openAuthRegister}
          welcomeDone={welcomeDone}
        />
        {hasGoalBar ? (
        <GoalProgressBar
          phase={phase}
          growthGoal={inputs.growthGoal}
          growthGoalProgressPct={c.growthGoalProgressPct}
          monthlyIncomeGoal={inputs.monthlyIncomeGoal}
          incomeGoalProgressPct={c.incomeGoalProgressPct}
          hasPortfolioBalances={dashboardHasPortfolio}
        />
        ) : null}
        {welcomeDone && !isWhereToRetire ? (
          <SubHeader
            phase={phase}
            onPhase={setPhase}
            grossMon={c.grossMon}
            totalFV={c.totalFV}
            targetRetirementAge={inputs.targetRetirementAge}
            ssIncluded={ui.ssIncluded}
            onSsIncluded={(v) => setUi({ ssIncluded: v })}
            ssClaimAge={clampClaimAge(inputs.ssAge)}
            onSsClaimAgeChange={(age) => setInputs({ ssAge: clampClaimAge(age) })}
            ssTimingConfigured={welcomeDone && ssTimingConfigured}
            onOpenSsConfig={() => {
              setMobileNavOpen(false)
              setAccordionOpen(false)
              setConfigTab('social-security')
              setDrawer('config')
            }}
            hasPortfolioBalances={dashboardHasPortfolio}
          />
        ) : null}
        </div>
        <div className="subheader-spacer" aria-hidden="true" />
      </div>
      {!welcomeDone ? (
        <OnboardingOverlay
          key={user?.id ?? 'guest-onboarding'}
          headerStackHeight={headerStackHeight}
          inputs={inputs}
          setInputs={setInputs}
          setUi={setUi}
          saveUserPrefs={user ? saveUserPrefs : undefined}
          onComplete={() => {
            welcomeBlockedRef.current = false
            setShowWelcome(false)
          }}
          onConnectAccounts={() => setOpenImportRequest((n) => n + 1)}
          onAccountsSaved={() => {
            saveBalanceInputMode('manual')
            setBalanceMode('manual')
            setManualAccountsRev((n) => n + 1)
          }}
        />
      ) : null}
      <AppLeftNav
        targetRetirementAge={inputs.targetRetirementAge}
        drawer={drawer}
        snapshotOpen={accordionOpen}
        mobileOpen={mobileNavOpen}
        onMobileOpenChange={setMobileNavOpen}
        onOpenDrawer={(name) => {
          if (!isDrawerNavAvailable(name, navContext)) return
          setAccordionOpen(false)
          setDrawer(name)
        }}
        onSnapshotToggle={() => {
          if (!isSnapshotNavAvailable(navContext)) return
          setAccordionOpen((a) => {
            const next = !a
            if (next) setDrawer(null)
            return next
          })
        }}
        onOpenConfig={() => {
          setAccordionOpen(false)
          setConfigTab(user ? 'profile' : 'plan')
          setDrawer('config')
        }}
        onOpenSignIn={() => {
          setMobileNavOpen(false)
          openAuthSignIn()
        }}
        onOpenRegister={() => {
          setMobileNavOpen(false)
          openAuthRegister()
        }}
        navContext={navContext}
        welcomeDone={welcomeDone}
      />
      <div
        className={[
          'app-scroll-stack',
          isWhereToRetire && welcomeDone && 'app-scroll-stack--where-to-retire',
          !welcomeDone && 'app-scroll-stack--onboarding',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="app-scroll-stack__main">
      {welcomeDone && isWhereToRetire ? (
        <WhereToRetire c={c} />
      ) : welcomeDone ? (
        <>
      <StripHeader
        phase={phase}
        c={c}
        portfolioControlsRevealed={portfolioControlsRevealed}
        incomeMode={ui.incomeMode}
        onIncomeMode={(incomeMode) => {
          setUi({ incomeMode })
          if (!incomeMode) setActivePreset(null)
        }}
        ssIncluded={ui.ssIncluded}
        mergedRetirementPositionModels={c.mergedRetirementPositionModels}
        mergedBrokeragePositionModels={c.mergedBrokeragePositionModels}
        brkRate={inputs.brkRate}
        onOpenPositionReturnEditor={onOpenPositionReturnEditor}
        onRemovePositionReturn={(positionIds) => {
          const remove = new Set(positionIds)
          setInputs({
            positionReturnModels: (inputs.positionReturnModels ?? []).filter(
              (p) => !remove.has(p.id),
            ),
          })
        }}
        retRate={inputs.retRate}
        onRetRate={(r) => setInputs({ retRate: r })}
        incYield={inputs.incYield}
        onIncYield={(y) => {
          setInputs({ incYield: y })
          setActivePreset(null)
          setUi({ incomeSecurityTicker: null })
        }}
        incGrowth={inputs.incGrowth}
        onIncGrowth={(g) => {
          setInputs({ incGrowth: g })
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
            setUi({ incomeSecurityTicker: null })
            setActivePreset(null)
            return
          }
          const security = findIncomeSecurity(ticker)
          if (!security) return
          setUi({ incomeSecurityTicker: ticker })
          setActivePreset(null)
          setInputs({
            incYield: security.yield_est / 100,
            incGrowth: navDriftFromErosionRisk(security.nav_erosion_risk),
          })
        }}
      />

      <div className="main">
        <div className="section">
          <div
            className={
              c.hasPortfolioBalances
                ? portfolioAccountsRevealed
                  ? 'portfolio-accounts-reveal portfolio-accounts-reveal--in'
                  : 'portfolio-accounts-reveal portfolio-accounts-reveal--pending'
                : undefined
            }
          >
            <AccountBalances
              readOnly
              c={c}
              inputs={inputs}
              setInputs={setInputs}
              onManualPortfolioPlanApplied={(plan) => {
                setInputs(plan)
                setPhase('growth')
                const merged = { ...sessionRef.current.inputs, ...plan }
                persistCalculatorSession({
                  inputs: applyFidelityBalanceOverrides(merged),
                  ui: sessionRef.current.ui,
                  phase: 'growth',
                  activePreset: sessionRef.current.activePreset,
                })
              }}
              onBases={(b) => setInputsState((prev) => ({ ...prev, ...b }))}
              balanceMode={balanceMode}
              onBalanceModeChange={onBalanceModeChange}
              fidelityImportRev={fidelityImportRev}
              manualAccountsRev={manualAccountsRev}
              onFidelityApplyBalances={onFidelityApplyBalances}
              onFidelityImportApplied={onFidelityImportAppliedRetirement}
              onClearImportedForManual={() => {
                clearAllFidelityImportFromCard()
                saveBalanceInputMode('manual')
                saveBrokerageBalanceMode('manual')
                setInputsState((prev) => ({
                  ...prev,
                  positionReturnModels: filterAllFidelityPositionReturnModels(
                    prev.positionReturnModels,
                  ),
                }))
                setFidelityImportRev((n) => n + 1)
              }}
              onRemoveRetirementAccounts={onRemoveRetirementAccounts}
              openReturnEditorRequest={returnEditorOpen}
              onReturnEditorOpenHandled={onReturnEditorOpenHandled}
              mergeBrokerageInRetirementCard
              brkBal={inputs.brkBal}
              brkRate={inputs.brkRate}
              brokerageMode={brokerageMode}
              onOpenSignIn={openAuthSignIn}
              onOpenUpgradeCsv={openCsvUpgrade}
              openImportRequest={openImportRequest || undefined}
              onImportOpenHandled={() => setOpenImportRequest(0)}
              onManualAccountsCommitted={() => setManualAccountsRev((n) => n + 1)}
            />
          </div>

          {c.hasPortfolioBalances ? (
            <LifeEventsPanel
              projectionData={lifeEventsProjectionData}
              retirementYear={c.retirementCalendarYear}
              monthlyPortfolioIncome={c.monPort}
            />
          ) : null}

        </div>

        <hr className="divider" />
      </div>
        </>
      ) : null}
        </div>
      </div>
      <AppPrivacyTrust dividerAbove={isWhereToRetire} />

      <SnapshotPanel
        open={accordionOpen}
        onClose={() => setAccordionOpen(false)}
        c={c}
        incomeMode={ui.incomeMode}
        incYield={inputs.incYield}
        incGrowth={inputs.incGrowth}
        wdRate={inputs.wdRate}
        brkBal={inputs.brkBal}
        ssIncluded={ui.ssIncluded}
        targetRetirementAge={inputs.targetRetirementAge}
      />
      <DrawerPanel
        drawer={drawer}
        onClose={() => setDrawer(null)}
        c={c}
        inputs={inputs}
        setInputs={setInputs}
        balanceMode={balanceMode}
        onBalanceModeChange={onBalanceModeChange}
        brokerageMode={brokerageMode}
        onBrokerageModeChange={onBrokerageModeChange}
        fidelityImportRev={fidelityImportRev}
        onFidelityApplyBalances={onFidelityApplyBalances}
        onFidelityImportAppliedRetirement={onFidelityImportAppliedRetirement}
        onFidelityImportAppliedBrokerage={onFidelityImportAppliedBrokerage}
        configInitialTab={configTab}
        ssIncluded={ui.ssIncluded}
        setUi={setUi}
        onOpenRegister={openAuthRegister}
        onResetGuestProfile={onResetGuestProfile}
      />
      <SavePlanPromptBanner />
      <AuthModal
        open={authModal}
        onClose={() => {
          const mode: AuthModalMode | null =
            typeof authModal === 'string' ? authModal : authModal?.mode ?? null
          if (mode === 'google_checkout') clearGoogleCheckoutUi()
          setAuthModal(null)
        }}
        onSwitchMode={(mode) => setAuthModal(mode)}
      />
    </>
    </UserLocaleProvider>
  )
}
