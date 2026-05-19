import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AuthModal, type AuthModalMode } from './components/AuthModal'
import { consumeLandingAuthIntent } from './lib/landingAuthIntent'
import { useAuth } from './context/AuthContext'
import { AccountBalances } from './components/AccountBalances'
import { DrawerPanel } from './components/DrawerPanel'
import { SnapshotPanel } from './components/SnapshotPanel'
import { Header } from './components/Header'
import { AppLeftNav } from './components/AppLeftNav'
import { StripHeader } from './components/StripHeader'
import { GoalProgressBar } from './components/GoalProgressBar'
import { SubHeader } from './components/SubHeader'
import './components/AppHeaderStack.scss'
import {
  loadPersistedCalculatorSession,
  persistCalculatorSession,
} from './lib/appStateStorage'
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
import { loadStoredFidelityImport } from './lib/fidelityStorage'
import {
  clearAllAccountBalancesFromCard,
  clearAllFidelityImportFromCard,
  filterAllFidelityPositionReturnModels,
} from './lib/removeRetirementAccounts'
import { loadBalanceInputMode, saveBalanceInputMode, type BalanceInputMode } from './lib/retirementBalanceMode'
import { getAccountsRevealDelayMs, getStripControlsRevealDelayMs } from './lib/portfolioWaveReveal'
import { syncNoPortfolioSubheaderDocumentAttr } from './lib/syncNoPortfolioSubheader'
import { isSsConfigured, normalizeClaimAge, type SsClaimAge } from './lib/socialSecurity'
import { heartbeatEphemeralGuestTab, initEphemeralGuestSession, teardownEphemeralGuestTab } from './lib/guestEphemeralStorage'
import { OnboardingOverlay } from './components/OnboardingOverlay'
import { shouldSkipWelcome } from './lib/welcomeGate'
import {
  defaultCalculatorInputs,
  defaultCalculatorUi,
} from './lib/initialCalculatorInputs'
import {
  calculatorInputsToUserPrefs,
  inputsHavePlanningProfileFields,
  loadLocalUserPrefs,
  syncPlanningPrefsFromInputs,
  userPrefsToCalculatorPatch,
} from './lib/userPrefs'
import type { ConfigDrawerTab } from './components/ConfigDrawerBody'
import { useAppPath } from './hooks/useAppPath'
import { APP_DASHBOARD_PATH, APP_PATHS, navigateApp } from './lib/appPaths'
import { isDrawerNavAvailable, isSnapshotNavAvailable, type NavPanelContext } from './lib/appNavDrawers'
import { AppPrivacyTrust } from './components/AppPrivacyTrust'
import { WhereToRetire } from './pages/WhereToRetire'

const defaultInputs = defaultCalculatorInputs
const defaultUi = defaultCalculatorUi

function applyFidelityBalanceOverrides(inputs: CalculatorInputs): CalculatorInputs {
  const imp = loadStoredFidelityImport()
  if (!imp?.balances) return inputs
  const rabMode = loadBalanceInputMode()
  const brkMode = loadBrokerageBalanceMode()
  const d = { ...inputs }
  if (rabMode === 'fidelity') {
    d.base401k = imp.balances.base401k
    d.baseSE401k = imp.balances.baseSE401k
    d.baseRoth = imp.balances.baseRoth
    d.baseHsa = imp.balances.baseHsa
  }
  if (brkMode === 'fidelity' || rabMode === 'fidelity') {
    d.brkBal = imp.balances.brkBal
  }
  return d
}

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

function mergeStoredWelcomePrefs(state: InitialAppState): InitialAppState {
  const prefs = loadLocalUserPrefs()
  if (!prefs) return state
  return {
    ...state,
    inputs: { ...state.inputs, ...userPrefsToCalculatorPatch(prefs) },
  }
}

function resolveInitialAppState(): InitialAppState {
  const persisted = loadPersistedCalculatorSession(defaultInputs, defaultUi)
  if (persisted) {
    return {
      inputs: applyFidelityBalanceOverrides(persisted.inputs),
      ui: persisted.ui,
      phase: persisted.phase,
      activePreset: persisted.activePreset,
    }
  }
  return mergeStoredWelcomePrefs(freshAppState())
}

type AppProps = {
  initialAuthModal?: AuthModalMode | null
}

export default function App({ initialAuthModal = null }: AppProps) {
  const [inputs, setInputsState] = useState<CalculatorInputs>(() => freshAppState().inputs)
  const [ui, setUiState] = useState<CalculatorUi>(() => freshAppState().ui)
  const [phase, setPhase] = useState<'growth' | 'income'>(() => freshAppState().phase)
  const [accordionOpen, setAccordionOpen] = useState(false)
  const [drawer, setDrawer] = useState<DrawerName | null>(null)
  const [configTab, setConfigTab] = useState<ConfigDrawerTab>('profile')
  const [activePreset, setActivePreset] = useState<string | null>(() => freshAppState().activePreset)
  const [fidelityImportRev, setFidelityImportRev] = useState(0)
  const [balanceMode, setBalanceMode] = useState<BalanceInputMode>(() => loadBalanceInputMode())
  const [brokerageMode, setBrokerageMode] = useState<BrokerageBalanceMode>(() => loadBrokerageBalanceMode())
  const [returnEditorOpen, setReturnEditorOpen] = useState<{
    positionId: string
    anchorTop: number
    nonce: number
  } | null>(null)

  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [authModal, setAuthModal] = useState<AuthModalMode | null>(initialAuthModal)

  const { loading: authLoading, resolveGoogleCheckoutFromUrl, clearGoogleCheckoutUi, user, saveUserPrefs } =
    useAuth()

  const skipWelcome = shouldSkipWelcome({
    onboardingDone: user?.onboardingDone,
    planPrefs: user?.planPrefs ?? null,
    inputs,
  })
  const [welcomeDone, setWelcomeDone] = useState(skipWelcome)

  const sessionRef = useRef({ inputs, ui, phase, activePreset })
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

  const requestIncomePresetAdd = useCallback(() => {
    setPhase('income')
    setAccordionOpen(false)
    setConfigTab('presets')
    setDrawer('config')
    setUiState((s) => ({
      ...s,
      incomeMode: true,
      incomePresetEditorFocusSeq: (s.incomePresetEditorFocusSeq ?? 0) + 1,
    }))
  }, [])

  /** Rehydrate from localStorage when auth changes (guest ↔ signed-in) so CSV + plan fields survive checkout. */
  useEffect(() => {
    if (authLoading) return
    if (!user) initEphemeralGuestSession()
    const restored = resolveInitialAppState()
    setInputsState(restored.inputs)
    setUiState(restored.ui)
    setPhase(restored.phase)
    setActivePreset(restored.activePreset)
    setBalanceMode(loadBalanceInputMode())
    setBrokerageMode(loadBrokerageBalanceMode())
    if (loadStoredFidelityImport()?.batches?.length) {
      setFidelityImportRev((n) => n + 1)
    }
  }, [authLoading, user?.id])

  /** Ephemeral guest sessions: clear local plan data when the last guest tab closes. */
  useEffect(() => {
    if (authLoading || user) return
    initEphemeralGuestSession()
    heartbeatEphemeralGuestTab()
    const heartbeatId = window.setInterval(() => heartbeatEphemeralGuestTab(), 20_000)
    const onPageHide = () => teardownEphemeralGuestTab()
    window.addEventListener('pagehide', onPageHide)
    return () => {
      window.clearInterval(heartbeatId)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [authLoading, user])

  /** Persist calculator session for guests and signed-in users (Fidelity CSV lives in its own storage key). */
  useEffect(() => {
    if (authLoading) return
    const id = window.setTimeout(() => {
      persistCalculatorSession({ inputs, ui, phase, activePreset })
      syncPlanningPrefsFromInputs(inputs)
      const prefs = calculatorInputsToUserPrefs(inputs)
      if (user && prefs) void saveUserPrefs(prefs)
    }, 400)
    return () => window.clearTimeout(id)
  }, [authLoading, inputs, ui, phase, activePreset, user, saveUserPrefs])

  /** Once welcome is dismissed, do not re-open when monthly goal is cleared in Configure. */
  useEffect(() => {
    if (skipWelcome) setWelcomeDone(true)
  }, [skipWelcome])

  useEffect(() => {
    if (!welcomeDone || typeof sessionStorage === 'undefined') return
    if (sessionStorage.getItem('headwayplanner_open_import') !== '1') return
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
      setPhase('growth')
      setInputsState((prev) => {
        const next = {
          ...prev,
          ...(balanceMode === 'fidelity'
            ? {
                base401k: b.base401k,
                baseSE401k: b.baseSE401k,
                baseRoth: b.baseRoth,
                baseHsa: b.baseHsa,
              }
            : {}),
          brkBal: b.brkBal,
        }
        persistCalculatorSession({
          inputs: applyFidelityBalanceOverrides(next),
          ui: sessionRef.current.ui,
          phase: 'growth',
          activePreset: sessionRef.current.activePreset,
        })
        return next
      })
    },
    [balanceMode],
  )

  const onFidelityImportAppliedRetirement = useCallback(() => {
    setFidelityImportRev((n) => n + 1)
    onBalanceModeChange('fidelity')
    onBrokerageModeChange('fidelity')
  }, [onBalanceModeChange, onBrokerageModeChange])

  const onRemoveRetirementAccounts = useCallback(() => {
    clearAllFidelityImportFromCard()
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
  }, [])

  const onFidelityImportAppliedBrokerage = useCallback(() => {
    setFidelityImportRev((n) => n + 1)
    onBrokerageModeChange('fidelity')
  }, [onBrokerageModeChange])

  const c = useMemo(
    () => computeResults(inputs, ui, { retirement: balanceMode, brokerage: brokerageMode }),
    [inputs, ui, balanceMode, brokerageMode],
  )

  const ssTimingConfigured = isSsConfigured(inputs)
  const navContext: NavPanelContext = useMemo(
    () => ({
      hasPortfolioBalances: c.hasPortfolioBalances,
      ssConfigured: ssTimingConfigured,
    }),
    [c.hasPortfolioBalances, ssTimingConfigured],
  )
  const path = useAppPath()
  const isWhereToRetire = path === APP_PATHS.whereToRetire

  const hasGoalBar =
    c.hasPortfolioBalances &&
    ((phase === 'growth' && inputs.growthGoal > 0) || (phase === 'income' && inputs.monthlyIncomeGoal > 0))
  const [portfolioControlsRevealed, setPortfolioControlsRevealed] = useState(false)
  const [portfolioAccountsRevealed, setPortfolioAccountsRevealed] = useState(false)
  const [openImportRequest, setOpenImportRequest] = useState(0)

  useEffect(() => {
    syncNoPortfolioSubheaderDocumentAttr(c.hasPortfolioBalances)
  }, [c.hasPortfolioBalances])

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
    const had = hadPortfolioBalancesRef.current
    hadPortfolioBalancesRef.current = c.hasPortfolioBalances
    if (c.hasPortfolioBalances && !had) {
      setPhase('growth')
    }
  }, [c.hasPortfolioBalances])

  /** Yield / return strip: headline after wave; slider row staggers in CSS (see StripHeader.scss). */
  useEffect(() => {
    if (!c.hasPortfolioBalances) {
      setPortfolioControlsRevealed(false)
      return
    }
    const delayMs = getStripControlsRevealDelayMs()
    const id = window.setTimeout(() => setPortfolioControlsRevealed(true), delayMs)
    return () => window.clearTimeout(id)
  }, [c.hasPortfolioBalances])

  /** Retirement account card: stagger after strip yield/return sliders (see calculator.scss). */
  useEffect(() => {
    if (!c.hasPortfolioBalances) {
      setPortfolioAccountsRevealed(false)
      return
    }
    const delayMs = getAccountsRevealDelayMs()
    const id = window.setTimeout(() => setPortfolioAccountsRevealed(true), delayMs)
    return () => window.clearTimeout(id)
  }, [c.hasPortfolioBalances])

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
    <>
      <div
        className={`app-header-shell${hasGoalBar ? ' app-header-shell--has-goal' : ''}${phase === 'income' && ssTimingConfigured ? ' app-header-shell--ss-claim' : ''}`}
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
        />
        <GoalProgressBar
          phase={phase}
          growthGoal={inputs.growthGoal}
          growthGoalProgressPct={c.growthGoalProgressPct}
          monthlyIncomeGoal={inputs.monthlyIncomeGoal}
          incomeGoalProgressPct={c.incomeGoalProgressPct}
          hasPortfolioBalances={c.hasPortfolioBalances}
        />
        <SubHeader
          phase={phase}
          onPhase={setPhase}
          grossMon={c.grossMon}
          totalFV={c.totalFV}
          targetRetirementAge={inputs.targetRetirementAge}
          ssIncluded={ui.ssIncluded}
          onSsIncluded={(v) => setUi({ ssIncluded: v })}
          ssClaimAge={normalizeClaimAge(inputs.ssAge)}
          onSsClaimAgeChange={(age: SsClaimAge) => setInputs({ ssAge: age })}
          ssTimingConfigured={ssTimingConfigured}
          onOpenSsConfig={() => {
            setMobileNavOpen(false)
            setAccordionOpen(false)
            setConfigTab('social-security')
            setDrawer('config')
          }}
          hasPortfolioBalances={c.hasPortfolioBalances}
        />
        </div>
        <div className="subheader-spacer" aria-hidden="true" />
      </div>
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
        onOpenSignIn={openAuthSignIn}
        onOpenRegister={openAuthRegister}
        navContext={navContext}
      />
      <div
        className={[
          'app-scroll-stack',
          isWhereToRetire && 'app-scroll-stack--where-to-retire',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="app-scroll-stack__main">
      {isWhereToRetire ? (
        <WhereToRetire c={c} />
      ) : (
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
        }}
        incGrowth={inputs.incGrowth}
        onIncGrowth={(g) => {
          setInputs({ incGrowth: g })
          setActivePreset(null)
        }}
        brkBal={inputs.brkBal}
        wdRate={inputs.wdRate}
        onWdRate={(r) => setInputs({ wdRate: r })}
        wdInflation={inputs.wdInflation}
        onWdInflation={(x) => setInputs({ wdInflation: x })}
        currentAge={c.currentAge}
        targetRetirementAge={inputs.targetRetirementAge}
        incomePresets={inputs.incomePresets}
        activePreset={activePreset}
        onIncomePresetPick={(pick) => {
          if (pick.kind === 'add') {
            requestIncomePresetAdd()
            return
          }
          if (pick.kind === 'manual') {
            setActivePreset(null)
            return
          }
          const p = inputs.incomePresets.find((x) => x.id === pick.id)
          if (!p) return
          setActivePreset(pick.id)
          setInputs({ incYield: p.y / 100, incGrowth: p.g / 100 })
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
              onFidelityApplyBalances={onFidelityApplyBalances}
              onFidelityImportApplied={onFidelityImportAppliedRetirement}
              onRemoveRetirementAccounts={onRemoveRetirementAccounts}
              openReturnEditorRequest={returnEditorOpen}
              onReturnEditorOpenHandled={onReturnEditorOpenHandled}
              mergeBrokerageInRetirementCard
              brkBal={inputs.brkBal}
              brkRate={inputs.brkRate}
              brokerageMode={brokerageMode}
              onOpenSignIn={openAuthSignIn}
              openImportRequest={openImportRequest || undefined}
              onImportOpenHandled={() => setOpenImportRequest(0)}
            />
          </div>

        </div>

        <hr className="divider" />
      </div>
        </>
      )}
        </div>
        <AppPrivacyTrust dividerAbove={isWhereToRetire} />
      </div>

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
        ui={ui}
        activePreset={activePreset}
        setActivePreset={setActivePreset}
        balanceMode={balanceMode}
        onBalanceModeChange={onBalanceModeChange}
        brokerageMode={brokerageMode}
        onBrokerageModeChange={onBrokerageModeChange}
        fidelityImportRev={fidelityImportRev}
        onFidelityApplyBalances={onFidelityApplyBalances}
        onFidelityImportAppliedRetirement={onFidelityImportAppliedRetirement}
        onFidelityImportAppliedBrokerage={onFidelityImportAppliedBrokerage}
        configInitialTab={configTab}
      />
      <AuthModal
        open={authModal}
        onClose={() => {
          if (authModal === 'google_checkout') clearGoogleCheckoutUi()
          setAuthModal(null)
        }}
        onSwitchMode={(mode) => setAuthModal(mode)}
      />
      {!welcomeDone ? (
        <OnboardingOverlay
          inputs={inputs}
          setInputs={setInputs}
          saveUserPrefs={user ? saveUserPrefs : undefined}
          onComplete={() => setWelcomeDone(true)}
          onConnectAccounts={() => setOpenImportRequest((n) => n + 1)}
        />
      ) : null}
    </>
  )
}
