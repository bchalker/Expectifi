import { IconChevronCompactDown, IconCirclePlus } from '@tabler/icons-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CalculatorInputs } from '../lib/computeResults'
import type { AggregatedFidelitySymbolRow, FidelityPositionRow } from '../lib/fidelityCsv'
import {
  aggregateRowHasAccountBreakdown,
  breakdownAggregateByAccount,
  normalizeFidelityImportSymbol,
} from '../lib/fidelityCsv'
import { formatFidelityDescription } from '../lib/fidelityDisplay'
import { formatHoldingShareCount, truncateForHoldingsTable } from '../lib/fidelityHoldingDisplay'
import {
  inferCommonScenarioChoiceForModels,
  scenarioColumnShortLabel,
  SCENARIO_MIXED,
  type ScenarioUiChoice,
} from '../lib/holdingScenarioApply'
import {
  blendedRateForDashboardPositionId,
  computeMergedDashboardPositionModels,
  mergedDashboardModelsForTickerKeys,
  tickerKeySetFromFidelityRows,
} from '../lib/mergedDashboardPositionModels'
import type { PositionReturnModel } from '../lib/positionReturnModel'
import { fmt } from '../utils/format'
import { FidelityValueHoverPortal } from './FidelityValueHoverPortal'
import { Tooltip } from './Tooltip'
import './FidelityHoldingScenarioPopout.scss'

export type FidelityAggregatedScenarioBundle = {
  inputs: CalculatorInputs
  setInputs: (p: Partial<CalculatorInputs>) => void
  yearsToRetirement: number
  retirementCalendarYear: number
  retRate: number
  brkRate: number
}

type Props = {
  rows: AggregatedFidelitySymbolRow[]
  /** When true, same ticker appeared on more than one import line (e.g. multiple accounts). */
  combinedLines: boolean
  /** Full merged import rows (for return model ids and value-hover source lines). */
  fidelityAllRows: FidelityPositionRow[]
  /** Dashboard only: enables Scenario column + slide panel (parent hosts panel). */
  scenarioBundle?: FidelityAggregatedScenarioBundle | null
  /** Which ticker’s scenario sheet is open (symbol display key, matches row `symbol`). */
  activeScenarioSymbol?: string | null
  onScenarioOpen?: (payload: { symbol: string; contributingRows: FidelityPositionRow[] }) => void
}

function scenarioTriggerChoiceClass(choice: ScenarioUiChoice | typeof SCENARIO_MIXED): string {
  if (choice === 'default' || choice === SCENARIO_MIXED) return ''
  if (choice === 'base') return 'fidelity-agg-scenario-trigger--normal'
  return `fidelity-agg-scenario-trigger--${choice}`
}

function placementForHover(rect: DOMRect): 'above' | 'below' {
  const spaceBelow = window.innerHeight - rect.bottom
  return spaceBelow >= 100 ? 'below' : 'above'
}

function modelsForAggregateRow(
  row: AggregatedFidelitySymbolRow,
  merged: PositionReturnModel[],
): PositionReturnModel[] {
  const keys = tickerKeySetFromFidelityRows(row.contributingRows)
  return mergedDashboardModelsForTickerKeys(merged, keys)
}

type HoldingGroupProps = {
  row: AggregatedFidelitySymbolRow
  expanded: boolean
  onToggleExpand: () => void
  scenarioBundle?: FidelityAggregatedScenarioBundle | null
  mergedModels: PositionReturnModel[]
  h: number
  activeScenarioSymbol?: string | null
  onScenarioOpen?: (payload: { symbol: string; contributingRows: FidelityPositionRow[] }) => void
  onValueHoverEnter: (key: string, rect: DOMRect) => void
  onValueHoverLeave: () => void
}

function FidelityAggregatedHoldingGroup({
  row: r,
  expanded,
  onToggleExpand,
  scenarioBundle,
  mergedModels,
  h,
  activeScenarioSymbol,
  onScenarioOpen,
  onValueHoverEnter,
  onValueHoverLeave,
}: HoldingGroupProps) {
  const hasBreakdown = aggregateRowHasAccountBreakdown(r)
  const breakdown = useMemo(
    () => (hasBreakdown ? breakdownAggregateByAccount(r) : []),
    [hasBreakdown, r],
  )
  const colSpan = scenarioBundle ? 5 : 4

  const fullDesc = formatFidelityDescription(r.description)
  const shortDesc = truncateForHoldingsTable(fullDesc)
  const showTip = fullDesc.length > shortDesc.length
  const models = scenarioBundle ? modelsForAggregateRow(r, mergedModels) : []
  const common =
    scenarioBundle && models.length
      ? inferCommonScenarioChoiceForModels(models, h, (m) =>
          blendedRateForDashboardPositionId(m.id, scenarioBundle.retRate, scenarioBundle.brkRate),
        )
      : SCENARIO_MIXED
  const customDec = models.length && common === 'custom' ? models[0]?.flatRate : undefined
  const label = scenarioBundle ? scenarioColumnShortLabel(common, customDec) : '—'
  const showAccent = scenarioBundle && common !== 'default'
  const rowKey = r.symbol
  const rowActive =
    activeScenarioSymbol != null &&
    normalizeFidelityImportSymbol(activeScenarioSymbol).toUpperCase() ===
      normalizeFidelityImportSymbol(rowKey).toUpperCase()

  return (
    <tbody className={`fidelity-agg-holding-group${expanded ? ' fidelity-agg-holding-group--open' : ''}`}>
      <tr className={rowActive ? 'fidelity-agg-symbol-row--scenario-active' : undefined}>
        <td className="sym">
          <div className="fidelity-agg-symbol-cell">
            {hasBreakdown ? (
              <button
                type="button"
                className="fidelity-agg-expand-btn"
                aria-expanded={expanded}
                aria-label={
                  expanded
                    ? `Collapse ${r.symbol} account breakdown`
                    : `Expand ${r.symbol} account breakdown`
                }
                onClick={onToggleExpand}
              >
                <IconChevronCompactDown size={16} stroke={1.5} aria-hidden />
              </button>
            ) : (
              <span className="fidelity-agg-expand-btn fidelity-agg-expand-btn--spacer" aria-hidden />
            )}
            <span>{r.symbol}</span>
          </div>
        </td>
        <td className="fidelity-desc-cell fidelity-desc-cell--trunc">
          {showTip ? (
            <Tooltip content={fullDesc} placement="top">
              <span>{shortDesc}</span>
            </Tooltip>
          ) : (
            <span title={fullDesc}>{shortDesc}</span>
          )}
        </td>
        <td className="val" style={{ textAlign: 'right' }}>
          <span
            className="fidelity-agg-value-trigger"
            onMouseEnter={(e) => {
              onValueHoverEnter(rowKey, e.currentTarget.getBoundingClientRect())
            }}
            onMouseLeave={onValueHoverLeave}
          >
            {fmt(r.currentValue)}
          </span>
        </td>
        <td className="val" style={{ textAlign: 'right' }}>
          {r.costBasis != null ? fmt(r.costBasis) : '—'}
        </td>
        {scenarioBundle ? (
          <td className="fidelity-agg-scenario-cell val">
            <button
              type="button"
              className={[
                'fidelity-agg-scenario-trigger',
                showAccent ? scenarioTriggerChoiceClass(common) : '',
              ]
                .filter(Boolean)
                .join(' ')}
              data-fidelity-scenario-trigger
              aria-expanded={rowActive}
              aria-haspopup="dialog"
              onClick={() => onScenarioOpen?.({ symbol: r.symbol, contributingRows: r.contributingRows })}
            >
              <span>{label}</span>
              <span className="fidelity-agg-scenario-plus" aria-hidden>
                <IconCirclePlus size={13} stroke={1.5} />
              </span>
            </button>
          </td>
        ) : null}
      </tr>
      {hasBreakdown && expanded
        ? breakdown.map((line) => (
            <tr key={`${rowKey}-${line.accountKey}`} className="fidelity-agg-breakdown-row">
              <td colSpan={colSpan}>
                <div className="fidelity-agg-breakdown-row__inner">
                  <span className="fidelity-agg-breakdown-row__account">{line.accountLabel}</span>
                  <span className="fidelity-agg-breakdown-row__shares">
                    {formatHoldingShareCount(line.quantity)}
                  </span>
                  <span className="fidelity-agg-breakdown-row__value">{fmt(line.currentValue)}</span>
                </div>
              </td>
            </tr>
          ))
        : null}
      {hasBreakdown && expanded && breakdown.length > 1 ? (
        <tr className="fidelity-agg-breakdown-row fidelity-agg-breakdown-row--total">
          <td colSpan={colSpan}>
            <div className="fidelity-agg-breakdown-row__inner">
              <span className="fidelity-agg-breakdown-row__account">Total</span>
              <span className="fidelity-agg-breakdown-row__shares" aria-hidden />
              <span className="fidelity-agg-breakdown-row__value">{fmt(r.currentValue)}</span>
            </div>
          </td>
        </tr>
      ) : null}
    </tbody>
  )
}

/** Single table: one row per symbol (totals across accounts in the parent tax bucket). */
export function FidelityAggregatedSymbolTable({
  rows,
  combinedLines,
  fidelityAllRows,
  scenarioBundle,
  activeScenarioSymbol,
  onScenarioOpen,
}: Props) {
  if (!rows.length) return null

  const mergedModels = useMemo(() => {
    if (!scenarioBundle) return [] as PositionReturnModel[]
    return computeMergedDashboardPositionModels(
      scenarioBundle.inputs,
      fidelityAllRows,
      scenarioBundle.yearsToRetirement,
      scenarioBundle.retirementCalendarYear,
    )
  }, [scenarioBundle, fidelityAllRows])

  const h = scenarioBundle ? Math.max(1, Math.min(50, Math.round(scenarioBundle.yearsToRetirement))) : 7

  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set())

  const toggleExpanded = useCallback((symbol: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(symbol)) next.delete(symbol)
      else next.add(symbol)
      return next
    })
  }, [])

  const [valueHover, setValueHover] = useState<{
    key: string
    rect: DOMRect
    placement: 'above' | 'below'
  } | null>(null)
  const valueLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const valueHoverLock = useRef(false)

  const clearValueLeaveTimer = () => {
    if (valueLeaveTimer.current) {
      clearTimeout(valueLeaveTimer.current)
      valueLeaveTimer.current = null
    }
  }

  const scheduleValueClose = useCallback(() => {
    clearValueLeaveTimer()
    valueLeaveTimer.current = setTimeout(() => {
      if (!valueHoverLock.current) setValueHover(null)
    }, 140)
  }, [])

  useEffect(() => () => clearValueLeaveTimer(), [])

  const activeValueRow = valueHover ? rows.find((r) => r.symbol === valueHover.key) : null

  const showCombinedNote = combinedLines || rows.some((r) => aggregateRowHasAccountBreakdown(r))

  return (
    <div className="fidelity-acct-positions fidelity-agg-symbol-table">
      {showCombinedNote ? (
        <p className="footnote fidelity-agg-symbol-table__note">
          Same ticker across accounts is merged on one line — expand a row for the account breakdown.
        </p>
      ) : null}
      <table>
        <thead>
          <tr>
            <th>Symbol</th>
            <th className="fidelity-th-upper">Description</th>
            <th style={{ textAlign: 'right' }}>Value</th>
            <th className="fidelity-th-upper" style={{ textAlign: 'right' }}>
              Cost basis
            </th>
            {scenarioBundle ? (
              <th className="fidelity-th-upper fidelity-agg-scenario-th">Scenario</th>
            ) : null}
          </tr>
        </thead>
        {rows.map((r) => (
          <FidelityAggregatedHoldingGroup
            key={r.symbol}
            row={r}
            expanded={expandedKeys.has(r.symbol)}
            onToggleExpand={() => toggleExpanded(r.symbol)}
            scenarioBundle={scenarioBundle}
            mergedModels={mergedModels}
            h={h}
            activeScenarioSymbol={activeScenarioSymbol}
            onScenarioOpen={onScenarioOpen}
            onValueHoverEnter={(key, rect) => {
              clearValueLeaveTimer()
              valueHoverLock.current = false
              setValueHover({ key, rect, placement: placementForHover(rect) })
            }}
            onValueHoverLeave={scheduleValueClose}
          />
        ))}
      </table>
      <FidelityValueHoverPortal
        open={Boolean(valueHover && activeValueRow && valueHover.key === activeValueRow.symbol)}
        rect={valueHover?.rect ?? null}
        placement={valueHover?.placement ?? 'below'}
        source={activeValueRow ?? rows[0]!}
        onMouseEnterPopout={() => {
          valueHoverLock.current = true
          clearValueLeaveTimer()
        }}
        onMouseLeavePopout={() => {
          valueHoverLock.current = false
          scheduleValueClose()
        }}
      />
    </div>
  )
}
