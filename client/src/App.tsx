import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthBar } from './components/AuthBar'
import { AccountBalances } from './components/AccountBalances'
import { DrawerPanel } from './components/DrawerPanel'
import { SnapshotPanel } from './components/SnapshotPanel'
import { IncomeInputs } from './components/IncomeInputs'
import { PhaseToggle } from './components/PhaseToggle'
import { AppTopChrome } from './components/AppTopChrome'
import { AppLeftNav } from './components/AppLeftNav'
import { StripHeader } from './components/StripHeader'
import { GoalProgressBar } from './components/GoalProgressBar'
import { SubHeader } from './components/SubHeader'
import './components/AppHeaderStack.scss'
import { BAL_HSA, BAL_ROTH_IRA, BAL_TRAD_401K, BAL_TRAD_SE401K } from 'shared'
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
import { isSsConfigured, normalizeClaimAge, type SsClaimAge } from './lib/socialSecurity'
import type { ConfigDrawerTab } from './components/ConfigDrawerBody'

const PROFILE_DISPLAY_NAME = 'Bryan Chalker'

const defaultInputs: CalculatorInputs = {
  base401k: BAL_TRAD_401K,
  baseSE401k: BAL_TRAD_SE401K,
  baseRoth: BAL_ROTH_IRA,
  baseHsa: BAL_HSA,
  brkBal: 180_000,
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
  dateOfBirth: '1971-01-01',
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

function initialAppState(): InitialAppState {
  const stored = loadStoredAppState()
  if (stored) {
    const hydrated = hydrateAppSnapshot(stored, defaultInputs)
    if (hydrated) {
      return {
        inputs: applyFidelityBalanceOverrides(hydrated.inputs),
        ui: { ...defaultUi, ...hydrated.ui },
        phase: hydrated.phase,
        activePreset: hydrated.activePreset,
      }
    }
  }
  return {
    inputs: applyFidelityBalanceOverrides({ ...defaultInputs }),
    ui: defaultUi,
    phase: 'income',
    activePreset: 'p1',
  }
}

let cachedInitialAppState: InitialAppState | undefined

function getInitialAppState(): InitialAppState {
  cachedInitialAppState ??= initialAppState()
  return cachedInitialAppState
}

export default function App() {
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
    const id = window.setTimeout(() => {
      saveStoredAppState(buildSnapshot(inputs, ui, phase, activePreset))
    }, 400)
    return () => window.clearTimeout(id)
  }, [inputs, ui, phase, activePreset])

  const getSnapshot = useCallback(
    () => buildSnapshot(inputs, ui, phase, activePreset),
    [inputs, ui, phase, activePreset],
  )

  const onFidelityApplyBalances = useCallback(
    (b: Pick<CalculatorInputs, 'base401k' | 'baseSE401k' | 'baseRoth' | 'baseHsa' | 'brkBal'>) => {
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

  const c = useMemo(() => computeResults(inputs, ui), [inputs, ui])

  const ssTimingConfigured = isSsConfigured(inputs)
  const hasIncomeGoal = inputs.monthlyIncomeGoal > 0

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
        className={`app-header-shell${hasIncomeGoal ? ' app-header-shell--has-goal' : ''}${phase === 'income' && ssTimingConfigured ? ' app-header-shell--ss-claim' : ''}`}
      >
        <div className="app-header-stack">
        <AppTopChrome
          currentAge={c.currentAge}
          targetRetirementAge={inputs.targetRetirementAge}
          profileDisplayName={PROFILE_DISPLAY_NAME}
          drawer={drawer}
          snapshotOpen={accordionOpen}
          mobileNavOpen={mobileNavOpen}
          onMobileNavToggle={() => setMobileNavOpen((o) => !o)}
          onOpenDrawer={(name) => {
            setAccordionOpen(false)
            setDrawer(name)
          }}
          onSnapshotToggle={() => {
            setAccordionOpen((a) => {
              const next = !a
              if (next) setDrawer(null)
              return next
            })
          }}
          onOpenConfig={() => {
            setMobileNavOpen(false)
            setAccordionOpen(false)
            setConfigTab('plan')
            setDrawer('config')
          }}
        />
        <GoalProgressBar
          monthlyIncomeGoal={inputs.monthlyIncomeGoal}
          afterTaxMon={c.afterTaxMon}
          goalProgressPct={c.goalProgressPct}
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
        currentAge={c.currentAge}
        targetRetirementAge={inputs.targetRetirementAge}
        profileDisplayName={PROFILE_DISPLAY_NAME}
        drawer={drawer}
        snapshotOpen={accordionOpen}
        mobileOpen={mobileNavOpen}
        onMobileOpenChange={setMobileNavOpen}
        onOpenDrawer={(name) => {
          setAccordionOpen(false)
          setDrawer(name)
        }}
        onSnapshotToggle={() => {
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
      />
      <div className="app-scroll-stack">
      <StripHeader
        phase={phase}
        c={c}
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
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
              alignItems: 'flex-start',
              gap: '1rem',
              marginBottom: '1rem',
            }}
          >
            <div className="typo-nav-cluster" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, maxWidth: 560 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 }}>
                <AuthBar />
              </div>
            </div>
          </div>

          <div
            className="rab-brokerage-stack"
            style={{
              border: '1px solid var(--border-strong)',
              borderRadius: 12,
              padding: '12px 16px 4px',
              marginBottom: '1.75rem',
              background: 'var(--surface)',
            }}
          >
            <AccountBalances
              readOnly
              c={c}
              inputs={inputs}
              setInputs={setInputs}
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

          <PhaseToggle
            phase={phase}
            onPhase={setPhase}
            currentAge={c.currentAge}
            targetRetirementAge={inputs.targetRetirementAge}
          />

          {phase === 'income' ? (
            <div id="phase-income">
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
    </>
  )
}
