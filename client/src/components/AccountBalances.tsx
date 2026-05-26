import type { AnimationEvent, ChangeEvent, CSSProperties, ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { IconArrowNarrowDownDashed } from '@tabler/icons-react'
import { Button, useOverlayState } from '@heroui/react'
import type { CalculatorInputs, ComputedSnapshot } from '../lib/computeResults'
import {
  aggregateFidelityPositionsBySymbol,
  isFidelityPendingActivityRow,
  mapRowToBucket,
  positionsForBrokerage,
  positionsForTaxTreatment,
  type FidelityPositionRow,
} from '../lib/fidelityCsv'
import { flattenBatches, loadStoredFidelityImport } from '../lib/fidelityStorage'
import {
  getAccountTypeMeta,
  loadStoredManualAccounts,
  type ManualAccountEntry,
} from '../lib/manualAccountEntries'
import type { BrokerageBalanceMode } from '../lib/brokerageBalanceMode'
import type { BalanceInputMode } from '../lib/retirementBalanceMode'
import { accountLabelForWithdrawalBucket, localeSupportsWithdrawalBucket } from '../config/taxConfig'
import { useUserLocale } from '../context/UserLocaleContext'
import {
  withdrawalBadgeAndHint,
  withdrawalBucketOrder,
  type WithdrawalDisplayBucket,
} from '../lib/withdrawalDisplayOrder'
import {
  withdrawalExplainerBody,
  withdrawalExplainerDisclaimer,
} from '../lib/withdrawalStrategyContent'
import type { PositionsCsvCustodian } from '../lib/positionsCsvImport'
import { inputsHavePlanningProfileFields, planningDisplayFromInputs } from '../lib/userPrefs'
import {
  hasImportedPortfolioData,
  hasManualPortfolioAmounts,
  IMPORT_REMOVED_ON_MANUAL_MSG,
  MANUAL_REMOVED_ON_CONNECT_MSG,
} from '../lib/portfolioSourceExclusivity'
import { fmt, fmtInput, parseNum } from '../utils/format'
import { currencySymbol } from '../lib/displayCurrency'
import { computeMergedDashboardPositionModels, blendedRateForDashboardPositionId } from '../lib/mergedDashboardPositionModels'
import { ManualBalancesPlanStep, type ManualPlanDraft } from './ManualBalancesPlanStep'
import {
  MANUAL_PLAN_POST_FADE_PAUSE_MS,
  markPortfolioBalancesFlush,
  PORTFOLIO_REVEAL_START_DELAY_MS,
  schedulePortfolioWaveReveal,
} from '../lib/portfolioWaveReveal'
import { positionUsesCustomReturnMode } from '../lib/positionReturnModel'
import { computeBucketTrendDisplay } from '../lib/bucketHoldingTrend'
import { useHoldingQuotes } from '../lib/holdingQuotes'
import { FidelityAggregatedSymbolTable, type FidelityAggregatedScenarioBundle } from './FidelityAggregatedSymbolTable'
import { FidelityBucketAccountRow } from './FidelityBucketAccountRow'
import { FidelityCsvImport } from './FidelityCsvImport'
import { FidelityHoldingScenarioPanel } from './FidelityHoldingScenarioPopout'
import { AccountBalancesManageMenu } from './AccountBalancesManageMenu'
import { aggregatedHoldingsForScenarioGuide } from '../lib/holdingScenarioGuideExamples'
import { ImportedHoldingsScenarioGuide } from './ImportedHoldingsScenarioGuide'
import { ManualProjectionsCallout } from './ManualProjectionsCallout'
import { PlaidConnectionProvider } from './PlaidConnectionHeader'
import { AppButton } from './ui/AppButton'
import { useUserTier } from '../hooks/useUserTier'
import './AccountBalancesTaxDisclosure.scss'
import './AccountBalancesCustomScenario.scss'

type BucketKey = 'ret401k' | 'se401k' | 'tradIra' | 'roth' | 'hsa' | 'brokerage'

type ManualBalanceTaxTone = 'trad' | 'roth' | 'hsa' | 'taxable'

type ManualBalanceRow = {
  key: BucketKey
  label: string
  taxKind: string
  taxDesc: string
  tone: ManualBalanceTaxTone
}

function ManualBalanceRowLabel({ label, taxKind, taxDesc, tone }: Pick<ManualBalanceRow, 'label' | 'taxKind' | 'taxDesc' | 'tone'>) {
  return (
    <div className="edit-row-label-stack">
      <span className="edit-row-label__name">{label}</span>
      <p className={`edit-row-label__tax edit-row-label__tax--${tone}`}>
        <span className="edit-row-label__tax-kind">{taxKind}</span>
        <span className="edit-row-label__tax-desc">{taxDesc}</span>
      </p>
    </div>
  )
}

/** Pre-tax display total — must match `retBal` (includes Traditional IRA). */
function retirementPretaxDisplayTotal(bal: ComputedSnapshot['bal']): number {
  return bal.bal401k + bal.balSE401k + bal.balTradIRA
}

type ManualBalancesDraft = {
  base401k: number
  baseSE401k: number
  baseTradIRA: number
  baseRoth: number
  baseHsa: number
  brkBal: number
}

type Props = {
  c: ComputedSnapshot
  /** Omit or no-op when `readOnly` — dashboard output only. */
  onBases?: (
    b: Partial<{
      base401k: number
      baseSE401k: number
      baseTradIRA: number
      baseRoth: number
      baseHsa: number
      brkBal: number
    }>,
  ) => void
  balanceMode: BalanceInputMode
  onBalanceModeChange?: (m: BalanceInputMode) => void
  fidelityImportRev: number
  /** Bumps when onboarding/manual account rows change. */
  manualAccountsRev?: number
  /** Tighter bottom margin when Brokerage card follows in the same visual group. */
  stackWithBrokerage?: boolean
  onFidelityApplyBalances?: (partial: Pick<CalculatorInputs, 'base401k' | 'baseSE401k' | 'baseRoth' | 'baseHsa' | 'brkBal'>) => void
  onFidelityImportApplied?: () => void
  /** Clear CSV/Plaid import storage when user commits manual amounts. */
  onClearImportedForManual?: () => void
  /** Clear manual balances, stored import, and per-holding return overrides for this card. */
  onRemoveRetirementAccounts?: () => void
  /** When true, show balances and Fidelity breakdown only (no mode toggle, CSV import, or manual fields). */
  readOnly?: boolean
  /** Dashboard: pass through for per-holding return sliders when `readOnly` + Fidelity mode. */
  inputs?: CalculatorInputs
  setInputs?: (p: Partial<CalculatorInputs>) => void
  /** After manual confirm + plan step: DOB, retirement age, annual savings. */
  onManualPortfolioPlanApplied?: (plan: ManualPlanDraft) => void
  /** When set, the matching bucket opens the return editor popover for this id (strip GrowthSliderLabel). */
  openReturnEditorRequest?: { positionId: string; anchorTop: number; nonce: number } | null
  onReturnEditorOpenHandled?: () => void
  /**
   * Configure drawer: show mode toggle + CSV import; in manual mode keep dollar inputs. In Fidelity mode hide per-account totals /
   * holdings (dashboard only). Hides the total retirement summary bar here.
   */
  configureInputsOnly?: boolean
  /** Dashboard: show taxable brokerage inside the same card as retirement buckets (with matching disclosure layout). */
  mergeBrokerageInRetirementCard?: boolean
  brkBal?: number
  brkRate?: number
  brokerageMode?: BrokerageBalanceMode
  onOpenSignIn?: () => void
  onOpenUpgradeCsv?: () => void
  /** Increment to open the CSV import panel once (e.g. after welcome connect). */
  openImportRequest?: number
  onImportOpenHandled?: () => void
}

function WithdrawalLabeledBlock({
  badgeOrder,
  hint,
  children,
}: {
  badgeOrder: number | null
  hint: string | null
  children: ReactNode
}) {
  return (
    <div className="withdrawal-bucket-summary">
      {badgeOrder != null ? <span className="withdrawal-order-badge">{badgeOrder}</span> : null}
      <div className="withdrawal-bucket-summary__body">
        <div className="withdrawal-bucket-summary__title-row">{children}</div>
        {hint ? <div className="withdrawal-order-hint">{hint}</div> : null}
      </div>
    </div>
  )
}

const REMOVE_ACCOUNTS_CONFIRM_BODY =
  'Remove all account balances from this card? Manual totals, imported positions, and custom return overrides for these accounts will be cleared.'


export function AccountBalances({
  c,
  onBases,
  balanceMode,
  onBalanceModeChange,
  fidelityImportRev,
  manualAccountsRev = 0,
  stackWithBrokerage,
  onFidelityApplyBalances,
  onFidelityImportApplied,
  onClearImportedForManual,
  onRemoveRetirementAccounts,
  readOnly = false,
  inputs,
  setInputs,
  onManualPortfolioPlanApplied,
  openReturnEditorRequest: _openReturnEditorRequest,
  onReturnEditorOpenHandled: _onReturnEditorOpenHandled,
  configureInputsOnly = false,
  mergeBrokerageInRetirementCard = false,
  brkBal,
  brkRate,
  brokerageMode,
  onOpenSignIn,
  onOpenUpgradeCsv,
  openImportRequest,
  onImportOpenHandled,
}: Props) {
  const { isPro, hasSessionCsvHoldings } = useUserTier()
  const showCsvSessionBanner = hasSessionCsvHoldings && !isPro
  const { locale, taxConfig } = useUserLocale()
  const mergedDashboard = mergeBrokerageInRetirementCard && readOnly
  const fidelityScenarioEditingEnabled = Boolean(readOnly && inputs && setInputs && balanceMode === 'fidelity')
  const [withdrawalExplainerOpen, setWithdrawalExplainerOpen] = useState(false)
  const retirementAge = inputs?.targetRetirementAge ?? c.targetRetirementAge

  const fidelityRows = useMemo(() => {
    void fidelityImportRev
    const imp = loadStoredFidelityImport()
    if (!imp?.batches?.length) return [] as FidelityPositionRow[]
    return flattenBatches(imp.batches)
  }, [fidelityImportRev])

  const manualAccountEntries = useMemo(() => {
    void manualAccountsRev
    const stored = loadStoredManualAccounts()
    if (!stored?.onboardingCompleted) return [] as ManualAccountEntry[]
    return stored.entries.filter((e) => e.balance > 0)
  }, [manualAccountsRev])

  const brokeragePositions = useMemo(() => positionsForBrokerage(fidelityRows), [fidelityRows])
  const hasFidelityBrokerage = brokeragePositions.length > 0

  const hasAnyFidelityRetirement = useMemo(
    () =>
      fidelityRows.some((r) => {
        if (isFidelityPendingActivityRow(r)) return false
        const b = mapRowToBucket(r)
        return b !== 'unknown' && b !== 'brokerage'
      }),
    [fidelityRows],
  )

  const holdingQuoteMap = useHoldingQuotes(
    fidelityRows,
    mergedDashboard && balanceMode === 'fidelity' && (hasAnyFidelityRetirement || hasFidelityBrokerage),
  )

  const hasManualRetirementBalances =
    c.bal.bal401k > 0 ||
    c.bal.balSE401k > 0 ||
    c.bal.balTradIRA > 0 ||
    c.bal.balRoth > 0 ||
    c.bal.balHsa > 0

  const hasRetirementAccountData =
    balanceMode === 'manual' ? hasManualRetirementBalances : hasAnyFidelityRetirement

  const hasManualBrokerageBalance = (brkBal ?? 0) > 0
  const hasBrokerageAccountData =
    mergedDashboard && (hasFidelityBrokerage || hasManualBrokerageBalance)
  const useFidelityBrokerageView =
    hasFidelityBrokerage && (mergedDashboard || brokerageMode === 'fidelity')

  const hasAnyAccountCardData = hasRetirementAccountData || Boolean(hasBrokerageAccountData)

  /** Merged dashboard lists brokerage in the same card — footer matches sum of all rows. */
  const portfolioTotal =
    mergedDashboard && hasBrokerageAccountData ? c.retBal + (brkBal ?? 0) : c.retBal
  const portfolioTotalLabel =
    mergedDashboard && hasBrokerageAccountData ? 'Total balances' : 'Total retirement'

  const mergedPositionModels = useMemo(() => {
    if (!mergedDashboard || !inputs) return []
    return computeMergedDashboardPositionModels(inputs, fidelityRows, c.yearsToRetirement, c.retirementCalendarYear)
  }, [mergedDashboard, inputs, fidelityRows, c.yearsToRetirement, c.retirementCalendarYear])

  const hasCustomScenarioBadge = useMemo(() => {
    if (!inputs || mergedPositionModels.length === 0) return false
    return mergedPositionModels.some((m) =>
      positionUsesCustomReturnMode(m, blendedRateForDashboardPositionId(m.id, inputs.retRate, inputs.brkRate)),
    )
  }, [mergedPositionModels, inputs])

  const aggregatedHoldingsForGuide = useMemo(
    () => aggregatedHoldingsForScenarioGuide(fidelityRows),
    [fidelityRows],
  )

  const showImportedHoldingsScenarioGuide =
    mergedDashboard &&
    fidelityScenarioEditingEnabled &&
    balanceMode === 'fidelity' &&
    aggregatedHoldingsForGuide.length > 0

  const [fidelityScenarioPanel, setFidelityScenarioPanel] = useState<{
    symbol: string
    contributingRows: FidelityPositionRow[]
  } | null>(null)
  const [fidelityScenarioClosing, setFidelityScenarioClosing] = useState(false)
  const [balanceEditPanel, setBalanceEditPanel] = useState<'manual' | 'import' | null>(null)
  const [balanceEditClosing, setBalanceEditClosing] = useState(false)
  const [csvImportPrefillCustodian, setCsvImportPrefillCustodian] = useState<PositionsCsvCustodian | null>(null)
  const [openManageRequest, setOpenManageRequest] = useState(0)
  const [csvFileIngestRequest, setCsvFileIngestRequest] = useState<{
    id: number
    file: File
    custodian: PositionsCsvCustodian
  } | null>(null)
  const financialsCsvPendingCustodianRef = useRef<PositionsCsvCustodian | null>(null)
  const financialsCsvFileInputRef = useRef<HTMLInputElement>(null)
  const [manualDraft, setManualDraft] = useState<ManualBalancesDraft | null>(null)
  type ManualConfirmPhase = false | 'progress' | 'plan'
  const [manualConfirmPhase, setManualConfirmPhase] = useState<ManualConfirmPhase>(false)
  const [manualConfirmProgress, setManualConfirmProgress] = useState(0)
  const manualConfirmPendingRef = useRef(false)
  const manualConfirmRunRef = useRef(false)
  const pendingManualCommitRef = useRef<{
    balances: ManualBalancesDraft
    plan: ManualPlanDraft
  } | null>(null)
  const manualConfirmBusy = manualConfirmPhase === 'progress'

  const canEditBalances = Boolean(
    mergedDashboard && onBases && onBalanceModeChange && onFidelityApplyBalances,
  )

  const removeAccountsModalState = useOverlayState()
  const [replaceSourceConfirm, setReplaceSourceConfirm] = useState<{
    message: string
    proceed: () => void
  } | null>(null)

  const portfolioModes = useMemo(
    () => ({ retirement: balanceMode, brokerage: brokerageMode ?? 'fidelity' }),
    [balanceMode, brokerageMode],
  )

  const willRemoveManualOnConnect = useMemo(() => {
    if (!inputs) return false
    return hasManualPortfolioAmounts(inputs, portfolioModes)
  }, [inputs, portfolioModes])

  const willRemoveImportOnManual = useMemo(() => hasImportedPortfolioData(), [])

  const guardReplaceManual = useCallback(
    (proceed: () => void) => {
      if (!willRemoveManualOnConnect) {
        proceed()
        return
      }
      setReplaceSourceConfirm({ message: MANUAL_REMOVED_ON_CONNECT_MSG, proceed })
    },
    [willRemoveManualOnConnect],
  )

  const guardReplaceImport = useCallback(
    (proceed: () => void) => {
      if (!willRemoveImportOnManual) {
        proceed()
        return
      }
      setReplaceSourceConfirm({ message: IMPORT_REMOVED_ON_MANUAL_MSG, proceed })
    },
    [willRemoveImportOnManual],
  )

  const confirmRemoveAccounts = useCallback(() => {
    removeAccountsModalState.close()
    setFidelityScenarioPanel(null)
    setFidelityScenarioClosing(false)
    setBalanceEditPanel(null)
    setBalanceEditClosing(false)
    onRemoveRetirementAccounts?.()
  }, [removeAccountsModalState, onRemoveRetirementAccounts])

  const finalizeFidelityScenarioClose = useCallback(() => {
    setFidelityScenarioPanel(null)
    setFidelityScenarioClosing(false)
  }, [])

  const requestFidelityScenarioClose = useCallback(() => {
    if (!fidelityScenarioPanel || fidelityScenarioClosing) return
    setFidelityScenarioClosing(true)
  }, [fidelityScenarioPanel, fidelityScenarioClosing])

  const onFidelityScenarioSheetAnimationEnd = useCallback(
    (e: AnimationEvent<HTMLElement>) => {
      if (e.target !== e.currentTarget) return
      if (e.animationName !== 'fidelity-scenario-slide-sheet-out') return
      if (!fidelityScenarioClosing) return
      finalizeFidelityScenarioClose()
    },
    [fidelityScenarioClosing, finalizeFidelityScenarioClose],
  )

  const onFidelityScenarioOpen = useCallback((payload: { symbol: string; contributingRows: FidelityPositionRow[] }) => {
    setBalanceEditPanel(null)
    setBalanceEditClosing(false)
    setFidelityScenarioClosing(false)
    setFidelityScenarioPanel(payload)
  }, [])

  const finalizeBalanceEditClose = useCallback(() => {
    setBalanceEditPanel(null)
    setBalanceEditClosing(false)
    setManualDraft(null)
    setManualConfirmPhase(false)
    setManualConfirmProgress(0)
    manualConfirmPendingRef.current = false
    manualConfirmRunRef.current = false
    pendingManualCommitRef.current = null
  }, [])

  const commitPendingManualPortfolio = useCallback(() => {
    const pending = pendingManualCommitRef.current
    if (!pending || !onBases) return
    onClearImportedForManual?.()
    onManualPortfolioPlanApplied?.(pending.plan)
    onBases(pending.balances)
    onBalanceModeChange?.('manual')
    pendingManualCommitRef.current = null
  }, [onBases, onBalanceModeChange, onClearImportedForManual, onManualPortfolioPlanApplied])

  const requestBalanceEditClose = useCallback(() => {
    if (balanceEditPanel === 'manual' && manualConfirmPhase === 'plan') {
      setManualConfirmPhase(false)
      return
    }
    if (!balanceEditPanel || balanceEditClosing || manualConfirmBusy) return
    const prefersReducedMotion =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion && (balanceEditPanel === 'import' || balanceEditPanel === 'manual')) {
      if (balanceEditPanel === 'manual' && manualConfirmPendingRef.current) {
        commitPendingManualPortfolio()
        markPortfolioBalancesFlush({ afterManualPlanModal: true })
        manualConfirmPendingRef.current = false
        schedulePortfolioWaveReveal(MANUAL_PLAN_POST_FADE_PAUSE_MS)
      }
      finalizeBalanceEditClose()
      return
    }
    setBalanceEditClosing(true)
  }, [
    balanceEditPanel,
    balanceEditClosing,
    manualConfirmBusy,
    manualConfirmPhase,
    commitPendingManualPortfolio,
    finalizeBalanceEditClose,
  ])

  const onBalanceEditSheetAnimationEnd = useCallback(
    (e: AnimationEvent<HTMLElement>) => {
      if (e.target !== e.currentTarget) return
      if (e.animationName === 'account-balances-manual-sheet-out') {
        if (!balanceEditClosing) return
        if (manualConfirmPendingRef.current) {
          commitPendingManualPortfolio()
          markPortfolioBalancesFlush({ afterManualPlanModal: true })
          manualConfirmPendingRef.current = false
          finalizeBalanceEditClose()
          schedulePortfolioWaveReveal(MANUAL_PLAN_POST_FADE_PAUSE_MS + PORTFOLIO_REVEAL_START_DELAY_MS)
          return
        }
        finalizeBalanceEditClose()
        return
      }
      if (
        e.animationName !== 'fidelity-scenario-slide-sheet-out' &&
        e.animationName !== 'account-balances-import-sheet-out'
      ) {
        return
      }
      if (!balanceEditClosing) return
      finalizeBalanceEditClose()
    },
    [balanceEditClosing, commitPendingManualPortfolio, finalizeBalanceEditClose],
  )

  const openBalanceEditPanel = useCallback(
    (panel: 'manual' | 'import') => {
      setFidelityScenarioPanel(null)
      setFidelityScenarioClosing(false)
      setBalanceEditClosing(false)
      setManualConfirmPhase(false)
      setManualConfirmProgress(0)
      manualConfirmPendingRef.current = false
      manualConfirmRunRef.current = false
      pendingManualCommitRef.current = null
      if (panel === 'manual') {
        setManualDraft({
          base401k: inputs?.base401k ?? c.bal.bal401k,
          baseSE401k: inputs?.baseSE401k ?? c.bal.balSE401k,
          baseTradIRA: inputs?.baseTradIRA ?? c.bal.balTradIRA,
          baseRoth: inputs?.baseRoth ?? c.bal.balRoth,
          baseHsa: inputs?.baseHsa ?? c.bal.balHsa,
          brkBal: inputs?.brkBal ?? brkBal ?? 0,
        })
      } else {
        setManualDraft(null)
      }
      setBalanceEditPanel(panel)
      if (panel === 'import') {
        onBalanceModeChange?.('fidelity')
      }
    },
    [brkBal, c.bal.bal401k, c.bal.balHsa, c.bal.balRoth, c.bal.balSE401k, c.bal.balTradIRA, inputs, onBalanceModeChange],
  )

  const lastOpenImportRequestRef = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (!openImportRequest || !mergedDashboard || !onFidelityApplyBalances) return
    if (lastOpenImportRequestRef.current === openImportRequest) return
    lastOpenImportRequestRef.current = openImportRequest
    setOpenManageRequest((n) => n + 1)
    onImportOpenHandled?.()
  }, [openImportRequest, mergedDashboard, onFidelityApplyBalances, onImportOpenHandled])

  const runManualConfirmSequence = useCallback(async () => {
    if (!manualDraft || manualConfirmRunRef.current) return
    manualConfirmRunRef.current = true
    setManualConfirmPhase('progress')
    setManualConfirmProgress(10)

    await new Promise((r) => window.setTimeout(r, 140))
    setManualConfirmProgress(42)

    await new Promise((r) => window.setTimeout(r, 220))
    setManualConfirmProgress(78)

    await new Promise((r) => window.setTimeout(r, 200))
    setManualConfirmProgress(100)

    await new Promise((r) => window.setTimeout(r, 280))
    setManualConfirmPhase('plan')
    manualConfirmRunRef.current = false
  }, [manualDraft])

  const completeManualPlanStep = useCallback(
    (plan: ManualPlanDraft) => {
      if (!manualDraft || balanceEditClosing) return
      pendingManualCommitRef.current = { balances: manualDraft, plan }
      manualConfirmPendingRef.current = true
      const prefersReducedMotion =
        typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (prefersReducedMotion) {
        commitPendingManualPortfolio()
        markPortfolioBalancesFlush({ afterManualPlanModal: true })
        manualConfirmPendingRef.current = false
        finalizeBalanceEditClose()
        schedulePortfolioWaveReveal(MANUAL_PLAN_POST_FADE_PAUSE_MS)
        return
      }
      setBalanceEditClosing(true)
    },
    [
      manualDraft,
      balanceEditClosing,
      commitPendingManualPortfolio,
      finalizeBalanceEditClose,
    ],
  )

  const confirmManualBalances = useCallback(() => {
    if (!manualDraft || manualConfirmBusy || balanceEditClosing) return
    const prefersReducedMotion =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      setManualConfirmPhase('plan')
      return
    }
    void runManualConfirmSequence()
  }, [manualDraft, manualConfirmBusy, balanceEditClosing, runManualConfirmSequence])

  const toggleBalanceEditPanel = useCallback(
    (panel: 'manual' | 'import') => {
      if (balanceEditPanel === panel && !balanceEditClosing) {
        requestBalanceEditClose()
        return
      }
      openBalanceEditPanel(panel)
    },
    [balanceEditPanel, balanceEditClosing, openBalanceEditPanel, requestBalanceEditClose],
  )

  const clearCsvImportLaunchUi = useCallback(() => {
    setCsvImportPrefillCustodian(null)
    setCsvFileIngestRequest(null)
  }, [])

  const onPickCsvCustodian = useCallback((custodian: PositionsCsvCustodian) => {
    financialsCsvPendingCustodianRef.current = custodian
    financialsCsvFileInputRef.current?.click()
  }, [])

  const onCsvFileIngestConsumed = useCallback(() => {
    setCsvFileIngestRequest(null)
  }, [])

  const launchCsvImportFromFile = useCallback(
    (file: File, custodian: PositionsCsvCustodian) => {
      setCsvImportPrefillCustodian(custodian)
      setCsvFileIngestRequest({ id: Date.now(), file, custodian })
      onBalanceModeChange?.('fidelity')
      if (mergedDashboard && onFidelityApplyBalances) {
        openBalanceEditPanel('import')
      }
    },
    [mergedDashboard, onBalanceModeChange, onFidelityApplyBalances, openBalanceEditPanel],
  )

  const onFinancialsCsvFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      e.target.value = ''
      const custodian = financialsCsvPendingCustodianRef.current
      financialsCsvPendingCustodianRef.current = null
      if (!f || !custodian) return
      launchCsvImportFromFile(f, custodian)
    },
    [launchCsvImportFromFile],
  )

  useEffect(() => {
    if (!fidelityScenarioPanel && !balanceEditPanel && !removeAccountsModalState.isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (removeAccountsModalState.isOpen) removeAccountsModalState.close()
      else if (balanceEditPanel) requestBalanceEditClose()
      else if (fidelityScenarioPanel) requestFidelityScenarioClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    fidelityScenarioPanel,
    balanceEditPanel,
    removeAccountsModalState.isOpen,
    removeAccountsModalState.close,
    requestFidelityScenarioClose,
    requestBalanceEditClose,
  ])

  const fidelityScenarioBundle = useMemo((): FidelityAggregatedScenarioBundle | null => {
    if (!fidelityScenarioEditingEnabled || !inputs || !setInputs) return null
    return {
      inputs,
      setInputs,
      yearsToRetirement: c.yearsToRetirement,
      retirementCalendarYear: c.retirementCalendarYear,
      retRate: inputs.retRate,
      brkRate: inputs.brkRate,
    }
  }, [fidelityScenarioEditingEnabled, inputs, setInputs, c.yearsToRetirement, c.retirementCalendarYear])

  const showWithdrawalGuidance =
    readOnly &&
    !configureInputsOnly &&
    hasAnyAccountCardData &&
    (mergedDashboard || (balanceMode === 'fidelity' && hasAnyFidelityRetirement))

  const presentWithdrawalBuckets = useMemo((): WithdrawalDisplayBucket[] => {
    const buckets = new Set<WithdrawalDisplayBucket>()
    if (balanceMode === 'manual' && manualAccountEntries.length > 0) {
      for (const entry of manualAccountEntries) {
        if (entry.type == null || entry.balance <= 0) continue
        buckets.add(getAccountTypeMeta(entry.type, locale).withdrawalBucket)
      }
    } else {
      const pretaxTotal = retirementPretaxDisplayTotal(c.bal)
      if (pretaxTotal > 0) buckets.add('pretax')
      if (c.bal.balRoth > 0) buckets.add('roth')
      if (c.bal.balHsa > 0) buckets.add('hsa')
      if ((brkBal ?? 0) > 0 || hasFidelityBrokerage) buckets.add('brokerage')
    }
    return withdrawalBucketOrder(retirementAge, true, locale).filter(
      (b) => buckets.has(b) && localeSupportsWithdrawalBucket(locale, b),
    )
  }, [
    balanceMode,
    manualAccountEntries,
    c.bal.bal401k,
    c.bal.balSE401k,
    c.bal.balTradIRA,
    c.bal.balRoth,
    c.bal.balHsa,
    brkBal,
    hasFidelityBrokerage,
    retirementAge,
    locale,
  ])

  const showBalanceEntryActions = mergedDashboard ? canEditBalances : !readOnly && Boolean(onBalanceModeChange)

  function bucketBaseKey(key: BucketKey): keyof ManualBalancesDraft {
    switch (key) {
      case 'ret401k':
        return 'base401k'
      case 'se401k':
        return 'baseSE401k'
      case 'tradIra':
        return 'baseTradIRA'
      case 'roth':
        return 'baseRoth'
      case 'hsa':
        return 'baseHsa'
      case 'brokerage':
        return 'brkBal'
    }
  }

  function setBase(key: BucketKey, displayVal: string) {
    if (!onBases) return
    const v = parseNum(displayVal)
    onBases({ [bucketBaseKey(key)]: Math.max(0, v) } as Parameters<NonNullable<typeof onBases>>[0])
  }

  function setManualDraftBase(key: BucketKey, displayVal: string) {
    const v = Math.max(0, parseNum(displayVal))
    const baseKey = bucketBaseKey(key)
    setManualDraft((prev) => (prev ? { ...prev, [baseKey]: v } : prev))
  }

  function displayManualDraft(key: BucketKey): number {
    if (!manualDraft) return display(key)
    const baseKey = bucketBaseKey(key)
    return manualDraft[baseKey]
  }

  const manualBalanceRows: ManualBalanceRow[] = [
    {
      key: 'ret401k',
      label: 'Existing 401k',
      taxKind: 'Traditional',
      taxDesc: 'Contributed pre-tax, taxed on withdrawal',
      tone: 'trad',
    },
    {
      key: 'se401k',
      label: 'Self-Employed 401k',
      taxKind: 'Traditional',
      taxDesc: 'Contributed pre-tax, taxed on withdrawal',
      tone: 'trad',
    },
    {
      key: 'tradIra',
      label: 'Traditional IRA',
      taxKind: 'Traditional',
      taxDesc: 'Contributed pre-tax, taxed on withdrawal',
      tone: 'trad',
    },
    {
      key: 'roth',
      label: 'Roth IRA',
      taxKind: 'Tax-free growth',
      taxDesc: 'Contributed after-tax, withdrawals tax-free',
      tone: 'roth',
    },
    {
      key: 'hsa',
      label: 'HSA',
      taxKind: 'Triple tax-advantaged',
      taxDesc: 'Pre-tax in, tax-free growth, tax-free for medical',
      tone: 'hsa',
    },
    {
      key: 'brokerage',
      label: 'Brokerage',
      taxKind: 'Taxable',
      taxDesc: 'No special shelter; dividends and realized gains are taxable.',
      tone: 'taxable',
    },
  ]

  const display = (key: BucketKey) => {
    switch (key) {
      case 'ret401k':
        return c.bal.bal401k
      case 'se401k':
        return c.bal.balSE401k
      case 'tradIra':
        return c.bal.balTradIRA
      case 'roth':
        return c.bal.balRoth
      case 'hsa':
        return c.bal.balHsa
      case 'brokerage':
        return brkBal ?? 0
    }
  }

  const manualRetirementRows = manualBalanceRows.filter((r) => r.key !== 'brokerage')

  function manualRowHasBalance(row: ManualBalanceRow): boolean {
    return display(row.key) > 0
  }

  function visibleManualRetirementRows(): ManualBalanceRow[] {
    return manualRetirementRows.filter(manualRowHasBalance)
  }

  function setMode(m: BalanceInputMode) {
    onBalanceModeChange?.(m)
  }

  function renderReplaceSourceConfirmOverlay() {
    if (!replaceSourceConfirm) return null

    return (
      <div
        className="account-balances-remove-overlay"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="account-balances-replace-source-title"
        aria-describedby="account-balances-replace-source-desc"
      >
        <button
          type="button"
          className="account-balances-remove-overlay__backdrop"
          aria-label="Cancel"
          onClick={() => setReplaceSourceConfirm(null)}
        />
        <div className="account-balances-remove-overlay__panel">
          <h2 id="account-balances-replace-source-title" className="account-balances-remove-overlay__title">
            Replace current balances?
          </h2>
          <p id="account-balances-replace-source-desc" className="account-balances-remove-overlay__body">
            {replaceSourceConfirm.message}
          </p>
          <div className="account-balances-remove-overlay__footer">
            <Button
              variant="outline"
              size="sm"
              className="account-balances-remove-overlay__btn"
              onPress={() => setReplaceSourceConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="account-balances-remove-overlay__btn"
              onPress={() => {
                const proceed = replaceSourceConfirm.proceed
                setReplaceSourceConfirm(null)
                proceed()
              }}
            >
              Continue
            </Button>
          </div>
        </div>
      </div>
    )
  }

  function renderRemoveAccountsConfirmOverlay() {
    if (!onRemoveRetirementAccounts || !removeAccountsModalState.isOpen) return null

    return (
      <div
        className="account-balances-remove-overlay"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="account-balances-remove-title"
        aria-describedby="account-balances-remove-desc"
      >
        <button
          type="button"
          className="account-balances-remove-overlay__backdrop"
          aria-label="Dismiss"
          onClick={() => removeAccountsModalState.close()}
        />
        <div className="account-balances-remove-overlay__panel">
          <h2 id="account-balances-remove-title" className="account-balances-remove-overlay__title">
            Remove all accounts?
          </h2>
          <p id="account-balances-remove-desc" className="account-balances-remove-overlay__body">
            {REMOVE_ACCOUNTS_CONFIRM_BODY}
          </p>
          <div className="account-balances-remove-overlay__footer">
            <Button variant="outline" size="sm" className="account-balances-remove-overlay__btn" onPress={() => removeAccountsModalState.close()}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="account-balances-remove-modal-confirm account-balances-remove-overlay__btn"
              onPress={confirmRemoveAccounts}
            >
              Remove
            </Button>
          </div>
        </div>
      </div>
    )
  }


  function renderAccountBalancesManageMenu() {
    if (!showBalanceEntryActions) return null
    return (
      <>
        <input
          ref={financialsCsvFileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={onFinancialsCsvFileChange}
        />
        <AccountBalancesManageMenu
          canClearAccounts={Boolean(hasAnyAccountCardData && onRemoveRetirementAccounts)}
          manualReplaceNotice={null}
          onRequestReplaceManual={guardReplaceManual}
          onRequestReplaceImport={guardReplaceImport}
          onManualAdd={() =>
            mergedDashboard ? toggleBalanceEditPanel('manual') : setMode('manual')
          }
          onPickCsvCustodian={onPickCsvCustodian}
          onClearAccounts={() => removeAccountsModalState.open()}
          openRequest={openManageRequest}
          onImportApplied={() => {
            onBalanceModeChange?.('fidelity')
            onFidelityImportApplied?.()
            if (balanceEditPanel === 'import') requestBalanceEditClose()
          }}
        />
      </>
    )
  }

  function renderWithdrawalGuidanceBlock() {
    if (!showWithdrawalGuidance) return null
    return (
      <>
        <div className="withdrawal-order-context">
          <div className="withdrawal-order-context__stack">
            <div className="withdrawal-order-context__header-row">
              <div className="withdrawal-order-context__title-why-row">
                <span className="withdrawal-order-context__text">Recommended withdrawal order for age {retirementAge}</span>
                <button
                  type="button"
                  className="withdrawal-why-pill"
                  aria-expanded={withdrawalExplainerOpen}
                  aria-controls="withdrawal-order-explainer"
                  title="Why this order?"
                  onClick={() => setWithdrawalExplainerOpen((o) => !o)}
                >
                  Why?
                </button>
              </div>
            </div>
            <div className="withdrawal-order-context__arrow-row" aria-hidden>
              <span className="withdrawal-order-context__arrow-slot">
                <IconArrowNarrowDownDashed size={18} stroke={1.5} className="withdrawal-order-context__arrow" />
              </span>
            </div>
          </div>
        </div>
        {withdrawalExplainerOpen ? (
          <div id="withdrawal-order-explainer" className="withdrawal-order-explainer" role="note">
            <p>{withdrawalExplainerBody(locale, taxConfig)}</p>
            <p className="withdrawal-order-explainer__disclaimer">{withdrawalExplainerDisclaimer(taxConfig)}</p>
          </div>
        ) : null}
      </>
    )
  }

  function metaFor(bucket: WithdrawalDisplayBucket) {
    return withdrawalBadgeAndHint(bucket, retirementAge, true, presentWithdrawalBuckets, locale)
  }

  function fidelityBucketLabel(bucket: WithdrawalDisplayBucket, fallback: string): string {
    return accountLabelForWithdrawalBucket(taxConfig, bucket) ?? fallback
  }

  function renderFidelityTaxDisclosure(
    tax: 'pretax' | 'roth' | 'hsa',
    def: { label: string; total: number },
    withdrawalUi: boolean,
  ) {
    const bucket: WithdrawalDisplayBucket = tax
    const { order } = withdrawalUi ? metaFor(bucket) : { order: null as number | null }
    const positions = positionsForTaxTreatment(fidelityRows, tax)
    const trend = computeBucketTrendDisplay(positions, holdingQuoteMap)
    const aggregated = aggregateFidelityPositionsBySymbol(positions)
    const combinedLines = positions.length > aggregated.length

    const summaryInner = withdrawalUi ? (
      <WithdrawalLabeledBlock badgeOrder={order} hint={null}>
        <FidelityBucketAccountRow label={def.label} total={fmt(def.total)} trend={trend} />
      </WithdrawalLabeledBlock>
    ) : (
      <FidelityBucketAccountRow label={def.label} total={fmt(def.total)} trend={trend} />
    )

    return (
      <details key={tax} className="tax-treatment-disclosure">
        <summary className="edit-row edit-row--fidelity-bucket tax-treatment-disclosure__summary">{summaryInner}</summary>
        <div className="tax-treatment-disclosure__body tax-treatment-disclosure__body--import-style">
          {!positions.length ? (
            <p className="footnote tax-treatment-disclosure__empty">No positions mapped to this bucket in your import.</p>
          ) : (
            <FidelityAggregatedSymbolTable
              rows={aggregated}
              combinedLines={combinedLines}
              fidelityAllRows={fidelityRows}
              scenarioBundle={fidelityScenarioBundle}
              activeScenarioSymbol={fidelityScenarioPanel?.symbol ?? null}
              onScenarioOpen={onFidelityScenarioOpen}
            />
          )}
        </div>
      </details>
    )
  }

  function renderFidelityImportedTaxBuckets(withdrawalUi: boolean) {
    const pretaxTotal = retirementPretaxDisplayTotal(c.bal)
    const defs = (
      [
        {
          tax: 'pretax' as const,
          label: fidelityBucketLabel('pretax', 'Pre-tax'),
          total: pretaxTotal,
        },
        {
          tax: 'roth' as const,
          label: fidelityBucketLabel('roth', 'Tax-advantaged'),
          total: c.bal.balRoth,
        },
        {
          tax: 'hsa' as const,
          label: fidelityBucketLabel('hsa', 'HSA'),
          total: c.bal.balHsa,
        },
      ] as const
    ).filter((d) => d.total > 0 && localeSupportsWithdrawalBucket(locale, d.tax))
    const defByTax = Object.fromEntries(defs.map((d) => [d.tax, d])) as Partial<
      Record<'pretax' | 'roth' | 'hsa', (typeof defs)[0]>
    >

    if (withdrawalUi) {
      const seq = withdrawalBucketOrder(retirementAge, false, locale)
      return seq.flatMap((b) => {
        if (b === 'brokerage') return []
        const def = defByTax[b]
        if (!def) return []
        return [renderFidelityTaxDisclosure(b, def, true)]
      })
    }

    return defs.map((d) => renderFidelityTaxDisclosure(d.tax, d, false))
  }

  function renderManualAccountEntryRow(
    entry: ManualAccountEntry,
    withdrawalUi: boolean,
    borderBottom?: CSSProperties['borderBottom'],
  ) {
    if (entry.type == null) return null
    const meta = getAccountTypeMeta(entry.type, locale)
    const bucket = meta.withdrawalBucket
    const { order, hint } = withdrawalUi ? metaFor(bucket) : { order: null as number | null, hint: null as string | null }
    const labelNode = (
      <ManualBalanceRowLabel
        label={meta.label}
        taxKind={meta.taxKind}
        taxDesc={meta.taxDesc}
        tone={meta.tone}
      />
    )
    return (
      <div key={entry.id} className="edit-row edit-row--manual-balance" style={{ borderBottom }}>
        {withdrawalUi ? (
          <WithdrawalLabeledBlock badgeOrder={order} hint={hint}>
            {labelNode}
            <div className="edit-row-right">
              <span style={{ fontFamily: 'var(--heading)', fontSize: 'var(--text-base)', fontWeight: 500 }}>
                {fmt(entry.balance)}
              </span>
            </div>
          </WithdrawalLabeledBlock>
        ) : (
          <>
            {labelNode}
            <div className="edit-row-right">
              <span style={{ fontFamily: 'var(--heading)', fontSize: 'var(--text-base)', fontWeight: 500 }}>
                {fmt(entry.balance)}
              </span>
            </div>
          </>
        )}
      </div>
    )
  }

  function renderManualAccountRow(
    row: ManualBalanceRow,
    withdrawalUi: boolean,
    bucket: WithdrawalDisplayBucket,
    borderBottom?: CSSProperties['borderBottom'],
  ) {
    const { key, label, taxKind, taxDesc, tone } = row
    const { order, hint } = withdrawalUi ? metaFor(bucket) : { order: null as number | null, hint: null as string | null }
    const labelNode = <ManualBalanceRowLabel label={label} taxKind={taxKind} taxDesc={taxDesc} tone={tone} />
    return (
      <div key={key} className="edit-row edit-row--manual-balance" style={{ borderBottom }}>
        {withdrawalUi ? (
          <WithdrawalLabeledBlock badgeOrder={order} hint={hint}>
            {labelNode}
            <div className="edit-row-right">
              <span style={{ fontFamily: 'var(--heading)', fontSize: 'var(--text-base)', fontWeight: 500 }}>{fmt(display(key))}</span>
            </div>
          </WithdrawalLabeledBlock>
        ) : (
          <>
            {labelNode}
            <div className="edit-row-right">
              <span style={{ fontFamily: 'var(--heading)', fontSize: 'var(--text-base)', fontWeight: 500 }}>{fmt(display(key))}</span>
            </div>
          </>
        )}
      </div>
    )
  }

  function renderManualBalanceEditRow(
    row: ManualBalanceRow,
    idx: number,
    opts: { readOnly?: boolean; useDraft?: boolean; omitLastBorder?: boolean },
  ) {
    const { key, label, taxKind, taxDesc, tone } = row
    const borderStyle =
      opts.omitLastBorder && idx === manualBalanceRows.length - 1 ? ({ borderBottom: 'none' } as const) : undefined
    const amount = opts.useDraft ? displayManualDraft(key) : display(key)

    return (
      <div key={key} className="edit-row edit-row--manual-balance" style={borderStyle}>
        <ManualBalanceRowLabel label={label} taxKind={taxKind} taxDesc={taxDesc} tone={tone} />
        <div className="edit-row-right">
          {opts.readOnly ? (
            <span style={{ fontFamily: 'var(--heading)', fontSize: 'var(--text-base)', fontWeight: 500 }}>{fmt(amount)}</span>
          ) : (
            <div className="num-input-wrap">
              <span className="num-input-prefix">{currencySymbol()}</span>
              <input
                type="text"
                className="num-input"
                value={fmtInput(amount)}
                onChange={(e) =>
                  opts.useDraft ? setManualDraftBase(key, e.target.value) : setBase(key, e.target.value)
                }
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  function renderBalanceRows() {
    if (!hasRetirementAccountData) {
      return null
    }

    if (readOnly) {
      if (balanceMode === 'manual') {
        const rows = visibleManualRetirementRows()
        return rows.map((row, idx) =>
          renderManualBalanceEditRow(row, idx, { readOnly: true, omitLastBorder: !mergedDashboard && idx === rows.length - 1 }),
        )
      }
      return renderFidelityImportedTaxBuckets(showWithdrawalGuidance && !mergedDashboard)
    }

    if (configureInputsOnly) {
      if (balanceMode === 'manual') {
        return manualBalanceRows.map((row, idx) => renderManualBalanceEditRow(row, idx, { omitLastBorder: true }))
      }
      if (hasAnyFidelityRetirement) {
        return (
          <p className="footnote" style={{ marginTop: 8, marginBottom: 8, border: 'none', padding: 0 }}>
            Apply balances from your import to update the model. Per-account totals and holdings are shown on the main dashboard only—not in
            this panel.
          </p>
        )
      }
      return null
    }

    if (balanceMode === 'manual') {
      return manualBalanceRows.map((row, idx) => renderManualBalanceEditRow(row, idx, { omitLastBorder: true }))
    }
    return renderFidelityImportedTaxBuckets(false)
  }

  function renderMergedBrokerageBlock(withdrawalUi: boolean) {
    if (!mergedDashboard || !hasBrokerageAccountData || brkBal == null || brkRate == null) {
      return null
    }

    const brkMeta = withdrawalUi ? metaFor('brokerage') : { order: null as number | null }
    const brkTrend = computeBucketTrendDisplay(brokeragePositions, holdingQuoteMap)

    if (!useFidelityBrokerageView) {
      return (
        <>
          <div className="edit-row" style={{ borderBottom: 'none' }}>
            {withdrawalUi ? (
              <WithdrawalLabeledBlock badgeOrder={brkMeta.order} hint={null}>
                <FidelityBucketAccountRow label="Brokerage" total={fmt(brkBal)} trend={brkTrend} showViewHoldings={false} />
              </WithdrawalLabeledBlock>
            ) : (
              <FidelityBucketAccountRow label="Brokerage" total={fmt(brkBal)} trend={brkTrend} showViewHoldings={false} />
            )}
          </div>
        </>
      )
    }

    const summaryInner = withdrawalUi ? (
      <WithdrawalLabeledBlock badgeOrder={brkMeta.order} hint={null}>
        <FidelityBucketAccountRow label="Brokerage" total={fmt(brkBal)} trend={brkTrend} />
      </WithdrawalLabeledBlock>
    ) : (
      <FidelityBucketAccountRow label="Brokerage" total={fmt(brkBal)} trend={brkTrend} />
    )

    const brkAggregated = aggregateFidelityPositionsBySymbol(brokeragePositions)
    const brkCombinedLines = brokeragePositions.length > brkAggregated.length

    return (
      <details className="tax-treatment-disclosure">
        <summary className="edit-row edit-row--fidelity-bucket tax-treatment-disclosure__summary">{summaryInner}</summary>
        <div className="tax-treatment-disclosure__body tax-treatment-disclosure__body--import-style">
          <FidelityAggregatedSymbolTable
            rows={brkAggregated}
            combinedLines={brkCombinedLines}
            fidelityAllRows={fidelityRows}
            scenarioBundle={fidelityScenarioBundle}
            activeScenarioSymbol={fidelityScenarioPanel?.symbol ?? null}
            onScenarioOpen={onFidelityScenarioOpen}
          />
        </div>
      </details>
    )
  }

  function renderMergedDashboardOrderedContent() {
    if (!mergedDashboard) return null

    const withdrawalUi = Boolean(showWithdrawalGuidance)
    const seq = withdrawalBucketOrder(retirementAge, true, locale)
    const pretaxTotal = retirementPretaxDisplayTotal(c.bal)
    const pretaxDef = {
      tax: 'pretax' as const,
      label: fidelityBucketLabel('pretax', 'Pre-tax'),
      total: pretaxTotal,
    }
    const rothDef = {
      tax: 'roth' as const,
      label: fidelityBucketLabel('roth', 'Tax-advantaged'),
      total: c.bal.balRoth,
    }
    const hsaDef = {
      tax: 'hsa' as const,
      label: fidelityBucketLabel('hsa', 'HSA'),
      total: c.bal.balHsa,
    }

    const nodes: ReactNode[] = []

    if (!hasAnyAccountCardData) {
      return null
    }

    if (balanceMode === 'manual') {
      if (manualAccountEntries.length > 0) {
        for (const step of seq) {
          const entriesForStep = manualAccountEntries.filter(
            (entry) =>
              entry.type != null && getAccountTypeMeta(entry.type, locale).withdrawalBucket === step,
          )
          if (step === 'brokerage') {
            for (const entry of entriesForStep) {
              nodes.push(<div key={entry.id}>{renderManualAccountEntryRow(entry, withdrawalUi, 'none')}</div>)
            }
            continue
          }
          if (!hasRetirementAccountData && entriesForStep.length === 0) continue
          for (const entry of entriesForStep) {
            nodes.push(renderManualAccountEntryRow(entry, withdrawalUi, undefined))
          }
        }
        return <>{nodes}</>
      }

      for (const step of seq) {
        if (step === 'brokerage') {
          if (!hasBrokerageAccountData) continue
          nodes.push(<div key="brk">{renderMergedBrokerageBlock(withdrawalUi)}</div>)
          continue
        }
        if (!hasRetirementAccountData) continue
        if (step === 'pretax') {
          for (const row of visibleManualRetirementRows().filter(
            (r) => r.key === 'ret401k' || r.key === 'se401k' || r.key === 'tradIra',
          )) {
            nodes.push(renderManualAccountRow(row, withdrawalUi, 'pretax', undefined))
          }
          continue
        }
        if (step === 'roth') {
          const rothRow = visibleManualRetirementRows().find((r) => r.key === 'roth')
          if (rothRow) nodes.push(renderManualAccountRow(rothRow, withdrawalUi, 'roth', undefined))
          continue
        }
        if (step === 'hsa') {
          const hsaRow = visibleManualRetirementRows().find((r) => r.key === 'hsa')
          if (hsaRow) nodes.push(renderManualAccountRow(hsaRow, withdrawalUi, 'hsa', 'none'))
        }
      }
      return <>{nodes}</>
    }


    for (const step of seq) {
      if (step === 'brokerage') {
        if (!hasBrokerageAccountData) continue
        nodes.push(<div key="brk">{renderMergedBrokerageBlock(withdrawalUi)}</div>)
        continue
      }
      if (!hasRetirementAccountData) continue
      if (step === 'pretax') {
        if (pretaxDef.total > 0) nodes.push(renderFidelityTaxDisclosure('pretax', pretaxDef, withdrawalUi))
        continue
      }
      if (step === 'roth') {
        if (rothDef.total > 0) nodes.push(renderFidelityTaxDisclosure('roth', rothDef, withdrawalUi))
        continue
      }
      if (step === 'hsa') {
        if (hsaDef.total > 0) nodes.push(renderFidelityTaxDisclosure('hsa', hsaDef, withdrawalUi))
      }
    }

    return <>{nodes}</>
  }

  const cardStyle: CSSProperties = {
    background: 'var(--surface)',
    borderRadius: 10,
    marginBottom: mergedDashboard ? 0 : configureInputsOnly && stackWithBrokerage ? '0.5rem' : '1rem',
  }

  const balanceEditPanelOpen = Boolean(
    balanceEditPanel ||
      balanceEditClosing ||
      fidelityScenarioPanel ||
      fidelityScenarioClosing ||
      removeAccountsModalState.isOpen,
  )

  const renderMergedDashboardOverlays = () => (
    <div className="account-balances-dashboard-overlays">
      {fidelityScenarioPanel && fidelityScenarioBundle ? (
        <aside
          className={`fidelity-scenario-slide__sheet${fidelityScenarioClosing ? ' fidelity-scenario-slide__sheet--closing' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="fidelity-scenario-panel-title"
          onAnimationEnd={onFidelityScenarioSheetAnimationEnd}
        >
          <FidelityHoldingScenarioPanel
            contributingRows={fidelityScenarioPanel.contributingRows}
            fidelityAllRows={fidelityRows}
            inputs={fidelityScenarioBundle.inputs}
            setInputs={fidelityScenarioBundle.setInputs}
            yearsToRetirement={fidelityScenarioBundle.yearsToRetirement}
            retirementCalendarYear={fidelityScenarioBundle.retirementCalendarYear}
            retRate={fidelityScenarioBundle.retRate}
            brkRate={fidelityScenarioBundle.brkRate}
            onClose={requestFidelityScenarioClose}
          />
        </aside>
      ) : null}
      {balanceEditPanel === 'manual' ? (
        <aside
          className={`account-balances-manual-sheet account-balances-edit-sheet account-balances-edit-sheet--manual${balanceEditClosing ? ' account-balances-manual-sheet--closing' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="account-balances-manual-title"
          onAnimationEnd={onBalanceEditSheetAnimationEnd}
        >
          <div className="account-balances-manual-panel-host">
            <header className="account-balances-edit-sheet__head">
              <div className="account-balances-edit-sheet__head-text">
                <h2 className="account-balances-edit-sheet__title" id="account-balances-manual-title">
                  {manualConfirmPhase === 'plan'
                    ? 'Your Plans'
                    : manualConfirmPhase === 'progress'
                      ? 'Saving balances'
                      : 'Manual balances'}
                </h2>
                {manualConfirmPhase === 'plan' ? (
                  <p className="account-balances-edit-sheet__subtitle">
                    We need a few details to project growth and monthly income from your balances.
                  </p>
                ) : null}
              </div>
              {manualConfirmPhase === false ? (
                <button
                  type="button"
                  className="account-balances-edit-sheet__close"
                  disabled={balanceEditClosing}
                  onClick={requestBalanceEditClose}
                >
                  Close
                </button>
              ) : null}
            </header>
            <div className="account-balances-edit-sheet__body">
              {manualConfirmPhase === 'progress' ? (
                <div
                  className="account-balances-manual-confirm-progress"
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                >
                  <p className="account-balances-manual-confirm-progress__label">Saving your balances…</p>
                  <div
                    className="account-balances-manual-confirm-progress__track"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={manualConfirmProgress}
                  >
                    <div
                      className="account-balances-manual-confirm-progress__fill"
                      style={{ width: `${manualConfirmProgress}%` }}
                    />
                  </div>
                </div>
              ) : manualConfirmPhase === 'plan' && inputs ? (
                <ManualBalancesPlanStep
                  key={inputsHavePlanningProfileFields(inputs) ? 'captured' : 'empty'}
                  initialDateOfBirth={planningDisplayFromInputs(inputs).dateOfBirth}
                  initialTargetRetirementAge={planningDisplayFromInputs(inputs).targetRetirementAge}
                  initialSave={planningDisplayFromInputs(inputs).save}
                  onContinue={completeManualPlanStep}
                  onCancel={() => setManualConfirmPhase(false)}
                />
              ) : (
                manualBalanceRows.map((row, idx) =>
                  renderManualBalanceEditRow(row, idx, { useDraft: true, omitLastBorder: true }),
                )
              )}
            </div>
            {manualConfirmPhase === false ? (
              <footer className="account-balances-edit-sheet__foot account-balances-edit-sheet__foot--manual-confirm">
                <button
                  type="button"
                  className="account-balances-manual-sheet__confirm-btn"
                  disabled={balanceEditClosing}
                  onClick={confirmManualBalances}
                >
                  Confirm and show me the details
                </button>
              </footer>
            ) : null}
          </div>
        </aside>
      ) : null}
      {balanceEditPanel === 'import' && onFidelityApplyBalances ? (
        <aside
          className={`account-balances-import-sheet account-balances-edit-sheet account-balances-edit-sheet--import${balanceEditClosing ? ' account-balances-import-sheet--closing' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="csv-import-modal-title"
          onAnimationEnd={onBalanceEditSheetAnimationEnd}
        >
          <FidelityCsvImport
            presentation="panel"
            open
            hideTrigger
            initialCustodian={csvImportPrefillCustodian}
            fileIngestRequest={csvFileIngestRequest}
            onFileIngestConsumed={onCsvFileIngestConsumed}
            onImportFlowClose={clearCsvImportLaunchUi}
            onOpenChange={(open) => {
              if (!open) requestBalanceEditClose()
            }}
            onApplyBalances={onFidelityApplyBalances}
            onImportApplied={() => {
              onFidelityImportApplied?.()
              requestBalanceEditClose()
            }}
            showManualReplaceNotice={willRemoveManualOnConnect}
          />
        </aside>
      ) : null}
      {renderReplaceSourceConfirmOverlay()}
      {renderRemoveAccountsConfirmOverlay()}
    </div>
  )

  const totalRetirementBar = !configureInputsOnly && (mergedDashboard ? hasAnyAccountCardData : hasRetirementAccountData) ? (
    <div
      className={[
        'account-balances-total-retirement',
        mergedDashboard ? 'account-balances-total-retirement--merged' : '',
        !mergedDashboard && stackWithBrokerage ? 'account-balances-total-retirement--stack-with-brokerage' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="account-balances-total-retirement__label">{portfolioTotalLabel}</span>
      <span className="account-balances-total-retirement__value">{fmt(portfolioTotal)}</span>
    </div>
  ) : null

  const headerManageMenu = renderAccountBalancesManageMenu()

  const csvSessionBanner = showCsvSessionBanner ? (
    <div className="csv-session-banner" role="status">
      <div className="csv-session-banner__text">
        <p className="csv-session-banner__headline">
          Your session is temporary — <strong>Pro</strong> keeps it safe.
        </p>
        <p className="csv-session-banner__subhead">
          $9/mo. No contracts, no hassle. Cancel anytime.
        </p>
      </div>
      <AppButton
        type="button"
        size="sm"
        variant="primary"
        className="csv-session-banner__cta"
        onPress={() => (onOpenUpgradeCsv ?? onOpenSignIn)?.()}
      >
        Upgrade to Pro
      </AppButton>
    </div>
  ) : null

  const accountBalancesBody = (
    <>
      {mergedDashboard ? (
        <div className="rab-brokerage-stack">
          <ManualProjectionsCallout
            hasPortfolioBalances={c.hasPortfolioBalances}
            fidelityImportRev={fidelityImportRev}
            onConnectAccounts={() => setOpenManageRequest((n) => n + 1)}
            onImportCsv={() => setOpenManageRequest((n) => n + 1)}
          />
          <div className="account-balances-header-row">
            <div className="account-balances-header-row__title-block">
              <h2 className="account-balances-header-row__title">Retirement Account Balances</h2>
              {hasCustomScenarioBadge ? (
                <p className="account-balances-header-row__subtitle">
                  <span className="account-balances-header-row__subtitle-dot" aria-hidden />
                  with custom scenarios
                </p>
              ) : null}
            </div>
            <div className="account-balances-header-row__actions">{headerManageMenu}</div>
          </div>
          {csvSessionBanner}
          {showImportedHoldingsScenarioGuide ? (
            <ImportedHoldingsScenarioGuide holdings={aggregatedHoldingsForGuide} />
          ) : null}
          <div
            className={`account-balances-card-inner-wrap${
              balanceEditPanelOpen ? ' account-balances-card-inner-wrap--scenario-slide-open' : ''
            }`}
            style={{ ...cardStyle, marginBottom: '1.75rem' }}
          >
            {showWithdrawalGuidance ? renderWithdrawalGuidanceBlock() : null}
            {renderMergedDashboardOrderedContent()}
            {totalRetirementBar}
          </div>
        </div>
      ) : (
        <>
          <div className="input-col-title">Retirement account balances</div>
          {!readOnly && (hasRetirementAccountData || balanceMode === 'fidelity') ? (
            <div className="balance-input-toolbar">
              {showBalanceEntryActions ? renderAccountBalancesManageMenu() : null}
              {balanceMode === 'fidelity' ? (
                <FidelityCsvImport
                  variant="toolbar"
                  initialCustodian={csvImportPrefillCustodian}
                  fileIngestRequest={csvFileIngestRequest}
                  onFileIngestConsumed={onCsvFileIngestConsumed}
                  onImportFlowClose={clearCsvImportLaunchUi}
                  onApplyBalances={onFidelityApplyBalances!}
                  onImportApplied={onFidelityImportApplied}
                />
              ) : null}
            </div>
          ) : null}

          <div
            className={`account-balances-card-inner-wrap account-balances-card-inner-wrap--standalone${
              !hasRetirementAccountData ? ' account-balances-card-inner-wrap--empty-state' : ''
            }${
              removeAccountsModalState.isOpen ? ' account-balances-card-inner-wrap--scenario-slide-open' : ''
            }`}
            style={cardStyle}
          >
            {csvSessionBanner}
            {showWithdrawalGuidance ? renderWithdrawalGuidanceBlock() : null}
            {renderBalanceRows()}
            {renderReplaceSourceConfirmOverlay()}
            {renderRemoveAccountsConfirmOverlay()}
          </div>
          {totalRetirementBar}
        </>
      )}
      {mergedDashboard ? renderMergedDashboardOverlays() : null}
    </>
  )

  if (onFidelityApplyBalances) {
    return (
      <PlaidConnectionProvider
        residenceCountry={inputs?.residenceCountry}
        onApplyBalances={onFidelityApplyBalances}
        onImportApplied={onFidelityImportApplied}
      >
        {accountBalancesBody}
      </PlaidConnectionProvider>
    )
  }

  return accountBalancesBody
}
