import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AuthModal, type AuthModalMode } from './components/AuthModal'
import { consumeLandingAuthIntent } from './lib/landingAuthIntent'
import { OnboardingOverlay } from './components/OnboardingOverlay'
import { useAuth } from './context/AuthContext'
import { AccountBalances } from './components/AccountBalances'
import { DrawerPanel } from './components/DrawerPanel'
import { SnapshotPanel } from './components/SnapshotPanel'
import { IncomeInputs } from './components/IncomeInputs'
import { Header } from './components/Header'
import { AppLeftNav } from './components/AppLeftNav'
import { StripHeader } from './components/StripHeader'
import { GoalProgressBar } from './components/GoalProgressBar'
import { SubHeader } from './components/SubHeader'
import './components/AppHeaderStack.scss'
import { buildSnapshot, hydrateAppSnapshot, type AppSnapshotV1 } from './lib/appSnapshot'
import { loadStoredAppState, saveStoredAppState } from './lib/appStateStorage'
import {
  loadBrokerageBalanceMode,
  saveBrokerageBalanceMode,
  type BrokerageBalanceMode,
} from './lib/brokerageBalanceMode'
import {
  computeResults,
  DEFAULT_INCOME_PRESETS,
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
import type { ConfigDrawerTab } from './components/ConfigDrawerBody'
import { isDrawerNavAvailable, isSnapshotNavAvailable, type NavPanelContext } from './lib/appNavDrawers'

/** No personal balances until the user enters or imports them (see HTML prototype — examples only). */
const defaultInputs: CalculatorInputs = {
  base401k: 0,
  baseSE401k: 0,
  baseTradIRA: 0,
  baseRoth: 0,
  baseHsa: 0,
  brkBal: 0,
  retRate: 0.07,
  brkRate: 0.07,
  save: 18_000,
  wdRate: 0.04,
  wdInflation: 0.025,
  incYield: 0.06,
  incGrowth: 0.01,
  ssAge: 67,
  spouseClaimAge: 67,
  ssBenefit62: 0,
  ssBenefit67: 0,
  ssBenefit70: 0,
  married: false,
  spouseDateOfBirth: '',
  spouseHasOwnEarnings: true,
  spouseBenefit62: 0,
  spouseBenefit67: 0,
  spouseBenefit70: 0,
  other: 0,
  italyCost: 0,
  ssInvestPct: 5,
  dateOfBirth: '',
  targetRetirementAge: 62,
  monthlyIncomeGoal: 0,
  incomePresets: [...DEFAULT_INCOME_PRESETS],
  positionReturnModels: [],
}

const defaultUi: CalculatorUi = {
  incomeMode: true,
  ssIncluded: false,
}

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
    phase: 'income',
    activePreset: 'p1',
  }
}

function initialAppState(): InitialAppState {
  return freshAppState()
}

let cachedInitialAppState: InitialAppState | undefined

function getInitialAppState(): InitialAppState {
  cachedInitialAppState ??= initialAppState()
  return cachedInitialAppState
}

type AppProps = {
  initialAuthModal?: AuthModalMode | null
}

export default function App({ initialAuthModal = null }: AppProps) {
  const [inputs, setInputsState] = useState<CalculatorInputs>(() => getInitialAppState().inputs)
  const [ui, setUiState] = useState<CalculatorUi>(() => getInitialAppState().ui)
  const [phase, setPhase] = useState<'growth' | 'income'>(() => getInitialAppState().phase)
  const [accordionOpen, setAccordionOpen] = useState(false)
  const [drawer, setDrawer] = useState<DrawerName | null>(null)
  const [configTab, setConfigTab] = useState<ConfigDrawerTab>('plan')
  const [activePreset, setActivePreset] = useState<string | null>(() => getInitialAppState().activePreset)
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

  const { loading: authLoading, resolveGoogleCheckoutFromUrl, clearGoogleCheckoutUi, user, completeOnboarding } =
    useAuth()

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

  const applySnapshot = useCallback((snap: AppSnapshotV1) => {
    const hydrated = hydrateAppSnapshot(snap, defaultInputs)
    if (!hydrated) return
    setInputsState(applyFidelityBalanceOverrides(hydrated.inputs))
    setUiState({ ...defaultUi, ...hydrated.ui })
    setPhase(hydrated.phase)
    setActivePreset(hydrated.activePreset)
    saveStoredAppState(hydrated)
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      const empty = freshAppState()
      setInputsState(empty.inputs)
      setUiState(empty.ui)
      setPhase(empty.phase)
      setActivePreset(empty.activePreset)
      return
    }
    const stored = loadStoredAppState()
    if (stored) {
      const hydrated = hydrateAppSnapshot(stored, defaultInputs)
      if (hydrated) {
        setInputsState(applyFidelityBalanceOverrides(hydrated.inputs))
        setUiState({ ...defaultUi, ...hydrated.ui })
        setPhase(hydrated.phase)
        setActivePreset(hydrated.activePreset)
      }
    }
  }, [authLoading, user?.id])

  useEffect(() => {
    if (authLoading || !user) return
    const id = window.setTimeout(() => {
      saveStoredAppState(buildSnapshot(inputs, ui, phase, activePreset))
    }, 400)
    return () => window.clearTimeout(id)
  }, [authLoading, user, inputs, ui, phase, activePreset])

  const getSnapshot = useCallback(
    () => buildSnapshot(inputs, ui, phase, activePreset),
    [inputs, ui, phase, activePreset],
  )

  const onFidelityApplyBalances = useCallback(
    (b: Pick<CalculatorInputs, 'base401k' | 'baseSE401k' | 'baseRoth' | 'baseHsa' | 'brkBal'>) => {
      setPhase('income')
      setInputsState((prev) => ({
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
      }))
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

  const showOnboarding = Boolean(user && !user.onboardingDone && !authLoading)

  const ssTimingConfigured = isSsConfigured(inputs)
  const navContext: NavPanelContext = useMemo(
    () => ({
      hasPortfolioBalances: c.hasPortfolioBalances,
      ssConfigured: ssTimingConfigured,
    }),
    [c.hasPortfolioBalances, ssTimingConfigured],
  )
  const hasIncomeGoal = inputs.monthlyIncomeGoal > 0
  const [portfolioControlsRevealed, setPortfolioControlsRevealed] = useState(false)
  const [portfolioAccountsRevealed, setPortfolioAccountsRevealed] = useState(false)

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

  const hadPortfolioBalancesRef = useRef(c.hasPortfolioBalances)

  /** First time balances appear (manual or import), default subheader to Income gross monthly. */
  useEffect(() => {
    const had = hadPortfolioBalancesRef.current
    hadPortfolioBalancesRef.current = c.hasPortfolioBalances
    if (c.hasPortfolioBalances && !had) {
      setPhase('income')
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
      {showOnboarding && user ? (
        <OnboardingOverlay
          key={user.id}
          inputs={inputs}
          setInputs={setInputs}
          completeOnboarding={completeOnboarding}
        />
      ) : null}
      <div
        className={`app-header-shell${hasIncomeGoal ? ' app-header-shell--has-goal' : ''}${phase === 'income' && ssTimingConfigured ? ' app-header-shell--ss-claim' : ''}`}
      >
        <div className="app-header-stack">
        <Header
          variant="app"
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
            setConfigTab('plan')
            setDrawer('config')
          }}
          onSignIn={openAuthSignIn}
          onCreateAccount={openAuthRegister}
        />
        <GoalProgressBar
          monthlyIncomeGoal={inputs.monthlyIncomeGoal}
          afterTaxMon={c.afterTaxMon}
          goalProgressPct={c.goalProgressPct}
          hasPortfolioBalances={c.hasPortfolioBalances}
        />
        <SubHeader
          phase={phase}
          onPhase={setPhase}
          grossMon={c.grossMon}
          totalFV={c.totalFV}
          targetRetirementAge={inputs.targetRetirementAge}
          annualSave={inputs.save}
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
          setConfigTab('plan')
          setDrawer('config')
        }}
        onOpenSignIn={openAuthSignIn}
        onOpenRegister={openAuthRegister}
        navContext={navContext}
      />
      <div className="app-scroll-stack">
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
                setPhase('income')
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
              getSnapshot={getSnapshot}
              onLoadSnapshot={applySnapshot}
            />
          </div>

          {phase === 'income' && c.hasPortfolioBalances ? (
            <div
              id="phase-income"
              className={
                portfolioControlsRevealed
                  ? 'portfolio-controls-reveal portfolio-controls-reveal--in'
                  : 'portfolio-controls-reveal portfolio-controls-reveal--pending'
              }
            >
              <IncomeInputs c={c} ui={ui} setUi={setUi} inputs={inputs} setInputs={setInputs} />
            </div>
          ) : null}
        </div>

        <hr className="divider" />
      </div>
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
    </>
  )
}
