import type { AnimationEvent, ChangeEvent, CSSProperties, ReactNode } from 'react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { IconArrowDown } from '@tabler/icons-react'
import { Button, ButtonGroup, ListBox, Select, useOverlayState } from '@heroui/react'
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
import type { AppSnapshotV1 } from '../lib/appSnapshot'
import type { BrokerageBalanceMode } from '../lib/brokerageBalanceMode'
import type { BalanceInputMode } from '../lib/retirementBalanceMode'
import {
  withdrawalBadgeAndHint,
  withdrawalBucketOrder,
  type WithdrawalDisplayBucket,
} from '../lib/withdrawalDisplayOrder'
import type { PositionsCsvCustodian } from '../lib/positionsCsvImport'
import { fmt, fmtInput, parseNum } from '../utils/format'
import { computeMergedDashboardPositionModels, blendedRateForDashboardPositionId } from '../lib/mergedDashboardPositionModels'
import { positionUsesCustomReturnMode } from '../lib/positionReturnModel'
import { FidelityAggregatedSymbolTable, type FidelityAggregatedScenarioBundle } from './FidelityAggregatedSymbolTable'
import { FidelityBucketAccountRow } from './FidelityBucketAccountRow'
import { FidelityCsvImport } from './FidelityCsvImport'
import { FidelityHoldingScenarioPanel } from './FidelityHoldingScenarioPopout'
import { ScenariosBar } from './ScenariosBar'
import './AccountBalancesTaxDisclosure.scss'
import './AccountBalancesCustomScenario.scss'

type BucketKey = 'ret401k' | 'se401k' | 'roth' | 'hsa'

function isPositionsCsvCustodian(id: string): id is PositionsCsvCustodian {
  return id === 'fidelity' || id === 'schwab' || id === 'vanguard' || id === 'other'
}

function firstKeyFromSelectSelection(keys: unknown): string | null {
  if (keys == null || keys === 'all') return null
  if (typeof keys === 'object' && 'values' in keys && typeof (keys as { values: () => Iterator<unknown> }).values === 'function') {
    const it = (keys as Set<unknown>).values().next()
    return it.done || it.value == null ? null : String(it.value)
  }
  return String(keys)
}

type Props = {
  c: ComputedSnapshot
  /** Omit or no-op when `readOnly` — dashboard output only. */
  onBases?: (b: Partial<{ base401k: number; baseSE401k: number; baseRoth: number; baseHsa: number }>) => void
  balanceMode: BalanceInputMode
  onBalanceModeChange?: (m: BalanceInputMode) => void
  fidelityImportRev: number
  /** Tighter bottom margin when Brokerage card follows in the same visual group. */
  stackWithBrokerage?: boolean
  onFidelityApplyBalances?: (partial: Pick<CalculatorInputs, 'base401k' | 'baseSE401k' | 'baseRoth' | 'baseHsa' | 'brkBal'>) => void
  onFidelityImportApplied?: () => void
  /** Clear manual balances, stored import, and per-holding return overrides for this card. */
  onRemoveRetirementAccounts?: () => void
  /** When true, show balances and Fidelity breakdown only (no mode toggle, CSV import, or manual fields). */
  readOnly?: boolean
  /** Dashboard: pass through for per-holding return sliders when `readOnly` + Fidelity mode. */
  inputs?: CalculatorInputs
  setInputs?: (p: Partial<CalculatorInputs>) => void
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
  getSnapshot?: () => AppSnapshotV1
  onLoadSnapshot?: (s: AppSnapshotV1) => void
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

const EXPLAINER_BODY =
  'This order is designed to minimize your lifetime tax burden. Drawing from taxable accounts first preserves your tax-advantaged accounts longer. Strategic pre-tax withdrawals before age 73 let you fill lower tax brackets and convert to Roth while your income is lower. Roth accounts have no required withdrawals, so letting them grow tax-free as long as possible maximizes their value.'

const REMOVE_ACCOUNTS_CONFIRM_BODY =
  'Remove all account balances from this card? Manual totals, imported positions, and custom return overrides for these accounts will be cleared.'

const EXPLAINER_DISCLAIMER = 'This is a general strategy. Consult a financial advisor for personalized guidance.'

export function AccountBalances({
  c,
  onBases,
  balanceMode,
  onBalanceModeChange,
  fidelityImportRev,
  stackWithBrokerage,
  onFidelityApplyBalances,
  onFidelityImportApplied,
  onRemoveRetirementAccounts,
  readOnly = false,
  inputs,
  setInputs,
  openReturnEditorRequest: _openReturnEditorRequest,
  onReturnEditorOpenHandled: _onReturnEditorOpenHandled,
  configureInputsOnly = false,
  mergeBrokerageInRetirementCard = false,
  brkBal,
  brkRate,
  brokerageMode,
  getSnapshot,
  onLoadSnapshot,
}: Props) {
  const retTotal = c.retBal
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

  const hasManualRetirementBalances =
    c.bal.bal401k > 0 || c.bal.balSE401k > 0 || c.bal.balRoth > 0 || c.bal.balHsa > 0

  const hasRetirementAccountData =
    balanceMode === 'manual' ? hasManualRetirementBalances : hasAnyFidelityRetirement

  const hasManualBrokerageBalance = (brkBal ?? 0) > 0
  const hasBrokerageAccountData =
    mergedDashboard && (hasFidelityBrokerage || hasManualBrokerageBalance)
  const useFidelityBrokerageView =
    hasFidelityBrokerage && (mergedDashboard || brokerageMode === 'fidelity')

  const hasAnyAccountCardData = hasRetirementAccountData || Boolean(hasBrokerageAccountData)

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

  const scenariosBar =
    mergedDashboard && getSnapshot && onLoadSnapshot ? (
      <ScenariosBar getSnapshot={getSnapshot} onLoadSnapshot={onLoadSnapshot} />
    ) : null

  const [fidelityScenarioPanel, setFidelityScenarioPanel] = useState<{
    symbol: string
    contributingRows: FidelityPositionRow[]
  } | null>(null)
  const [fidelityScenarioClosing, setFidelityScenarioClosing] = useState(false)
  const [balanceEditPanel, setBalanceEditPanel] = useState<'manual' | 'import' | null>(null)
  const [balanceEditClosing, setBalanceEditClosing] = useState(false)
  const [csvImportPrefillCustodian, setCsvImportPrefillCustodian] = useState<PositionsCsvCustodian | null>(null)
  const [csvImportLaunchNonce, setCsvImportLaunchNonce] = useState(0)
  const [custodianSelectResetKey, setCustodianSelectResetKey] = useState(0)
  const [csvFileIngestRequest, setCsvFileIngestRequest] = useState<{
    id: number
    file: File
    custodian: PositionsCsvCustodian
  } | null>(null)
  const financialsCsvPendingCustodianRef = useRef<PositionsCsvCustodian | null>(null)
  const financialsCsvFileInputRef = useRef<HTMLInputElement>(null)

  const canEditBalances = Boolean(
    mergedDashboard && onBases && onBalanceModeChange && onFidelityApplyBalances,
  )

  const removeAccountsModalState = useOverlayState()
  const financialsImportPrefixId = useId()

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
  }, [])

  const requestBalanceEditClose = useCallback(() => {
    if (!balanceEditPanel || balanceEditClosing) return
    setBalanceEditClosing(true)
  }, [balanceEditPanel, balanceEditClosing])

  const onBalanceEditSheetAnimationEnd = useCallback(
    (e: AnimationEvent<HTMLElement>) => {
      if (e.target !== e.currentTarget) return
      if (e.animationName !== 'fidelity-scenario-slide-sheet-out') return
      if (!balanceEditClosing) return
      finalizeBalanceEditClose()
    },
    [balanceEditClosing, finalizeBalanceEditClose],
  )

  const openBalanceEditPanel = useCallback(
    (panel: 'manual' | 'import') => {
      setFidelityScenarioPanel(null)
      setFidelityScenarioClosing(false)
      setBalanceEditClosing(false)
      setBalanceEditPanel(panel)
      onBalanceModeChange?.(panel === 'manual' ? 'manual' : 'fidelity')
    },
    [onBalanceModeChange],
  )

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
    setCustodianSelectResetKey((k) => k + 1)
  }, [])

  const onCsvFileIngestConsumed = useCallback(() => {
    setCsvFileIngestRequest(null)
  }, [])

  const onFinancialsCsvFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      e.target.value = ''
      const c = financialsCsvPendingCustodianRef.current
      financialsCsvPendingCustodianRef.current = null
      if (!f || !c) return
      setCsvImportPrefillCustodian(c)
      setCsvImportLaunchNonce((n) => n + 1)
      setCsvFileIngestRequest({ id: Date.now(), file: f, custodian: c })
      setCustodianSelectResetKey((k) => k + 1)
      onBalanceModeChange?.('fidelity')
      if (mergedDashboard && onFidelityApplyBalances) {
        openBalanceEditPanel('import')
      }
    },
    [mergedDashboard, onBalanceModeChange, onFidelityApplyBalances, openBalanceEditPanel],
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

  const showBalanceEntryActions = mergedDashboard ? canEditBalances : !readOnly && Boolean(onBalanceModeChange)

  function setBase(key: BucketKey, displayVal: string) {
    if (!onBases) return
    const v = parseNum(displayVal)
    const baseKey =
      key === 'ret401k'
        ? 'base401k'
        : key === 'se401k'
          ? 'baseSE401k'
          : key === 'roth'
            ? 'baseRoth'
            : 'baseHsa'
    onBases({ [baseKey]: Math.max(0, v) } as Parameters<NonNullable<typeof onBases>>[0])
  }

  const rows: { key: BucketKey; label: string; tag: ReactNode; bucket: 'trad401k' | 'se401k' | 'roth' | 'hsa' }[] = [
    { key: 'ret401k', label: 'Existing 401k', tag: <span className="acct-tag trad">traditional</span>, bucket: 'trad401k' },
    {
      key: 'se401k',
      label: 'Self-Employed 401k',
      tag: <span className="acct-tag trad">traditional</span>,
      bucket: 'se401k',
    },
    { key: 'roth', label: 'Roth IRA', tag: <span className="acct-tag roth">tax-free</span>, bucket: 'roth' },
    { key: 'hsa', label: 'HSA', tag: <span className="acct-tag hsa">medical tax-free</span>, bucket: 'hsa' },
  ]

  const display = (key: BucketKey) =>
    key === 'ret401k'
      ? c.bal.bal401k
      : key === 'se401k'
        ? c.bal.balSE401k
        : key === 'roth'
          ? c.bal.balRoth
          : c.bal.balHsa

  function setMode(m: BalanceInputMode) {
    onBalanceModeChange?.(m)
  }

  function renderRemoveAccountsButton() {
    if (!hasAnyAccountCardData || !onRemoveRetirementAccounts) return null

    return (
      <Button
        variant="outline"
        size="sm"
        className="account-balances-remove-btn"
        onPress={() => removeAccountsModalState.open()}
      >
        Remove accounts
      </Button>
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

  function renderBalanceEntryButtons() {
    if (!showBalanceEntryActions) return null

    const manualActive = mergedDashboard
      ? balanceEditPanel === 'manual' || balanceMode === 'manual'
      : balanceMode === 'manual'
    const importActive = mergedDashboard
      ? balanceEditPanel === 'import' || balanceMode === 'fidelity'
      : balanceMode === 'fidelity'

    return (
      <ButtonGroup size="sm" className="balance-mode-button-group" role="group" aria-label="Balance entry mode">
        <Button
          variant="outline"
          className={manualActive ? 'balance-mode-seg-active' : undefined}
          onPress={() => (mergedDashboard ? toggleBalanceEditPanel('manual') : setMode('manual'))}
        >
          Manually add values
        </Button>
        <Button
          variant="outline"
          className={importActive ? 'balance-mode-seg-active' : undefined}
          onPress={() => (mergedDashboard ? toggleBalanceEditPanel('import') : setMode('fidelity'))}
        >
          Use imported CSV
        </Button>
      </ButtonGroup>
    )
  }

  function renderRetirementBalancesEmptyState() {
    return (
      <div className="account-balances-empty" role="status">
        {showBalanceEntryActions ? (
          <div className="account-balances-empty__actions account-balances-empty__actions--financials-entry">
            {renderFinancialsEntryFull()}
          </div>
        ) : null}
      </div>
    )
  }

  function renderFinancialsEntryFull() {
    if (!showBalanceEntryActions) return null
    return (
      <div className="account-balances-financials-entry">
        <h2 className="account-balances-financials-entry__title">How would you like to add your financials for this?</h2>
        <div className="account-balances-financials-entry__manual-row">
          <Button
            variant="primary"
            size="sm"
            className="account-balances-financials-entry__manual-btn"
            onPress={() => (mergedDashboard ? toggleBalanceEditPanel('manual') : setMode('manual'))}
          >
            I'll manually add them
          </Button>
        </div>
        <div className="account-balances-financials-entry__import-row">
          <span className="account-balances-financials-entry__import-prefix" id={financialsImportPrefixId}>
            Import a CSV from
          </span>
          <input
            ref={financialsCsvFileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={onFinancialsCsvFileChange}
          />
          <Select
            key={custodianSelectResetKey}
            className="account-balances-financials-entry__select"
            aria-labelledby={financialsImportPrefixId}
            placeholder="Choose custodian…"
            onSelectionChange={(keys) => {
              const id = firstKeyFromSelectSelection(keys)
              if (!id || !isPositionsCsvCustodian(id)) return
              financialsCsvPendingCustodianRef.current = id
              financialsCsvFileInputRef.current?.click()
            }}
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="fidelity" textValue="Fidelity">
                  Fidelity
                </ListBox.Item>
                <ListBox.Item id="schwab" textValue="Charles Schwab">
                  Charles Schwab
                </ListBox.Item>
                <ListBox.Item id="vanguard" textValue="Vanguard">
                  Vanguard
                </ListBox.Item>
                <ListBox.Item id="other" textValue="Other">
                  Other
                </ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>
        </div>
      </div>
    )
  }

  function renderWithdrawalGuidanceBlock() {
    if (!showWithdrawalGuidance) return null
    return (
      <>
        <div className="withdrawal-order-context">
          <div className="withdrawal-order-context__stack">
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
            <div className="withdrawal-order-context__arrow-row" aria-hidden>
              <span className="withdrawal-order-context__arrow-slot">
                <IconArrowDown size={18} stroke={1.75} className="withdrawal-order-context__arrow" />
              </span>
            </div>
          </div>
        </div>
        {withdrawalExplainerOpen ? (
          <div id="withdrawal-order-explainer" className="withdrawal-order-explainer" role="note">
            <p>{EXPLAINER_BODY}</p>
            <p className="withdrawal-order-explainer__disclaimer">{EXPLAINER_DISCLAIMER}</p>
          </div>
        ) : null}
      </>
    )
  }

  function metaFor(bucket: WithdrawalDisplayBucket) {
    return withdrawalBadgeAndHint(bucket, retirementAge, true)
  }

  function renderFidelityTaxDisclosure(
    tax: 'pretax' | 'roth' | 'hsa',
    def: { label: string; tag: ReactNode; total: number },
    withdrawalUi: boolean,
  ) {
    const bucket: WithdrawalDisplayBucket = tax
    const { order, hint } = withdrawalUi ? metaFor(bucket) : { order: null as number | null, hint: null as string | null }
    const positions = positionsForTaxTreatment(fidelityRows, tax)
    const aggregated = aggregateFidelityPositionsBySymbol(positions)
    const combinedLines = positions.length > aggregated.length

    const summaryInner = withdrawalUi ? (
      <WithdrawalLabeledBlock badgeOrder={order} hint={hint}>
        <FidelityBucketAccountRow label={<>{def.label} {def.tag}</>} total={fmt(def.total)} />
      </WithdrawalLabeledBlock>
    ) : (
      <FidelityBucketAccountRow label={<>{def.label} {def.tag}</>} total={fmt(def.total)} />
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
    const pretaxTotal = c.bal.bal401k + c.bal.balSE401k
    const defs: { tax: 'pretax' | 'roth' | 'hsa'; label: string; tag: ReactNode; total: number }[] = [
      {
        tax: 'pretax',
        label: 'Pre-tax',
        tag: <span className="acct-tag trad">401(k), IRA, 403(b), etc.</span>,
        total: pretaxTotal,
      },
      {
        tax: 'roth',
        label: 'Roth',
        tag: <span className="acct-tag roth">tax-free</span>,
        total: c.bal.balRoth,
      },
      {
        tax: 'hsa',
        label: 'HSA',
        tag: <span className="acct-tag hsa">medical tax-free</span>,
        total: c.bal.balHsa,
      },
    ]
    const defByTax = Object.fromEntries(defs.map((d) => [d.tax, d])) as Record<'pretax' | 'roth' | 'hsa', (typeof defs)[0]>

    if (withdrawalUi) {
      const seq = withdrawalBucketOrder(retirementAge, false)
      return seq.flatMap((b) => (b === 'brokerage' ? [] : [renderFidelityTaxDisclosure(b, defByTax[b], true)]))
    }

    return defs.map((d) => renderFidelityTaxDisclosure(d.tax, d, false))
  }

  function renderBalanceRows() {
    if (!hasRetirementAccountData) {
      return renderRetirementBalancesEmptyState()
    }

    if (readOnly) {
      if (balanceMode === 'manual') {
        return rows.map(({ key, label, tag }, idx) => (
          <div
            key={key}
            className="edit-row"
            style={idx === rows.length - 1 && !mergedDashboard ? { borderBottom: 'none' } : undefined}
          >
            <span className="edit-row-label">
              {label} {tag}
            </span>
            <div className="edit-row-right">
              <span style={{ fontFamily: 'var(--heading)', fontSize: 'var(--text-base)', fontWeight: 500 }}>{fmt(display(key))}</span>
            </div>
          </div>
        ))
      }
      return renderFidelityImportedTaxBuckets(showWithdrawalGuidance && !mergedDashboard)
    }

    if (configureInputsOnly) {
      if (balanceMode === 'manual') {
        return rows.map(({ key, label, tag }, idx) => (
          <div key={key} className="edit-row" style={idx === rows.length - 1 ? { borderBottom: 'none' } : undefined}>
            <span className="edit-row-label">
              {label} {tag}
            </span>
            <div className="edit-row-right">
              <div className="num-input-wrap">
                <span className="num-input-prefix">$</span>
                <input
                  type="text"
                  className="num-input"
                  value={fmtInput(display(key))}
                  onChange={(e) => setBase(key, e.target.value)}
                />
              </div>
            </div>
          </div>
        ))
      }
      if (hasAnyFidelityRetirement) {
        return (
          <p className="footnote" style={{ marginTop: 8, marginBottom: 8, border: 'none', padding: 0 }}>
            Apply balances from your import to update the model. Per-account totals and holdings are shown on the main dashboard only—not in
            this panel.
          </p>
        )
      }
      return renderRetirementBalancesEmptyState()
    }

    if (balanceMode === 'manual') {
      return rows.map(({ key, label, tag }, idx) => (
        <div key={key} className="edit-row" style={idx === rows.length - 1 ? { borderBottom: 'none' } : undefined}>
          <span className="edit-row-label">
            {label} {tag}
          </span>
          <div className="edit-row-right">
            <div className="num-input-wrap">
              <span className="num-input-prefix">$</span>
              <input
                type="text"
                className="num-input"
                value={fmtInput(display(key))}
                onChange={(e) => setBase(key, e.target.value)}
              />
            </div>
          </div>
        </div>
      ))
    }
    return renderFidelityImportedTaxBuckets(false)
  }

  function renderMergedBrokerageBlock(withdrawalUi: boolean) {
    if (!mergedDashboard || !hasBrokerageAccountData || brkBal == null || brkRate == null) {
      return null
    }

    const brkMeta = withdrawalUi ? metaFor('brokerage') : { order: null as number | null, hint: null as string | null }

    if (!useFidelityBrokerageView) {
      return (
        <>
          <div className="edit-row" style={{ borderBottom: scenariosBar ? undefined : 'none' }}>
            {withdrawalUi ? (
              <WithdrawalLabeledBlock badgeOrder={brkMeta.order} hint={brkMeta.hint}>
                <span className="edit-row-label">
                  Brokerage <span className="acct-tag taxable">taxable</span>
                </span>
                <div className="edit-row-right">
                  <span style={{ fontFamily: 'var(--heading)', fontSize: 'var(--text-base)', fontWeight: 500 }}>{fmt(brkBal)}</span>
                </div>
              </WithdrawalLabeledBlock>
            ) : (
              <>
                <span className="edit-row-label">
                  Brokerage <span className="acct-tag taxable">taxable</span>
                </span>
                <div className="edit-row-right">
                  <span style={{ fontFamily: 'var(--heading)', fontSize: 'var(--text-base)', fontWeight: 500 }}>{fmt(brkBal)}</span>
                </div>
              </>
            )}
          </div>
          {scenariosBar ? (
            <div style={{ padding: '8px 0 4px', borderTop: '1px solid var(--border)' }}>{scenariosBar}</div>
          ) : null}
        </>
      )
    }

    const summaryInner = withdrawalUi ? (
      <WithdrawalLabeledBlock badgeOrder={brkMeta.order} hint={brkMeta.hint}>
        <FidelityBucketAccountRow
          label={
            <>
              Brokerage <span className="acct-tag taxable">taxable</span>
            </>
          }
          total={fmt(brkBal)}
        />
      </WithdrawalLabeledBlock>
    ) : (
      <FidelityBucketAccountRow
        label={
          <>
            Brokerage <span className="acct-tag taxable">taxable</span>
          </>
        }
        total={fmt(brkBal)}
      />
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
          {scenariosBar ? (
            <div style={{ padding: '8px 0 4px', borderTop: '1px solid var(--border)' }}>{scenariosBar}</div>
          ) : null}
        </div>
      </details>
    )
  }

  function renderManualAccountRow(
    key: BucketKey,
    label: string,
    tag: ReactNode,
    withdrawalUi: boolean,
    bucket: WithdrawalDisplayBucket,
    borderBottom?: CSSProperties['borderBottom'],
  ) {
    const { order, hint } = withdrawalUi ? metaFor(bucket) : { order: null as number | null, hint: null as string | null }
    return (
      <div key={key} className="edit-row" style={{ borderBottom }}>
        {withdrawalUi ? (
          <WithdrawalLabeledBlock badgeOrder={order} hint={hint}>
            <span className="edit-row-label">
              {label} {tag}
            </span>
            <div className="edit-row-right">
              <span style={{ fontFamily: 'var(--heading)', fontSize: 'var(--text-base)', fontWeight: 500 }}>{fmt(display(key))}</span>
            </div>
          </WithdrawalLabeledBlock>
        ) : (
          <>
            <span className="edit-row-label">
              {label} {tag}
            </span>
            <div className="edit-row-right">
              <span style={{ fontFamily: 'var(--heading)', fontSize: 'var(--text-base)', fontWeight: 500 }}>{fmt(display(key))}</span>
            </div>
          </>
        )}
      </div>
    )
  }

  function renderMergedDashboardOrderedContent() {
    if (!mergedDashboard) return null

    const withdrawalUi = Boolean(showWithdrawalGuidance)
    const seq = withdrawalBucketOrder(retirementAge, true)
    const pretaxTotal = c.bal.bal401k + c.bal.balSE401k
    const pretaxDef = {
      tax: 'pretax' as const,
      label: 'Pre-tax',
      tag: <span className="acct-tag trad">401(k), IRA, 403(b), etc.</span>,
      total: pretaxTotal,
    }
    const rothDef = {
      tax: 'roth' as const,
      label: 'Roth',
      tag: <span className="acct-tag roth">tax-free</span>,
      total: c.bal.balRoth,
    }
    const hsaDef = {
      tax: 'hsa' as const,
      label: 'HSA',
      tag: <span className="acct-tag hsa">medical tax-free</span>,
      total: c.bal.balHsa,
    }

    const nodes: ReactNode[] = []

    if (!hasAnyAccountCardData) {
      return null
    }

    if (balanceMode === 'manual') {
      for (const step of seq) {
        if (step === 'brokerage') {
          if (!hasBrokerageAccountData) continue
          nodes.push(<div key="brk">{renderMergedBrokerageBlock(withdrawalUi)}</div>)
          continue
        }
        if (!hasRetirementAccountData) continue
        if (step === 'pretax') {
          nodes.push(
            renderManualAccountRow('ret401k', 'Existing 401k', rows[0].tag, withdrawalUi, 'pretax', undefined),
            renderManualAccountRow('se401k', 'Self-Employed 401k', rows[1].tag, withdrawalUi, 'pretax', undefined),
          )
          continue
        }
        if (step === 'roth') {
          nodes.push(renderManualAccountRow('roth', 'Roth IRA', rows[2].tag, withdrawalUi, 'roth', undefined))
          continue
        }
        if (step === 'hsa') {
          nodes.push(renderManualAccountRow('hsa', 'HSA', rows[3].tag, withdrawalUi, 'hsa', 'none'))
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
        nodes.push(renderFidelityTaxDisclosure('pretax', pretaxDef, withdrawalUi))
        continue
      }
      if (step === 'roth') {
        nodes.push(renderFidelityTaxDisclosure('roth', rothDef, withdrawalUi))
        continue
      }
      if (step === 'hsa') {
        nodes.push(renderFidelityTaxDisclosure('hsa', hsaDef, withdrawalUi))
      }
    }

    return <>{nodes}</>
  }

  const cardStyle: CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '4px 14px',
    marginBottom: mergedDashboard ? 0 : configureInputsOnly && stackWithBrokerage ? '0.5rem' : '1rem',
  }

  const totalRetirementBar = !configureInputsOnly && hasRetirementAccountData ? (
    <div
      style={{
        background: 'var(--surface2)',
        borderRadius: 8,
        padding: '8px 12px',
        marginTop: mergedDashboard ? 10 : 0,
        marginBottom: mergedDashboard ? 10 : stackWithBrokerage ? '0.5rem' : '1.75rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
      }}
    >
      <span style={{ fontFamily: 'var(--body)', fontSize: 11, color: 'var(--text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Total retirement
      </span>
      <span style={{ fontFamily: 'var(--heading)', fontSize: '1.1rem', fontWeight: 500 }}>{fmt(retTotal)}</span>
    </div>
  ) : null

  return (
    <>
      {mergedDashboard ? (
        <>
          <div className="account-balances-header-row">
            <div className="input-col-title account-balances-header-row__title">Retirement account balances</div>
            <div className="account-balances-header-row__actions">
              {showBalanceEntryActions && hasAnyAccountCardData ? renderBalanceEntryButtons() : null}
              {renderRemoveAccountsButton()}
              {hasCustomScenarioBadge ? <span className="custom-scenario-active-badge">Custom scenario active</span> : null}
            </div>
          </div>
          <div
            className={`account-balances-card-inner-wrap${
              !hasAnyAccountCardData ? ' account-balances-card-inner-wrap--empty-state' : ''
            }${
              balanceEditPanel ||
              balanceEditClosing ||
              fidelityScenarioPanel ||
              fidelityScenarioClosing ||
              removeAccountsModalState.isOpen
                ? ' account-balances-card-inner-wrap--scenario-slide-open'
                : ''
            }`}
            style={{ ...cardStyle, marginBottom: '1.75rem' }}
          >
            {!hasAnyAccountCardData ? renderRetirementBalancesEmptyState() : null}
            {showWithdrawalGuidance ? renderWithdrawalGuidanceBlock() : null}
            {renderMergedDashboardOrderedContent()}
            {totalRetirementBar}
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
                className={`fidelity-scenario-slide__sheet account-balances-edit-sheet${balanceEditClosing ? ' fidelity-scenario-slide__sheet--closing' : ''}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="account-balances-manual-title"
                onAnimationEnd={onBalanceEditSheetAnimationEnd}
              >
                <header className="account-balances-edit-sheet__head">
                  <h2 className="account-balances-edit-sheet__title" id="account-balances-manual-title">
                    Manual balances
                  </h2>
                  <button type="button" className="account-balances-edit-sheet__close" onClick={requestBalanceEditClose}>
                    Close
                  </button>
                </header>
                <div className="account-balances-edit-sheet__body">
                  {rows.map(({ key, label, tag }, idx) => (
                    <div key={key} className="edit-row" style={idx === rows.length - 1 ? { borderBottom: 'none' } : undefined}>
                      <span className="edit-row-label">
                        {label} {tag}
                      </span>
                      <div className="edit-row-right">
                        <div className="num-input-wrap">
                          <span className="num-input-prefix">$</span>
                          <input
                            type="text"
                            className="num-input"
                            value={fmtInput(display(key))}
                            onChange={(e) => setBase(key, e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <footer className="account-balances-edit-sheet__foot">
                  <Button size="sm" variant="primary" onPress={requestBalanceEditClose}>
                    Done
                  </Button>
                </footer>
              </aside>
            ) : null}
            {balanceEditPanel === 'import' && onFidelityApplyBalances ? (
              <aside
                className={`fidelity-scenario-slide__sheet account-balances-edit-sheet account-balances-edit-sheet--import${balanceEditClosing ? ' fidelity-scenario-slide__sheet--closing' : ''}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="csv-import-modal-title"
                onAnimationEnd={onBalanceEditSheetAnimationEnd}
              >
                <FidelityCsvImport
                  key={`acct-balances-import-${csvImportLaunchNonce}`}
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
                    finalizeBalanceEditClose()
                  }}
                />
              </aside>
            ) : null}
            {renderRemoveAccountsConfirmOverlay()}
          </div>
        </>
      ) : (
        <>
          <div className="input-col-title">Retirement account balances</div>
          {!readOnly && (hasRetirementAccountData || balanceMode === 'fidelity') ? (
            <div className="balance-input-toolbar">
              {renderBalanceEntryButtons()}
              {renderRemoveAccountsButton()}
              {balanceMode === 'fidelity' ? (
                <FidelityCsvImport
                  key={`acct-balances-import-toolbar-${csvImportLaunchNonce}`}
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
            {showWithdrawalGuidance ? renderWithdrawalGuidanceBlock() : null}
            {renderBalanceRows()}
            {renderRemoveAccountsConfirmOverlay()}
          </div>
          {totalRetirementBar}
        </>
      )}
    </>
  )
}
